import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { SistemaInfoSection } from "./configuracoes/SistemaInfoSection";
import { ObraConfigSection } from "./configuracoes/ObraConfigSection";
import { PreferenciasSection } from "./configuracoes/PreferenciasSection";
import { UsuariosSection } from "./configuracoes/UsuariosSection";
import { BackupSection } from "./configuracoes/BackupSection";
import { DangerZoneSection } from "./configuracoes/DangerZoneSection";
import { AssistantAccessSection } from "./configuracoes/AssistantAccessSection";
import {
  DEFAULT_PREFS,
  defaultObraConfig,
  type BackupPrefs,
  type UserWithRole,
  type ObraConfig,
} from "./configuracoes/types";

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [showDangerDialog, setShowDangerDialog] = useState(false);
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [comissaoRate, setComissaoRate] = useState("8");
  const [backupPrefs, setBackupPrefs] = useState<BackupPrefs>(DEFAULT_PREFS);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Obra config state
  const [obraConfig, setObraConfig] = useState<ObraConfig>(defaultObraConfig);
  const [obraConfigId, setObraConfigId] = useState<string | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);
  const [savingObra, setSavingObra] = useState(false);

  useEffect(() => {
    fetchObraConfig();
  }, [role]);

  const fetchObraConfig = async () => {
    setLoadingObra(true);
    const { data, error } = await supabase
      .from("obra_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      const d = data as any;
      setObraConfigId(data.id);
      setObraConfig({
        id: data.id,
        nome_obra: data.nome_obra || "",
        endereco: d.endereco || "",
        responsavel: data.responsavel || "",
        contato_responsavel: d.contato_responsavel || "",
        area_construida: Number(data.area_construida) || 0,
        orcamento_total: Number(data.orcamento_total) || 0,
        data_inicio: data.data_inicio || "",
        data_termino: data.data_termino || "",
      });
    }
    setLoadingObra(false);
  };

  const handleSaveObra = async () => {
    if (!user) return;
    setSavingObra(true);
    try {
      const payload = {
        nome_obra: obraConfig.nome_obra,
        endereco: obraConfig.endereco,
        responsavel: obraConfig.responsavel,
        contato_responsavel: obraConfig.contato_responsavel,
        area_construida: obraConfig.area_construida,
        orcamento_total: obraConfig.orcamento_total,
        data_inicio: obraConfig.data_inicio,
        data_termino: obraConfig.data_termino,
        user_id: user.id,
      };

      let error;
      if (obraConfigId) {
        ({ error } = await supabase
          .from("obra_config")
          .update(payload as any)
          .eq("id", obraConfigId));
      } else {
        ({ error } = await supabase
          .from("obra_config")
          .insert(payload as any));
      }

      if (error) throw error;
      toast.success("Dados da obra salvos com sucesso!");
      fetchObraConfig();
    } catch (err) {
      toast.error("Erro ao salvar: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    }
    setSavingObra(false);
  };

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["config-users", user?.id],
    enabled: !!user && role === "admin",
    queryFn: async () => {
      const res = await (supabase as any)
        .from("user_roles")
        .select("user_id, role");
      if (res.error) throw res.error;
      const roles = res.data;
      const userList: UserWithRole[] = ((roles as any[]) ?? []).map((r: { user_id: string; role: string }) => ({
        id: r.user_id,
        email: r.user_id === user?.id ? (user?.email || r.user_id) : r.user_id,
        role: r.role,
      }));
      return { users: userList };
    },
  });

  const users = usersData?.users ?? [];

  const fetchUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["config-users", user?.id] });
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await (supabase as any)
      .from("user_roles")
      .update({ role: newRole } as any)
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao atualizar role: " + error.message);
    } else {
      toast.success("Role atualizada!");
      fetchUsers();
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("exportar-backup", {
        method: "POST",
      });

      if (error) throw new Error(error.message || "Erro na exportação");

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-otovision-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    }
    setExporting(false);
  };

  const { data: backupsData, isLoading: loadingBackups } = useQuery({
    queryKey: ["config-auto-backups", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await supabase.storage
        .from("backups-automaticos")
        .list(user!.id, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (res.error) throw res.error;
      return { autoBackups: (res.data ?? []).filter((f) => f.name.endsWith(".json")) };
    },
  });

  const autoBackups = backupsData?.autoBackups ?? [];

  const handleDownloadAutoBackup = async (name: string) => {
    if (!user) return;
    const { data, error } = await supabase.storage
      .from("backups-automaticos")
      .download(`${user.id}/${name}`);
    if (error || !data) {
      toast.error("Erro ao baixar backup: " + (error?.message ?? "desconhecido"));
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-auto-${name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchBackupPrefs = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("obra_backup_preferencias")
      .select("hora_utc, retencao_dias, enviar_google_drive, ativo")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setBackupPrefs(data as BackupPrefs);
  };

  useEffect(() => { fetchBackupPrefs(); }, [user]);

  const handleSavePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    const { error } = await (supabase as any)
      .from("obra_backup_preferencias")
      .upsert({ user_id: user.id, ...backupPrefs }, { onConflict: "user_id" });
    if (error) toast.error("Erro ao salvar preferências: " + error.message);
    else toast.success("Preferências salvas!");
    setSavingPrefs(false);
  };

  const handleDeleteAll = async () => {
    if (dangerConfirm !== "APAGAR TUDO") return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("limpar-dados-obra", {
        method: "POST",
      });

      if (error) throw new Error(error.message || "Erro ao apagar dados");
      if (data?.error) throw new Error(data.error);

      toast.success("Todos os dados foram apagados!");
      setShowDangerDialog(false);
      setDangerConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    }
    setDeleting(false);
  };

  const updateObraField = (field: keyof ObraConfig, value: string | number) => {
    setObraConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8 animate-slide-in max-w-3xl">
      <div className="page-header">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie o sistema, usuários e dados</p>
      </div>

      {/* Info do Sistema */}
      <SistemaInfoSection role={role} email={user?.email} />

      {/* Dados da Obra */}
      <ObraConfigSection
        obraConfig={obraConfig}
        updateObraField={updateObraField}
        handleSaveObra={handleSaveObra}
        savingObra={savingObra}
        loadingObra={loadingObra}
      />

      {/* Preferências */}
      <PreferenciasSection comissaoRate={comissaoRate} setComissaoRate={setComissaoRate} />

      {/* Gerenciamento de Usuários */}
      {role === "admin" && (
        <UsuariosSection
          users={users}
          loadingUsers={loadingUsers}
          currentUserId={user?.id}
          updateRole={updateRole}
        />
      )}

      {/* Acesso delegado do assistente */}
      {role === "admin" && <AssistantAccessSection />}

      {/* Backup */}
      <BackupSection
        exporting={exporting}
        handleExportBackup={handleExportBackup}
        backupPrefs={backupPrefs}
        setBackupPrefs={setBackupPrefs}
        savingPrefs={savingPrefs}
        handleSavePrefs={handleSavePrefs}
        loadingBackups={loadingBackups}
        autoBackups={autoBackups}
        handleDownloadAutoBackup={handleDownloadAutoBackup}
      />

      {/* Danger Zone */}
      {role === "admin" && (
        <DangerZoneSection
          showDangerDialog={showDangerDialog}
          setShowDangerDialog={setShowDangerDialog}
          dangerConfirm={dangerConfirm}
          setDangerConfirm={setDangerConfirm}
          deleting={deleting}
          handleDeleteAll={handleDeleteAll}
        />
      )}
    </div>
  );
}
