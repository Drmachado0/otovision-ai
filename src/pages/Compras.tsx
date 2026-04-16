import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Compras() {
  const [compras, setCompras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ fornecedor: "", descricao: "", categoria: "", valor_total: "", data: new Date().toISOString().split("T")[0], forma_pagamento: "PIX", status_entrega: "Pedido" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("obra_compras")
      .select("id, fornecedor, descricao, categoria, valor_total, data, status_entrega, forma_pagamento")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .limit(200);
    setCompras(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    const compraData = {
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      categoria: form.categoria,
      valor_total: parseFloat(form.valor_total) || 0,
      data: form.data,
      forma_pagamento: form.forma_pagamento,
      status_entrega: form.status_entrega,
    };

    const transacaoData = {
      tipo: "Saída",
      descricao: `Compra: ${form.descricao}`,
      categoria: form.categoria,
      valor: parseFloat(form.valor_total) || 0,
      data: form.data,
      forma_pagamento: form.forma_pagamento,
      recorrencia: "Única",
    };

    const { error } = await supabase.rpc("create_compra_atomica", {
      p_compra: compraData,
      p_transacao: transacaoData,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Compra registrada!" });
      setOpen(false);
      fetchData();
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = compras.filter((c) =>
    c.fornecedor?.toLowerCase().includes(search.toLowerCase()) || c.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    Pedido: "bg-warning/15 text-warning",
    "Em Trânsito": "bg-info/15 text-info",
    Entregue: "bg-primary/15 text-primary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compras</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Compra</Button>
          </DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader><DialogTitle>Nova Compra</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
              <div className="space-y-2"><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
                <div className="space-y-2"><Label>Valor Total</Label><Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Status Entrega</Label>
                  <Select value={form.status_entrega} onValueChange={(v) => setForm({ ...form, status_entrega: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pedido">Pedido</SelectItem>
                      <SelectItem value="Em Trânsito">Em Trânsito</SelectItem>
                      <SelectItem value="Entregue">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">Salvar Compra</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar compras..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhuma compra encontrada</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.data ? new Date(c.data).toLocaleDateString("pt-BR") : "-"}</TableCell>
                  <TableCell className="font-medium">{c.fornecedor}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.descricao}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.categoria}</TableCell>
                  <TableCell className="font-medium text-destructive">{fmt(c.valor_total)}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[c.status_entrega] || "bg-muted text-muted-foreground"}`}>
                      {c.status_entrega}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
