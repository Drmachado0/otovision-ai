import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Loader2, Eye, EyeOff, ArrowRight, BarChart3, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FEATURES = [
  { icon: BarChart3, title: "Dashboard Executivo", desc: "KPIs em tempo real, graficos e projecoes" },
  { icon: Shield, title: "Controle Total", desc: "Fluxo de caixa, compras, comissoes e cronograma" },
  { icon: Zap, title: "IA Integrada", desc: "Leitura automatica de notas fiscais e extratos" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) toast.error(error.message);
      else toast.success("Conta criada! Verifique seu email.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-info/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ObraFlow</h1>
              <p className="text-xs text-muted-foreground">Gestao Inteligente de Obras</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-4">
            Controle sua obra<br />
            com <span className="gradient-text">inteligencia</span>
          </h2>
          <p className="text-muted-foreground mb-12 max-w-md">
            Plataforma completa para gestao financeira, acompanhamento de cronograma e controle de custos da sua obra.
          </p>

          <div className="space-y-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="flex items-start gap-4 animate-fade-in-up"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
              Feito para construtores, engenheiros e gestores
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">ObraFlow</h1>
            <p className="text-xs text-muted-foreground">Gestao Inteligente de Obras</p>
          </div>

          <div className="glass-card p-8 animate-scale-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                {isSignUp ? "Criar conta" : "Bem-vindo de volta"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isSignUp ? "Preencha os dados para comecar" : "Entre com suas credenciais"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="mt-1.5 h-11"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Senha</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min. 6 caracteres"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 gap-2 text-sm font-semibold">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? "Criar Conta" : "Entrar"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border/50 text-center">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? "Ja tem conta?" : "Nao tem conta?"}{" "}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary font-medium hover:underline"
                >
                  {isSignUp ? "Fazer login" : "Criar conta gratis"}
                </button>
              </p>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
            ObraFlow v1.0 &middot; Seus dados estao protegidos
          </p>
        </div>
      </div>
    </div>
  );
}
