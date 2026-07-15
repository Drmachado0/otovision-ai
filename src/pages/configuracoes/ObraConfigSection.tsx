import { Building2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters";
import type { ObraConfig } from "./types";

interface ObraConfigSectionProps {
  obraConfig: ObraConfig;
  updateObraField: (field: keyof ObraConfig, value: string | number) => void;
  handleSaveObra: () => void;
  savingObra: boolean;
  loadingObra: boolean;
}

export function ObraConfigSection({
  obraConfig,
  updateObraField,
  handleSaveObra,
  savingObra,
  loadingObra,
}: ObraConfigSectionProps) {
  return (
    <section className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> Dados da Obra
        </h2>
        <Button onClick={handleSaveObra} disabled={savingObra || loadingObra} size="sm" className="gap-2">
          {savingObra ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>
      {loadingObra ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Nome da Obra</Label>
            <Input
              value={obraConfig.nome_obra}
              onChange={e => updateObraField("nome_obra", e.target.value)}
              placeholder="Ex: Clínica Otovision"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Endereço</Label>
            <Input
              value={obraConfig.endereco}
              onChange={e => updateObraField("endereco", e.target.value)}
              placeholder="Rua, número, cidade..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Responsável</Label>
            <Input
              value={obraConfig.responsavel}
              onChange={e => updateObraField("responsavel", e.target.value)}
              placeholder="Nome do responsável"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Contato do Responsável</Label>
            <Input
              value={obraConfig.contato_responsavel}
              onChange={e => updateObraField("contato_responsavel", e.target.value)}
              placeholder="Telefone ou email"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Área Construída (m²)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={obraConfig.area_construida || ""}
              onChange={e => updateObraField("area_construida", parseFloat(e.target.value) || 0)}
              placeholder="658"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Usado no cálculo do KPI Custo/m² no Dashboard (atualização em tempo real)
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Orçamento Total (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={obraConfig.orcamento_total || ""}
              onChange={e => updateObraField("orcamento_total", parseFloat(e.target.value) || 0)}
              placeholder="1500000"
              className="mt-1"
            />
            {obraConfig.orcamento_total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(obraConfig.orcamento_total)}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Data de Início</Label>
            <Input
              type="date"
              value={obraConfig.data_inicio}
              onChange={e => updateObraField("data_inicio", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Data de Término</Label>
            <Input
              type="date"
              value={obraConfig.data_termino}
              onChange={e => updateObraField("data_termino", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </section>
  );
}
