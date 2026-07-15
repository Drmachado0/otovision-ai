import { Download, Loader2, Settings, Save, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { BackupPrefs } from "./types";

interface AutoBackup {
  name: string;
}

interface BackupSectionProps {
  exporting: boolean;
  handleExportBackup: () => void;
  backupPrefs: BackupPrefs;
  setBackupPrefs: (prefs: BackupPrefs) => void;
  savingPrefs: boolean;
  handleSavePrefs: () => void;
  loadingBackups: boolean;
  autoBackups: AutoBackup[];
  handleDownloadAutoBackup: (name: string) => void;
}

export function BackupSection({
  exporting,
  handleExportBackup,
  backupPrefs,
  setBackupPrefs,
  savingPrefs,
  handleSavePrefs,
  loadingBackups,
  autoBackups,
  handleDownloadAutoBackup,
}: BackupSectionProps) {
  return (
    <section className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Download className="w-5 h-5 text-primary" /> Backup de Dados
      </h2>
      <p className="text-sm text-muted-foreground">
        Exporte todos os seus dados em formato JSON.
      </p>
      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleExportBackup} disabled={exporting} className="gap-2">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? "Exportando..." : "Exportar Backup (JSON)"}
        </Button>
        <div>
          <Input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 10 * 1024 * 1024) {
                  throw new Error("Arquivo muito grande (máx 10MB)");
                }
                const text = await file.text();
                const data = JSON.parse(text);
                if (!data || typeof data !== "object") throw new Error("Formato inválido");
                // Route through edge function (server-side whitelist + user_id enforcement)
                const payload = data.tables ? data : { tables: data };
                const { data: result, error } = await supabase.functions.invoke("importar-backup", {
                  body: payload,
                });
                if (error) throw error;
                const summary = (result as any)?.summary ?? {};
                const imported = Object.values(summary).reduce((a: number, b: any) => a + Number(b || 0), 0);
                const tableCount = Object.keys(summary).length;
                toast.success(`Backup importado! ${imported} registros restaurados de ${tableCount} tabelas.`);
                if ((result as any)?.errors?.length) {
                  console.warn("Import warnings:", (result as any).errors);
                }
              } catch (err) {
                toast.error("Erro ao importar: " + (err instanceof Error ? err.message : "Arquivo inválido"));
              }
              e.target.value = "";
            }}
            className="text-xs max-w-[250px]"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Importar backup JSON exportado anteriormente</p>
        </div>
      </div>

      {/* Preferências de backup automático */}
      <div className="pt-4 border-t border-border/50 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" /> Preferências de backup automático
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Hora do backup (UTC)</Label>
            <select
              value={backupPrefs.hora_utc}
              onChange={(e) => setBackupPrefs({ ...backupPrefs, hora_utc: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00 UTC</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Reter por</Label>
            <select
              value={backupPrefs.retencao_dias}
              onChange={(e) => setBackupPrefs({ ...backupPrefs, retencao_dias: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
            >
              {[7, 14, 30, 60, 90].map((d) => (
                <option key={d} value={d}>{d} dias</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div className="flex-1 pr-3">
            <p className="text-xs font-medium">Enviar cópia para o Google Drive</p>
            <p className="text-[10px] text-muted-foreground">
              Os backups vão para uma pasta compartilhada do Google Drive da organização (subpasta por usuário).
            </p>
          </div>
          <Switch
            checked={backupPrefs.enviar_google_drive}
            onCheckedChange={(v) => setBackupPrefs({ ...backupPrefs, enviar_google_drive: v })}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div>
            <p className="text-xs font-medium">Backup automático ativo</p>
            <p className="text-[10px] text-muted-foreground">Desative para pausar a geração de backups.</p>
          </div>
          <Switch
            checked={backupPrefs.ativo}
            onCheckedChange={(v) => setBackupPrefs({ ...backupPrefs, ativo: v })}
          />
        </div>
        <Button onClick={handleSavePrefs} disabled={savingPrefs} size="sm" className="gap-2">
          {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar preferências
        </Button>
      </div>

      {/* Backups disponíveis */}
      <div className="pt-4 border-t border-border/50">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-primary" /> Backups disponíveis
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Backup gerado diariamente às {String(backupPrefs.hora_utc).padStart(2, "0")}:00 UTC. Mantidos por {backupPrefs.retencao_dias} dias.
        </p>
        {loadingBackups ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : autoBackups.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum backup automático ainda. O primeiro será gerado na próxima execução.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {autoBackups.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30 hover:bg-secondary/50">
                <span className="font-mono">{b.name.replace(".json", "")}</span>
                <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => handleDownloadAutoBackup(b.name)}>
                  <Download className="w-3 h-3" /> Baixar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
