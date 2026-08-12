import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Check, RefreshCw, CreditCard, AlertCircle, DollarSign } from "lucide-react";
import PagamentoDialog from "@/components/PagamentoDialog";
import ConfirmarPagamentoDialog from "@/components/ConfirmarPagamentoDialog";

interface Parcela {
  numero: number;
  valor: number;
  data_vencimento: string;
  status: string;
  transacao_id?: string;
}

export interface CompraFull {
  id: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  data: string;
  status_entrega: string;
  forma_pagamento: string;
  numero_parcelas: number;
  parcelas: Parcela[];
  observacoes: string;
  nf_vinculada: string;
  tipo_compra: string; // computed: "Única" | "Parcelada" | "Recorrente"
}

interface Props {
  compra: CompraFull | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  userId: string;
}

export function getCompraType(c: { numero_parcelas: number; observacoes: string; forma_pagamento: string }): string {
  if (c.observacoes?.startsWith("[RECORRENTE]")) return "Recorrente";
  if (c.numero_parcelas > 1) return "Parcelada";
  return "Única";
}

export function parseParcelas(raw: unknown): Parcela[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is Parcela => {
    if (!item || typeof item !== "object") return false;
    const parcela = item as Record<string, unknown>;
    return Number.isInteger(parcela.numero)
      && Number(parcela.numero) > 0
      && typeof parcela.valor === "number"
      && Number.isFinite(parcela.valor)
      && parcela.valor > 0
      && typeof parcela.data_vencimento === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(parcela.data_vencimento)
      && typeof parcela.status === "string"
      && parcela.status.trim().length > 0;
  });
}

export default function CompraDetailDrawer({ compra, open, onClose, onRefresh, userId }: Props) {
  const [showPagamento, setShowPagamento] = useState(false);
  const [parcelaPagamento, setParcelaPagamento] = useState<Parcela | null>(null);
  if (!compra) return null;

  const parcelas = parseParcelas(compra.parcelas);
  const tipo = compra.tipo_compra;
  const pagas = parcelas.filter(p => p.status === "Paga").length;

  const recorrenteInfo = tipo === "Recorrente"
    ? compra.observacoes.replace("[RECORRENTE] ", "")
    : null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {compra.fornecedor || "Compra"}
            <Badge variant={tipo === "Recorrente" ? "secondary" : tipo === "Parcelada" ? "outline" : "default"} className="text-xs">
              {tipo === "Recorrente" && <RefreshCw className="w-3 h-3 mr-1" />}
              {tipo === "Parcelada" ? `${compra.numero_parcelas}x` : tipo}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* General info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs block">Valor Total</span><span className="font-bold text-lg">{formatCurrency(compra.valor_total)}</span></div>
            <div><span className="text-muted-foreground text-xs block">Data</span><span>{formatDate(compra.data)}</span></div>
            <div><span className="text-muted-foreground text-xs block">Categoria</span><span className="badge-muted px-2 py-0.5 rounded text-xs">{compra.categoria}</span></div>
            <div><span className="text-muted-foreground text-xs block">Pagamento</span><span>{compra.forma_pagamento}</span></div>
            {compra.descricao && <div className="col-span-2"><span className="text-muted-foreground text-xs block">Descrição</span><span>{compra.descricao}</span></div>}
            {compra.nf_vinculada && <div className="col-span-2"><span className="text-muted-foreground text-xs block">NF Vinculada</span><span>{compra.nf_vinculada}</span></div>}
          </div>

          {/* Recorrente info */}
          {tipo === "Recorrente" && recorrenteInfo && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4 text-info" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Assinatura Recorrente</span>
              </div>
              <p className="text-sm">{recorrenteInfo}</p>
            </div>
          )}

          {/* Parcelas table */}
          {tipo === "Parcelada" && parcelas.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Parcelas</span>
                <span className="text-xs text-muted-foreground">{pagas}/{parcelas.length} pagas</span>
              </div>
              {/* progress bar */}
              <div className="w-full h-2 bg-secondary rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-success rounded-full transition-all" style={{ width: `${(pagas / parcelas.length) * 100}%` }} />
              </div>
              <div className="space-y-2">
                {parcelas.map(p => {
                  const isPaga = p.status === "Paga";
                  const isVencida = !isPaga && new Date(p.data_vencimento) < new Date();
                  return (
                    <div key={p.numero} className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border ${isPaga ? "border-success/30 bg-success/5" : isVencida ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/30"}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium w-6 text-center text-muted-foreground">{p.numero}</span>
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(p.valor)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.data_vencimento)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        {isPaga ? (
                          <Badge className="bg-success/20 text-success border-0 text-xs"><Check className="w-3 h-3 mr-1" />Paga</Badge>
                        ) : isVencida ? (
                          <>
                            <Badge variant="destructive" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />Vencida</Badge>
                            <Button size="sm" variant="outline" className="h-10 text-xs flex-1 sm:flex-none" onClick={() => setParcelaPagamento(p)}>
                              <CreditCard className="w-3 h-3 mr-1" />Pagar
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" className="h-10 text-xs flex-1 sm:flex-none" onClick={() => setParcelaPagamento(p)}>
                            <CreditCard className="w-3 h-3 mr-1" />Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observações */}
          {compra.observacoes && tipo !== "Recorrente" && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">Observações</span>
              <p className="text-sm text-muted-foreground">{compra.observacoes}</p>
            </div>
          )}

          {/* Payment button for single purchases */}
          {tipo === "Única" && (
            <Button className="w-full" onClick={() => setShowPagamento(true)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Registrar Pagamento
            </Button>
          )}
        </div>

        {/* Payment dialog */}
        <ConfirmarPagamentoDialog
          open={!!parcelaPagamento}
          onClose={() => setParcelaPagamento(null)}
          onSuccess={() => { setParcelaPagamento(null); onRefresh(); }}
          transacao={parcelaPagamento ? {
            id: `${compra.id}:${parcelaPagamento.numero}`,
            descricao: `Parcela ${parcelaPagamento.numero}/${compra.numero_parcelas} - ${compra.descricao || compra.fornecedor}`,
            valor: parcelaPagamento.valor,
            categoria: compra.categoria,
            data_vencimento: parcelaPagamento.data_vencimento,
            forma_pagamento: compra.forma_pagamento,
            parcela_numero: parcelaPagamento.numero,
            parcela_total: compra.numero_parcelas,
          } : null}
          parcelaCompra={parcelaPagamento ? {
            compra_id: compra.id,
            numero_parcela: parcelaPagamento.numero,
          } : undefined}
          userId={userId}
        />

        <PagamentoDialog
          open={showPagamento}
          onClose={() => setShowPagamento(false)}
          onSuccess={() => { setShowPagamento(false); onRefresh(); }}
          tipo="compra"
          id={compra.id}
          fornecedor={compra.fornecedor}
          valor={compra.valor_total}
          categoria={compra.categoria}
          descricao={compra.descricao}
          userId={userId}
        />
      </SheetContent>
    </Sheet>
  );
}
