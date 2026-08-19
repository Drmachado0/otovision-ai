import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  calcularFolhaMensal,
  calcularFolhaEstimada,
  aplicarExtras,
  EMPTY_EXTRAS,
  mesRefAtual,
  type FolhaItemExtras,
} from "@/lib/folhaMaoObra";
import { FolhaHeader } from "@/components/maoObraFolha/FolhaHeader";
import { FolhaKPIs } from "@/components/maoObraFolha/FolhaKPIs";
import { FolhaTabela } from "@/components/maoObraFolha/FolhaTabela";
import { CustosMesCard } from "@/components/maoObraFolha/CustosMesCard";
import { LancarEncargosDialog } from "@/components/maoObraFolha/LancarEncargosDialog";
import type { Props } from "@/components/maoObraFolha/types";

export default function MaoObraFolhaTab({
  userId,
  trabalhadores,
  registros,
  contas,
  folhas,
  onChange,
}: Props) {
  const [mesRef, setMesRef] = useState(mesRefAtual());
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mapa de extras por trabalhador (id -> extras)
  const [extrasMap, setExtrasMap] = useState<Record<string, FolhaItemExtras>>({});
  const [custosEng, setCustosEng] = useState(0);
  const [exames, setExames] = useState(0);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const folhaReal = useMemo(
    () => calcularFolhaMensal(trabalhadores, registros, mesRef),
    [trabalhadores, registros, mesRef],
  );
  const folhaEstimada = useMemo(
    () => calcularFolhaEstimada(trabalhadores),
    [trabalhadores],
  );
  const usarEstimativa = folhaReal.itens.length === 0;
  const folhaBase = usarEstimativa ? folhaEstimada : folhaReal;
  const folha = useMemo(
    () => aplicarExtras(folhaBase, extrasMap),
    [folhaBase, extrasMap],
  );
  const totalGeralMes = folha.total_geral + custosEng + exames;

  const folhaLancada = folhas.find((f) => f.mes_ref === mesRef);

  // ---------- Carrega extras do mês ----------
  const { data: folhaMesData } = useQuery({
    queryKey: ["mao-obra-folha-item", userId, mesRef],
    enabled: !!userId && !!mesRef,
    queryFn: async () => {
      const [itemRes, folhaRes] = await Promise.all([
        supabase
          .from("obra_mao_obra_folha_item")
          .select("*")
          .eq("mes_ref", mesRef)
          .is("deleted_at", null),
        supabase
          .from("obra_mao_obra_folha")
          .select("custos_engenharia,exames")
          .eq("mes_ref", mesRef)
          .maybeSingle(),
      ]);
      if (itemRes.error) throw itemRes.error;
      const map: Record<string, FolhaItemExtras> = {};
      (itemRes.data ?? []).forEach((r) => {
        map[r.trabalhador_id] = {
          fgts: Number(r.fgts) || 0,
          inss: Number(r.inss) || 0,
          quinzena: Number(r.quinzena) || 0,
          vales: Number(r.vales) || 0,
          vale_alimentacao: Number(r.vale_alimentacao) || 0,
          encerramento: Number(r.encerramento) || 0,
          ferias_decimo: Number(r.ferias_decimo) || 0,
          horas_extras: Number(r.horas_extras) || 0,
        };
      });
      const f = folhaRes.data;
      return {
        extrasMap: map,
        custosEng: Number(f?.custos_engenharia) || 0,
        exames: Number(f?.exames) || 0,
      };
    },
  });

  // sincroniza dados carregados para o estado editável local
  useEffect(() => {
    if (!folhaMesData) return;
    setExtrasMap(folhaMesData.extrasMap);
    setCustosEng(folhaMesData.custosEng);
    setExames(folhaMesData.exames);
  }, [folhaMesData]);

  // ---------- Atualiza extra (debounce upsert) ----------
  const updateExtra = (trabalhadorId: string, field: keyof FolhaItemExtras, value: number) => {
    setExtrasMap((prev) => ({
      ...prev,
      [trabalhadorId]: { ...EMPTY_EXTRAS, ...(prev[trabalhadorId] ?? {}), [field]: value },
    }));

    const key = `${trabalhadorId}:${field}`;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(async () => {
      const next = {
        ...EMPTY_EXTRAS,
        ...(extrasMap[trabalhadorId] ?? {}),
        [field]: value,
      };
      const { error } = await (supabase as any)
        .from("obra_mao_obra_folha_item")
        .upsert(
          {
            user_id: userId,
            trabalhador_id: trabalhadorId,
            mes_ref: mesRef,
            ...next,
          },
          { onConflict: "user_id,trabalhador_id,mes_ref" },
        );
      if (error) toast.error("Erro ao salvar: " + error.message);
    }, 600);
  };

  // ---------- Atualiza custos do mês ----------
  const upsertFolhaMes = async (patch: { custos_engenharia?: number; exames?: number }) => {
    const { error } = await (supabase as any)
      .from("obra_mao_obra_folha")
      .upsert(
        {
          user_id: userId,
          mes_ref: mesRef,
          total_diarias: folha.total_diarias,
          total_fgts: folha.total_fgts,
          total_inss: folha.total_inss,
          ...patch,
          status: folhaLancada?.status ?? "rascunho",
        },
        { onConflict: "user_id,mes_ref" },
      );
    if (error) toast.error("Erro ao salvar custos: " + error.message);
  };

  const handleCustosBlur = (kind: "eng" | "exames") => {
    upsertFolhaMes(
      kind === "eng"
        ? { custos_engenharia: custosEng }
        : { exames },
    );
  };

  // ---------- form do dialog (encargos) ----------
  const [contaId, setContaId] = useState<string>("");
  const [valorFgts, setValorFgts] = useState("");
  const [valorInss, setValorInss] = useState("");
  const [dataPag, setDataPag] = useState(`${mesRef}-05`);

  useEffect(() => {
    if (showDialog) {
      setValorFgts(folha.total_fgts.toFixed(2));
      setValorInss(folha.total_inss.toFixed(2));
      setDataPag(`${mesRef}-05`);
      if (!contaId && contas[0]) setContaId(contas[0].id);
    }
  }, [showDialog]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLancar = async () => {
    if (!contaId) {
      toast.error("Selecione uma conta");
      return;
    }
    setSaving(true);
    const fgts = Number(valorFgts) || 0;
    const inss = Number(valorInss) || 0;

    try {
      const baseTx = {
        user_id: userId,
        tipo: "Saída",
        data: dataPag,
        conta_id: contaId,
        forma_pagamento: "PIX",
        recorrencia: "Única",
        status: "Pendente",
        data_vencimento: dataPag,
      };

      const { data: txFgts, error: e1 } = await (supabase as any)
        .from("obra_transacoes_fluxo")
        .insert({
          ...baseTx,
          descricao: `Encargos FGTS - ${mesRef}`,
          categoria: "Encargos FGTS",
          valor: fgts,
          referencia: `FOLHA-FGTS-${mesRef}`,
          origem_tipo: "folha_mao_obra",
        })
        .select("id")
        .single();
      if (e1) throw e1;

      const { data: txInss, error: e2 } = await (supabase as any)
        .from("obra_transacoes_fluxo")
        .insert({
          ...baseTx,
          descricao: `Encargos INSS - ${mesRef}`,
          categoria: "Encargos INSS",
          valor: inss,
          referencia: `FOLHA-INSS-${mesRef}`,
          origem_tipo: "folha_mao_obra",
        })
        .select("id")
        .single();
      if (e2) throw e2;

      const { error: e3 } = await (supabase as any)
        .from("obra_mao_obra_folha")
        .upsert(
          {
            user_id: userId,
            mes_ref: mesRef,
            total_diarias: folha.total_diarias,
            total_fgts: fgts,
            total_inss: inss,
            total_quinzena: folha.total_quinzena,
            total_vales: folha.total_vales,
            total_vale_alim: folha.total_vale_alim,
            total_encerramento: folha.total_encerramento,
            total_ferias: folha.total_ferias,
            total_horas_extras: folha.total_horas_extras,
            custos_engenharia: custosEng,
            exames,
            total_geral: totalGeralMes,
            detalhes: folha.itens,
            transacao_fgts_id: txFgts.id,
            transacao_inss_id: txInss.id,
            status: "lancada",
          },
          { onConflict: "user_id,mes_ref" },
        );
      if (e3) throw e3;

      toast.success("Encargos lançados em Contas a Pagar");
      setShowDialog(false);
      onChange();
    } catch (err: unknown) {
      toast.error("Erro ao lançar: " + (err?.message ?? "desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <FolhaHeader
        mesRef={mesRef}
        onMesRefChange={setMesRef}
        folha={folha}
        folhaLancada={folhaLancada}
        usarEstimativa={usarEstimativa}
        onLancar={() => setShowDialog(true)}
      />

      {/* KPIs */}
      <FolhaKPIs
        folha={folha}
        usarEstimativa={usarEstimativa}
        custosEng={custosEng}
        exames={exames}
        totalGeralMes={totalGeralMes}
      />

      {/* Tabela */}
      <FolhaTabela folha={folha} mesRef={mesRef} onUpdateExtra={updateExtra} />

      {/* Custos do mês */}
      <CustosMesCard
        folha={folha}
        custosEng={custosEng}
        exames={exames}
        totalGeralMes={totalGeralMes}
        onCustosEngChange={setCustosEng}
        onExamesChange={setExames}
        onCustosBlur={handleCustosBlur}
      />

      {/* Dialog encargos */}
      <LancarEncargosDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        mesRef={mesRef}
        contas={contas}
        contaId={contaId}
        onContaIdChange={setContaId}
        valorFgts={valorFgts}
        onValorFgtsChange={setValorFgts}
        valorInss={valorInss}
        onValorInssChange={setValorInss}
        dataPag={dataPag}
        onDataPagChange={setDataPag}
        saving={saving}
        onLancar={handleLancar}
      />
    </div>
  );
}
