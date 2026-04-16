import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

export default function Auditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("obra_audit_log")
        .select("id, acao, tabela, registro_id, user_email, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      setLogs(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = logs.filter((l) =>
    l.tabela?.toLowerCase().includes(search.toLowerCase()) ||
    l.acao?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  const acaoColor: Record<string, string> = {
    "criação": "bg-primary/15 text-primary",
    "edição": "bg-info/15 text-info",
    "exclusão": "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Auditoria</h1>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por tabela, ação ou usuário..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${acaoColor[l.acao] || "bg-muted text-muted-foreground"}`}>{l.acao}</span>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{l.tabela}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">{l.registro_id}</TableCell>
                  <TableCell className="text-sm">{l.user_email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
