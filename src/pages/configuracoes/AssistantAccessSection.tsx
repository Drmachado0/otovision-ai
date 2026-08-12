import { useEffect, useState } from "react";
import { Bot, Copy, KeyRound, Loader2, ShieldCheck, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface FinancialAccount {
  id: string;
  nome: string;
  tipo: string;
}

interface AssistantDelegation {
  id: string;
  label: string;
  token_prefix: string;
  scopes: string[];
  default_account_id: string;
  enabled: boolean;
  expires_at: string | null;
  last_used_at: string | null;
}

export function AssistantAccessSection() {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [delegation, setDelegation] = useState<AssistantDelegation | null>(null);
  const [accountId, setAccountId] = useState("");
  const [oneTimeToken, setOneTimeToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: accountRows, error: accountError }, statusResponse] = await Promise.all([
      supabase.from("obra_contas_financeiras").select("id,nome,tipo").eq("ativa", true).order("nome"),
      supabase.functions.invoke("assistente-lancamentos", {
        body: {},
        headers: { "x-assistant-action": "status" },
      }),
    ]);
    if (accountError || statusResponse.error || statusResponse.data?.error) {
      toast.error("Não foi possível carregar a configuração do assistente");
    }
    const nextAccounts = (accountRows ?? []) as FinancialAccount[];
    const nextDelegation = (statusResponse.data?.delegation ?? null) as AssistantDelegation | null;
    setAccounts(nextAccounts);
    setDelegation(nextDelegation);
    setAccountId(nextDelegation?.default_account_id || nextAccounts[0]?.id || "");
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const activate = async () => {
    if (!accountId) {
      toast.error("Cadastre ou escolha uma conta financeira ativa");
      return;
    }
    setSaving(true);
    setOneTimeToken("");
    const { data, error } = await supabase.functions.invoke("assistente-lancamentos", {
      body: { default_account_id: accountId, label: "Hermes Telegram" },
      headers: { "x-assistant-action": "activate" },
    });
    setSaving(false);
    if (error || data?.error || !data?.token) {
      toast.error(data?.error || error?.message || "Falha ao ativar o assistente");
      return;
    }
    setOneTimeToken(data.token);
    toast.success("Acesso criado. Copie o token agora: ele só será exibido uma vez.");
    await load();
  };

  const revoke = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("assistente-lancamentos", {
      body: {},
      headers: { "x-assistant-action": "revoke" },
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Falha ao revogar o acesso");
      return;
    }
    setDelegation(null);
    setOneTimeToken("");
    toast.success("Acesso do assistente revogado imediatamente");
  };

  const copyToken = async () => {
    await navigator.clipboard.writeText(oneTimeToken);
    toast.success("Token copiado. Não envie pelo chat nem salve em documentos.");
  };

  return (
    <section className="glass-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" /> Assistente de lançamentos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conceda acesso revogável para leitura e criação de lançamentos, sem compartilhar sua senha.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</p>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="assistant-default-account">Conta financeira padrão</Label>
            <select
              id="assistant-default-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
              disabled={saving}
            >
              <option value="">Selecione uma conta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.nome} — {account.tipo}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Usada quando o documento não identificar a conta. O assistente não pode excluir, editar ou executar pagamentos.
            </p>
          </div>

          {delegation && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm space-y-1">
              <p className="font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Acesso ativo</p>
              <p className="text-muted-foreground">Token: {delegation.token_prefix}•••• · escopos: leitura e lançamentos</p>
              <p className="text-muted-foreground">
                Expira: {delegation.expires_at ? new Date(delegation.expires_at).toLocaleDateString("pt-BR") : "sem expiração"}
                {delegation.last_used_at ? ` · último uso: ${new Date(delegation.last_used_at).toLocaleString("pt-BR")}` : " · ainda não utilizado"}
              </p>
            </div>
          )}

          {oneTimeToken && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
              <p className="font-medium flex items-center gap-2"><KeyRound className="w-4 h-4" /> Token exibido uma única vez</p>
              <code className="block break-all rounded bg-background p-2 text-xs select-all">{oneTimeToken}</code>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyToken}>
                <Copy className="w-4 h-4" /> Copiar token
              </Button>
              <p className="text-xs text-muted-foreground">Guarde-o somente no cofre de segredos do Hermes. Atualizar a página removerá esta exibição.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={activate} disabled={saving || !accountId} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {delegation ? "Gerar novo acesso" : "Ativar acesso"}
            </Button>
            {delegation && (
              <Button onClick={revoke} disabled={saving} variant="destructive" className="gap-2">
                <Unplug className="w-4 h-4" /> Revogar acesso
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
