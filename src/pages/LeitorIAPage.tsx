import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentos } from "@/hooks/useDocumentos";
import { formatCurrency } from "@/lib/formatters";
import { buildLancamentos, RecorrenciaTipo } from "@/lib/lancamentoBuilder";
import { Upload, FileText, Check, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DadosExtraidos {
  valor: number;
  data: string;
  fornecedor: string;
  tipo: string;
  descricao: string;
  categoria: string;
}

interface ContaFinanceira {
  id: string;
  nome: string;
  tipo: string;
}

const FORMAS_PAGAMENTO = ["PIX", "Boleto", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Transferência"];
const PERIODICIDADES = ["Mensal", "Semanal", "Quinzenal", "Bimestral", "Trimestral", "Semestral", "Anual"];

export default function LeitorIAPage() {
  const { user } = useAuth();
  const { uploadEProcessar } = useDocumentos();
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<DadosExtraidos | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [contas, setContas] = useState<ContaFinanceira[]>([]);
  const [pagamento, setPagamento] = useState({
    recorrencia_tipo: "Única" as RecorrenciaTipo,
    data_vencimento: "",
    forma_pagamento: "PIX",
    conta_id: "",
    numero_parcelas: "3",
    periodicidade: "Mensal",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("obra_contas_financeiras")
      .select("id, nome, tipo")
      .eq("user_id", user.id)
      .eq("ativa", true)
      .order("nome")
      .then(({ data }) => {
        const lista = data ?? [];
        setContas(lista);
        if (lista.length > 0) {
          setPagamento(p => (p.conta_id ? p : { ...p, conta_id: lista[0].id }));
        }
      });
  }, [user]);

  const hasInput = !!(file || texto.trim());

  const mapAiResponse = (ai: Record<string, unknown>): DadosExtraidos => ({
    fornecedor: (ai.fornecedor_ou_origem as string) ?? "",
    valor: (ai.valor_total as number) ?? 0,
    data: (ai.data_documento as string) ?? "",
    tipo: (ai.tipo_documento as string) ?? "Outro",
    descricao: (ai.descricao as string) ?? "",
    categoria: (ai.categoria_sugerida as string) ?? "Outro",
  });

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const aplicarDadosIniciais = (d: DadosExtraidos) => {
    setDados(d);
    setEditMode(true);
    setPagamento(p => ({
      ...p,
      data_vencimento: d.data || new Date().toISOString().split("T")[0],
    }));
  };

  const processarDocumento = async () => {
    if (!hasInput || !user) return;
    setLoading(true);
    setDados(null);

    try {
      if (file) {
        const isTextFile =
          file.type === "text/plain" ||
          file.type === "text/csv" ||
          file.name.endsWith(".txt") ||
          file.name.endsWith(".csv");

        let textoParaEnviar = texto.trim();
        if (isTextFile && !textoParaEnviar) {
          textoParaEnviar = await file.text();
        }

        const docId = await uploadEProcessar(file);
        if (!docId) {
          setLoading(false);
          return;
        }

        const { data: docData } = await supabase
          .from("obra_documentos_processados")
          .select("payload_normalizado, status_processamento, motivo_revisao")
          .eq("id", docId)
          .single();

        if (isRecord(docData?.payload_normalizado)) {
          aplicarDadosIniciais(mapAiResponse(docData.payload_normalizado));
          if (docData.status_processamento === "revisao") {
            toast.warning(docData.motivo_revisao || "Documento requer revisão");
          }
        } else {
          toast.info("Documento registrado mas sem dados extraídos.");
        }
      } else if (texto.trim()) {
        const { data: aiData, error } = await supabase.functions.invoke("processar-documento-ia", {
          body: {
            texto,
            nome_arquivo: "texto_colado.txt",
            tipo_arquivo: "text/plain",
            persistir: false,
          },
        });

        if (error) throw new Error(error.message || "Erro na comunicação com a IA");
        if (aiData?.error) throw new Error(aiData.error);

        aplicarDadosIniciais(mapAiResponse(aiData));
        toast.success("Documento processado!");
      }
    } catch (err) {
      console.error("LeitorIA processamento error:", err);
      toast.error("Erro ao processar: " + (err instanceof Error ? err.message : "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    if (f.type === "text/plain" || f.type === "text/csv" || f.name.endsWith(".txt") || f.name.endsWith(".csv")) {
      const text = await f.text();
      setTexto(text);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      if (f.type === "text/plain" || f.type === "text/csv") {
        f.text().then(setTexto);
      }
    }
  };

  const salvarTransacao = async () => {
    if (!dados || !user) return;

    if (!pagamento.conta_id) {
      toast.error("Selecione a conta");
      return;
    }
    if (!pagamento.forma_pagamento) {
      toast.error("Selecione a forma de pagamento");
      return;
    }
    if (!pagamento.data_vencimento) {
      toast.error("Informe a data de vencimento");
      return;
    }

    setSaving(true);
    try {
      const rows = buildLancamentos({
        user_id: user.id,
        tipo: "Saída",
        valor: Number(dados.valor) || 0,
        data: dados.data || new Date().toISOString().split("T")[0],
        data_vencimento: pagamento.data_vencimento,
        categoria: dados.categoria || "Material",
        descricao: dados.descricao || `${dados.tipo}: ${dados.fornecedor}`,
        forma_pagamento: pagamento.forma_pagamento,
        observacoes: `Origem: IA | Fornecedor: ${dados.fornecedor}`,
        conta_id: pagamento.conta_id,
        recorrencia_tipo: pagamento.recorrencia_tipo,
        numero_parcelas: parseInt(pagamento.numero_parcelas) || 1,
        periodicidade: pagamento.periodicidade,
        origem_tipo: "ia",
      });

      const { error } = await supabase.from("obra_transacoes_fluxo").insert(rows as any);
      if (error) throw error;

      const msg =
        pagamento.recorrencia_tipo === "Parcelada"
          ? `${rows.length} parcelas criadas!`
          : pagamento.recorrencia_tipo === "Recorrente"
          ? "Lançamento recorrente criado!"
          : "Transação salva! Confirme o pagamento em Contas a Pagar.";
      toast.success(msg);

      setDados(null);
      setTexto("");
      setFile(null);
    } catch (err) {
      toast.error("Erro ao salvar: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold">Leitor IA</h1>
        <p className="text-sm text-muted-foreground">Extraia dados de notas fiscais, recibos e extratos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input area */}
        <div className="space-y-4">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className="glass-card-interactive p-8 text-center border-2 border-dashed border-border/50 hover:border-primary/30"
          >
            <input type="file" id="file-upload" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv" onChange={handleFileUpload} />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Arraste um arquivo ou clique para enviar</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, imagem, CSV ou texto</p>
            </label>
            {file && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-primary">
                <FileText className="w-4 h-4" />
                {file.name}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Ou cole o texto do documento</Label>
            <Textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={8}
              placeholder="Cole aqui o conteúdo da nota fiscal, recibo ou extrato..."
              className="mt-1 font-mono"
            />
          </div>

          <Button
            onClick={processarDocumento}
            disabled={loading || !hasInput}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><FileText className="w-4 h-4" /> Processar com IA</>}
          </Button>
        </div>

        {/* Output area */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Dados Extraídos
          </h2>

          {!dados ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Envie ou cole um documento para começar</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in-up">
              {[
                { label: "Fornecedor", key: "fornecedor" as const },
                { label: "Valor", key: "valor" as const },
                { label: "Data", key: "data" as const },
                { label: "Tipo", key: "tipo" as const },
                { label: "Categoria", key: "categoria" as const },
                { label: "Descrição", key: "descricao" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  {editMode ? (
                    <Input
                      type={key === "valor" ? "number" : "text"}
                      value={String(dados[key] ?? "")}
                      onChange={e => setDados(d => d ? { ...d, [key]: key === "valor" ? Number(e.target.value) : e.target.value } : d)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium px-3 py-2">
                      {key === "valor" ? formatCurrency(dados.valor) : String(dados[key] || "-")}
                    </p>
                  )}
                </div>
              ))}

              {/* Bloco: Forma de Pagamento */}
              <div className="pt-4 border-t border-border/40 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Forma de Pagamento</h3>

                {/* Tipo de Lançamento */}
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de Lançamento</Label>
                  <div className="flex gap-2 mt-1">
                    {(["Única", "Parcelada", "Recorrente"] as RecorrenciaTipo[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPagamento(p => ({ ...p, recorrencia_tipo: t }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                          pagamento.recorrencia_tipo === t
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent/50 text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parcelas */}
                {pagamento.recorrencia_tipo === "Parcelada" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Número de parcelas</Label>
                    <Input
                      type="number"
                      min={2}
                      value={pagamento.numero_parcelas}
                      onChange={e => setPagamento(p => ({ ...p, numero_parcelas: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Periodicidade */}
                {pagamento.recorrencia_tipo === "Recorrente" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Periodicidade</Label>
                    <Select
                      value={pagamento.periodicidade}
                      onValueChange={v => setPagamento(p => ({ ...p, periodicidade: v }))}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERIODICIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Data de Vencimento */}
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {pagamento.recorrencia_tipo === "Parcelada" ? "Vencimento da 1ª parcela" : "Data de Vencimento"}
                  </Label>
                  <Input
                    type="date"
                    value={pagamento.data_vencimento}
                    onChange={e => setPagamento(p => ({ ...p, data_vencimento: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                {/* Forma de pagamento */}
                <div>
                  <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                  <Select
                    value={pagamento.forma_pagamento}
                    onValueChange={v => setPagamento(p => ({ ...p, forma_pagamento: v }))}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conta */}
                <div>
                  <Label className="text-xs text-muted-foreground">Conta <span className="text-destructive">*</span></Label>
                  <Select
                    value={pagamento.conta_id}
                    onValueChange={v => setPagamento(p => ({ ...p, conta_id: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={contas.length ? "Selecione a conta" : "Nenhuma conta cadastrada"} />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome} {c.tipo ? `· ${c.tipo}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditMode(!editMode)}
                  className="flex-1 gap-2"
                >
                  <Edit className="w-4 h-4" /> {editMode ? "Visualizar" : "Editar"}
                </Button>
                <Button
                  onClick={salvarTransacao}
                  disabled={saving}
                  className="flex-1 gap-2 bg-success text-success-foreground hover:bg-success/90"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
