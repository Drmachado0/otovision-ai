import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import { Upload, Loader2, CreditCard, Wallet, Receipt, Calendar, Tag } from "lucide-react";
import { PERCENTUAL_COMISSAO_CONSTRUTOR } from "@/lib/comissao";
import { buildPaymentIdempotencyKey, payFinancialObligation } from "@/lib/financialPayments";
import { useUserRole } from "@/hooks/useUserRole";

interface ContaFinanceira {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
}

interface ConfirmarPagamentoDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transacao: {
    id: string;
    descricao: string;
    valor: number;
    categoria: string;
    data_vencimento?: string;
    conta_id?: string;
    forma_pagamento?: string;
    parcela_numero?: number;
    parcela_total?: number;
  } | null;
  /** Quando presente, paga uma parcela de obra_compras via RPC pagar_parcela_atomica em vez de atualizar obra_transacoes_fluxo. */
  parcelaCompra?: {
    compra_id: string;
    numero_parcela: number;
  };
  userId: string;
}

export default function ConfirmarPagamentoDialog({
  open, onClose, onSuccess, transacao, parcelaCompra, userId,
}: ConfirmarPagamentoDialogProps) {
  const { permissions } = useUserRole();
  const [contas, setContas] = useState<ContaFinanceira[]>([]);
  const [contaId, setContaId] = useState("");
  const [metodo, setMetodo] = useState("PIX");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [gerarComissao, setGerarComissao] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGerarComissao(permissions.canEditComissao);
    supabase
      .from("obra_contas_financeiras")
      .select("id, nome, tipo, cor")
      .eq("ativa", true)
      .then(({ data }) => {
        if (data) {
          setContas(data);
          if (data.length === 1) setContaId(data[0].id);
        }
      });
    // Pre-fill from transacao
    if (transacao?.conta_id) setContaId(transacao.conta_id);
    if (transacao?.forma_pagamento) setMetodo(transacao.forma_pagamento);
  }, [open, transacao, permissions.canEditComissao]);

  const comissaoValor = transacao ? Number(transacao.valor) * (PERCENTUAL_COMISSAO_CONSTRUTOR / 100) : 0;
  const isCompra = !!parcelaCompra;

  const handleConfirmar = async () => {
    if (!transacao) return;
    if (!contaId) {
      toast.error("Selecione uma conta");
      return;
    }
    setLoading(true);
    try {
      let storagePath = "";
      const obligationType = parcelaCompra ? "purchase_installment" : "transaction";
      const obligationId = parcelaCompra?.compra_id || transacao.id;
      const operationKey = buildPaymentIdempotencyKey(
        obligationType,
        obligationId,
        parcelaCompra?.numero_parcela,
      );

      if (arquivo) {
        const ext = arquivo.name.split(".").pop() || "bin";
        const path = `${userId}/comprovantes/${obligationId}/${operationKey.replace(/:/g, "-")}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("documentos")
          .upload(path, arquivo, { upsert: true });
        if (uploadErr) throw new Error("Erro ao enviar comprovante: " + uploadErr.message);
        storagePath = path;
      }

      await payFinancialObligation(supabase, {
        obligationType,
        obligationId,
        installmentNumber: parcelaCompra?.numero_parcela,
        accountId: contaId,
        method: metodo,
        paidAt: new Date().toISOString(),
        generateCommission: gerarComissao,
        receiptPath: storagePath || undefined,
        idempotencyKey: operationKey,
      });

      // Register comprovante as document
      if (storagePath && arquivo) {
        const { error: documentError } = await supabase.from("obra_documentos_processados").insert({
          user_id: userId,
          nome_arquivo: arquivo.name,
          tipo_arquivo: arquivo.type || "application/pdf",
          storage_path: storagePath,
          caminho_origem: storagePath,
          hash_arquivo: operationKey,
          status_processamento: "processado",
          tipo_documento: "comprovante",
          confianca_extracao: 100,
          origem_arquivo: "pagamento",
          payload_normalizado: {
            tipo_documento: "comprovante",
            valor_total: transacao.valor,
            descricao: `Comprovante - ${transacao.descricao}`,
            data_documento: new Date().toISOString().slice(0, 10),
            categoria: transacao.categoria,
            metodo_pagamento: metodo,
          },
        } as any);
        if (documentError) {
          toast.warning("Pagamento confirmado, mas o comprovante não foi indexado na Pasta Sync.");
        }
      }

      toast.success("Pagamento confirmado!");
      setArquivo(null);
      setContaId("");
      setMetodo("PIX");
      setGerarComissao(false);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar pagamento");
    } finally {
      setLoading(false);
    }
  };

  if (!transacao) return null;

  const isVencida = transacao.data_vencimento && new Date(transacao.data_vencimento) < new Date();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Confirmar Pagamento
          </DialogTitle>
          <DialogDescription>
            Confirme os dados e registre o pagamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Descrição</span>
              <span className="font-medium truncate max-w-[200px]">{transacao.descricao || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-bold text-lg">{formatCurrency(Number(transacao.valor))}</span>
            </div>
            {transacao.data_vencimento && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Vencimento</span>
                <span className={isVencida ? "text-destructive font-medium" : ""}>
                  {formatDate(transacao.data_vencimento)}
                  {isVencida && <Badge variant="destructive" className="ml-1 text-[9px]">Vencida</Badge>}
                </span>
              </div>
            )}
            {transacao.categoria && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" />Categoria</span>
                <span>{transacao.categoria}</span>
              </div>
            )}
            {transacao.parcela_numero && transacao.parcela_total && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parcela</span>
                <Badge variant="outline" className="text-xs">{transacao.parcela_numero} de {transacao.parcela_total}</Badge>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Comissão ({PERCENTUAL_COMISSAO_CONSTRUTOR}% {isCompra ? "Total" : ""})</span>
              <Badge variant="outline" className="text-xs">
                {isCompra ? "Calculada sobre Total" : formatCurrency(comissaoValor)}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <label className="flex items-start gap-3 text-sm leading-tight">
              <Checkbox
                checked={gerarComissao}
                onCheckedChange={(checked) => setGerarComissao(checked === true)}
                disabled={!permissions.canEditComissao}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Gerar comissão automática de {PERCENTUAL_COMISSAO_CONSTRUTOR}%</span>
                <span className="block text-xs text-muted-foreground mt-1">
                  Desmarque apenas quando esta despesa não deve entrar na comissão do construtor.
                </span>
              </span>
            </label>
          </div>

          {/* Conta */}
          <div className="space-y-1.5">
            <Label className="text-xs">Conta de debito <span className="text-destructive">*</span></Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: c.cor || "#3B82F6" }} />
                      {c.nome} ({c.tipo})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metodo */}
          <div className="space-y-1.5">
            <Label className="text-xs">Forma de pagamento</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX"><div className="flex items-center gap-2"><Wallet className="w-3 h-3" />PIX</div></SelectItem>
                <SelectItem value="Cartao"><div className="flex items-center gap-2"><CreditCard className="w-3 h-3" />Cartao</div></SelectItem>
                <SelectItem value="Boleto"><div className="flex items-center gap-2"><Receipt className="w-3 h-3" />Boleto</div></SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comprovante upload */}
          <div className="space-y-1.5">
            <Label className="text-xs">Comprovante (opcional)</Label>
            <div className="relative">
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                className="text-xs"
              />
              {arquivo && (
                <p className="text-xs text-muted-foreground mt-1">
                  <Upload className="w-3 h-3 inline mr-1" />
                  {arquivo.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CreditCard className="w-4 h-4 mr-1" />}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
