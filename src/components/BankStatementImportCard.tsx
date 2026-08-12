import { useMemo, useState } from "react";
import { FileUp, Loader2, Landmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseStatement, type ExtractedTransaction } from "@/lib/ofxParser";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AccountOption {
  id: string;
  nome: string;
}

interface Props {
  contas: AccountOption[];
  onImported?: () => void;
}

interface ImportResult {
  imported_count?: number;
  duplicate_count?: number;
  invalid_count?: number;
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function validOfxTransactions(rows: ExtractedTransaction[]) {
  return rows.filter(row => row.fitId?.trim());
}

export default function BankStatementImportCard({ contas, onImported }: Props) {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ExtractedTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const missingFitId = useMemo(() => rows.filter(row => !row.fitId?.trim()).length, [rows]);

  const chooseFile = async (selected: File | null) => {
    setFile(selected);
    setRows([]);
    if (!selected) return;
    if (!/\.(ofx|ofc)$/i.test(selected.name)) {
      toast.error("Selecione um arquivo OFX ou OFC");
      setFile(null);
      return;
    }
    const parsed = parseStatement(await selected.text(), selected.name);
    setRows(parsed);
    if (parsed.length === 0) toast.error("Nenhuma movimentação válida encontrada no extrato");
  };

  const importStatement = async () => {
    if (!user || !file) return;
    if (!accountId) {
      toast.error("Selecione uma conta");
      return;
    }
    const transactions = validOfxTransactions(rows);
    if (transactions.length === 0) {
      toast.error("O extrato não possui movimentações com FITID");
      return;
    }
    if (missingFitId > 0) {
      toast.error(`${missingFitId} movimentação(ões) sem FITID. Corrija o arquivo antes de importar.`);
      return;
    }

    setLoading(true);
    let documentId: string | null = null;
    let storagePath: string | null = null;
    try {
      const hash = await sha256(file);
      const { data: existing, error: existingError } = await supabase
        .from("obra_documentos_processados")
        .select("id, storage_path")
        .eq("user_id", user.id)
        .eq("hash_arquivo", hash)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        documentId = existing.id;
        storagePath = existing.storage_path || null;
      } else {
        const { data: document, error: documentError } = await supabase
          .from("obra_documentos_processados")
          .insert({
            user_id: user.id,
            nome_arquivo: file.name,
            tipo_arquivo: file.type || "application/x-ofx",
            origem_arquivo: "extrato_bancario",
            hash_arquivo: hash,
            status_processamento: "processando",
            tipo_documento: "extrato_bancario",
          } as never)
          .select("id")
          .single();
        if (documentError || !document) throw documentError || new Error("Documento não registrado");
        documentId = document.id;
        storagePath = `${user.id}/${documentId}/${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("documentos")
          .upload(storagePath, file, { upsert: false, contentType: file.type || "application/x-ofx" });
        if (uploadError) throw uploadError;

        const { error: documentUpdateError } = await supabase
          .from("obra_documentos_processados")
          .update({ storage_path: storagePath } as never)
          .eq("id", documentId);
        if (documentUpdateError) throw documentUpdateError;
      }

      const rpc = supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: ImportResult | null; error: { message?: string } | null }>;
      const { data, error } = await rpc("import_bank_statement", {
        p_account_id: accountId,
        p_document_id: documentId,
        p_source_file: storagePath || file.name,
        p_transactions: transactions,
      });
      if (error) throw error;

      await supabase
        .from("obra_documentos_processados")
        .update({ status_processamento: "revisao", motivo_revisao: "Movimentações bancárias pendentes de revisão" } as never)
        .eq("id", documentId);

      toast.success(
        `${data?.imported_count ?? 0} movimentação(ões) importada(s), ` +
        `${data?.duplicate_count ?? 0} duplicada(s) e ${data?.invalid_count ?? 0} inválida(s). Todas pendentes de revisão.`,
      );
      setFile(null);
      setRows([]);
      onImported?.();
    } catch (error) {
      if (documentId) {
        await supabase
          .from("obra_documentos_processados")
          .update({ status_processamento: "erro", motivo_erro: error instanceof Error ? error.message : "Falha na importação OFX" } as never)
          .eq("id", documentId);
      }
      toast.error("Não foi possível importar o extrato: " + (error instanceof Error ? error.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-card p-4 space-y-4" aria-label="Importar extrato bancário OFX">
      <div className="flex items-start gap-3">
        <Landmark className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="font-semibold">Importar extrato OFX</h2>
          <p className="text-xs text-muted-foreground">
            O extrato cria movimentações pendentes de revisão. Nenhum lançamento será criado ou baixado automaticamente.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label>Conta bancária</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
            <SelectContent>
              {contas.map(conta => <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bank-statement-file">Arquivo OFX</Label>
          <input
            id="bank-statement-file"
            type="file"
            accept=".ofx,.ofc,application/x-ofx"
            onChange={event => void chooseFile(event.target.files?.[0] || null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm"
          />
        </div>
        <Button onClick={() => void importStatement()} disabled={loading || !file || rows.length === 0} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
          Importar para revisão
        </Button>
      </div>
      {file && (
        <p className="text-xs text-muted-foreground">
          {file.name}: {rows.length} movimentação(ões); {missingFitId} sem FITID.
        </p>
      )}
    </section>
  );
}
