import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Building2, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_obra: "",
    orcamento_total: "",
    area_construida: "",
    data_inicio: "",
    data_termino: "",
    responsavel: "",
  });

  const steps = [
    { title: "Bem-vindo ao ObraFlow!", desc: "Vamos configurar sua obra em poucos passos." },
    { title: "Dados da Obra", desc: "Informações básicas do projeto." },
    { title: "Orçamento e Prazos", desc: "Defina valores e datas." },
  ];

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("obra_config").insert({
      user_id: user.id,
      nome_obra: form.nome_obra || "Minha Obra",
      orcamento_total: Number(form.orcamento_total) || 0,
      area_construida: Number(form.area_construida) || 0,
      data_inicio: form.data_inicio || null,
      data_termino: form.data_termino || null,
      responsavel: form.responsavel || "",
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Obra configurada com sucesso!");
      onComplete();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= step ? "bg-primary w-12" : "bg-secondary w-8"
              }`}
            />
          ))}
        </div>

        <div className="glass-card p-8 animate-scale-in">
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{steps[0].title}</h2>
                <p className="text-muted-foreground mt-2">{steps[0].desc}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure os dados basicos da sua obra para comecar a usar todos os recursos da plataforma.
              </p>
              <Button onClick={() => setStep(1)} className="gap-2">
                Comecar <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">{steps[1].title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{steps[1].desc}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome da Obra *</Label>
                  <Input
                    value={form.nome_obra}
                    onChange={e => setForm(f => ({ ...f, nome_obra: e.target.value }))}
                    placeholder="Ex: Casa da Praia, Clinica Centro..."
                    className="mt-1.5 h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Responsavel</Label>
                  <Input
                    value={form.responsavel}
                    onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                    placeholder="Nome do engenheiro ou mestre de obras"
                    className="mt-1.5 h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Area Construida (m2)</Label>
                  <Input
                    type="number"
                    value={form.area_construida}
                    onChange={e => setForm(f => ({ ...f, area_construida: e.target.value }))}
                    placeholder="Ex: 250"
                    className="mt-1.5 h-11"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Voltar</Button>
                <Button onClick={() => setStep(2)} className="flex-1 gap-2">
                  Proximo <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">{steps[2].title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{steps[2].desc}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Orcamento Total (R$)</Label>
                  <Input
                    type="number"
                    value={form.orcamento_total}
                    onChange={e => setForm(f => ({ ...f, orcamento_total: e.target.value }))}
                    placeholder="Ex: 500000"
                    className="mt-1.5 h-11"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Inicio</Label>
                    <Input
                      type="date"
                      value={form.data_inicio}
                      onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Termino</Label>
                    <Input
                      type="date"
                      value={form.data_termino}
                      onChange={e => setForm(f => ({ ...f, data_termino: e.target.value }))}
                      className="mt-1.5 h-11"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Voltar</Button>
                <Button onClick={handleFinish} disabled={saving} className="flex-1 gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Finalizar
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-4">
          Voce pode alterar esses dados depois em Configuracoes
        </p>
      </div>
    </div>
  );
}
