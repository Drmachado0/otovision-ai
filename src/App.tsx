import { lazy, Suspense, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Building2 } from "lucide-react";
import LoginPage from "@/pages/LoginPage";
import OnboardingWizard from "@/components/OnboardingWizard";
import NotFound from "@/pages/NotFound";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const FluxoCaixaPage = lazy(() => import("@/pages/FluxoCaixaPage"));
const ComprasPage = lazy(() => import("@/pages/ComprasPage"));
const LeitorIAPage = lazy(() => import("@/pages/LeitorIAPage"));
const ComissaoPage = lazy(() => import("@/pages/ComissaoPage"));
const AuditoriaPage = lazy(() => import("@/pages/AuditoriaPage"));
const CronogramaPage = lazy(() => import("@/pages/CronogramaPage"));
const PrevisaoPage = lazy(() => import("@/pages/PrevisaoPage"));
const InsightsPage = lazy(() => import("@/pages/InsightsPage"));
const RelatoriosPage = lazy(() => import("@/pages/RelatoriosPage"));
const PastaMonitorPage = lazy(() => import("@/pages/PastaMonitorPage"));
const ConciliacaoPage = lazy(() => import("@/pages/ConciliacaoPage"));
const ContasBancariasPage = lazy(() => import("@/pages/ContasBancariasPage"));
const ConfiguracoesPage = lazy(() => import("@/pages/ConfiguracoesPage"));
const NotasFiscaisPage = lazy(() => import("@/pages/NotasFiscaisPage"));
const DiarioObraPage = lazy(() => import("@/pages/DiarioObraPage"));
const MedicaoObraPage = lazy(() => import("@/pages/MedicaoObraPage"));
const EquipePage = lazy(() => import("@/pages/EquipePage"));
const CurvaABCPage = lazy(() => import("@/pages/CurvaABCPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min cache
      gcTime: 1000 * 60 * 10, // 10 min garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground animate-pulse">Carregando...</p>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkOnboarding = async () => {
      if (!user) {
        if (!cancelled) setNeedsOnboarding(false);
        return;
      }

      const { data } = await supabase
        .from("obra_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setNeedsOnboarding(!data);
      }
    };

    void checkOnboarding();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center animate-pulse">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight">ObraFlow</h1>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (needsOnboarding === true) {
    return <OnboardingWizard onComplete={() => setNeedsOnboarding(false)} />;
  }

  if (needsOnboarding === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/fluxo" element={<FluxoCaixaPage />} />
            <Route path="/compras" element={<ComprasPage />} />
            <Route path="/leitor-ia" element={<LeitorIAPage />} />
            <Route path="/comissao" element={<ComissaoPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
            <Route path="/cronograma" element={<CronogramaPage />} />
            <Route path="/diario" element={<DiarioObraPage />} />
            <Route path="/medicao" element={<MedicaoObraPage />} />
            <Route path="/equipe" element={<EquipePage />} />
            <Route path="/curva-abc" element={<CurvaABCPage />} />
            <Route path="/previsao" element={<PrevisaoPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/pasta-sync" element={<PastaMonitorPage />} />
            <Route path="/conciliacao" element={<ConciliacaoPage />} />
            <Route path="/contas" element={<ContasBancariasPage />} />
            <Route path="/notas-fiscais" element={<NotasFiscaisPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthenticatedApp />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
