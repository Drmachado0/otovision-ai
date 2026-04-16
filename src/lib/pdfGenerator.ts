/**
 * PDF Generator for reports and commissions
 * Uses browser print API for clean PDF output
 */

import { formatCurrency, formatDate } from "./formatters";

interface ReportData {
  titulo: string;
  subtitulo?: string;
  data?: string;
  nomeObra?: string;
  colunas: { key: string; label: string; align?: "left" | "right" | "center" }[];
  linhas: Record<string, unknown>[];
  resumo?: { label: string; valor: string }[];
}

function escapeHtml(str: string): string {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildReportHtml(data: ReportData): string {
  const hoje = data.data || new Date().toLocaleDateString("pt-BR");

  const headerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #10B981;padding-bottom:12px;margin-bottom:20px;">
      <div>
        <h1 style="margin:0;font-size:20px;color:#1a1a2e;">${escapeHtml(data.titulo)}</h1>
        ${data.subtitulo ? `<p style="margin:4px 0 0;font-size:12px;color:#666;">${escapeHtml(data.subtitulo)}</p>` : ""}
      </div>
      <div style="text-align:right;">
        ${data.nomeObra ? `<p style="margin:0;font-size:13px;font-weight:600;color:#333;">${escapeHtml(data.nomeObra)}</p>` : ""}
        <p style="margin:2px 0 0;font-size:11px;color:#888;">Gerado em ${hoje}</p>
      </div>
    </div>
  `;

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#f0fdf4;border-bottom:2px solid #10B981;">
          ${data.colunas.map(c => `<th style="padding:8px 6px;text-align:${c.align || "left"};font-size:10px;text-transform:uppercase;color:#555;">${escapeHtml(c.label)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${data.linhas.map((row, i) => `
          <tr style="border-bottom:1px solid #eee;${i % 2 ? "background:#fafafa;" : ""}">
            ${data.colunas.map(c => {
              const val = row[c.key];
              return `<td style="padding:6px;text-align:${c.align || "left"};">${escapeHtml(String(val ?? "-"))}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const resumoHtml = data.resumo ? `
    <div style="margin-top:20px;padding:12px;background:#f0fdf4;border:1px solid #10B981;border-radius:8px;">
      ${data.resumo.map(r => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;">
          <span style="font-size:12px;color:#555;">${escapeHtml(r.label)}</span>
          <span style="font-size:13px;font-weight:700;">${escapeHtml(r.valor)}</span>
        </div>
      `).join("")}
    </div>
  ` : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(data.titulo)}</title>
      <style>
        @page { margin: 20mm 15mm; size: A4; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; padding: 0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      ${headerHtml}
      ${tableHtml}
      ${resumoHtml}
      <div style="margin-top:30px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px;">
        ObraFlow - Relatorio gerado automaticamente
      </div>
    </body>
    </html>
  `;
}

export function printReport(data: ReportData): void {
  const html = buildReportHtml(data);
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.print();
  }, 500);
}

// ── Pre-built report generators ──

export function printComissaoReport(params: {
  nomeObra: string;
  totalGasto: number;
  percentual: number;
  comissaoTotal: number;
  comissaoPaga: number;
  comissaoPendente: number;
  pagamentos: { mes: string; valor: number; pago: boolean; observacoes: string; created_at: string }[];
}): void {
  printReport({
    titulo: "Relatório de Comissões",
    subtitulo: `Comissão de ${params.percentual}% sobre gastos`,
    nomeObra: params.nomeObra,
    colunas: [
      { key: "mes", label: "Mês Ref." },
      { key: "observacoes", label: "Referência" },
      { key: "valor", label: "Valor", align: "right" },
      { key: "status", label: "Status", align: "center" },
      { key: "data", label: "Data" },
    ],
    linhas: params.pagamentos.map(p => ({
      mes: p.mes || "-",
      observacoes: p.observacoes || "-",
      valor: formatCurrency(p.valor),
      status: p.pago ? "Pago" : "Pendente",
      data: formatDate(p.created_at),
    })),
    resumo: [
      { label: "Base de Cálculo (Total Gasto)", valor: formatCurrency(params.totalGasto) },
      { label: `Comissão Total (${params.percentual}%)`, valor: formatCurrency(params.comissaoTotal) },
      { label: "Comissão Paga", valor: formatCurrency(params.comissaoPaga) },
      { label: "Comissão Pendente", valor: formatCurrency(params.comissaoPendente) },
    ],
  });
}

export function printFluxoReport(params: {
  nomeObra: string;
  periodo: string;
  totalEntradas: number;
  totalSaidas: number;
  transacoes: { data: string; tipo: string; descricao: string; categoria: string; valor: number; forma_pagamento: string }[];
}): void {
  printReport({
    titulo: "Relatório de Fluxo de Caixa",
    subtitulo: params.periodo,
    nomeObra: params.nomeObra,
    colunas: [
      { key: "data", label: "Data" },
      { key: "tipo", label: "Tipo" },
      { key: "descricao", label: "Descrição" },
      { key: "categoria", label: "Categoria" },
      { key: "pagamento", label: "Pagamento" },
      { key: "valor", label: "Valor", align: "right" },
    ],
    linhas: params.transacoes.map(t => ({
      data: formatDate(t.data),
      tipo: t.tipo,
      descricao: t.descricao || "-",
      categoria: t.categoria || "-",
      pagamento: t.forma_pagamento || "-",
      valor: `${t.tipo === "Entrada" ? "+" : "-"}${formatCurrency(t.valor)}`,
    })),
    resumo: [
      { label: "Total Entradas", valor: formatCurrency(params.totalEntradas) },
      { label: "Total Saídas", valor: formatCurrency(params.totalSaidas) },
      { label: "Saldo", valor: formatCurrency(params.totalEntradas - params.totalSaidas) },
    ],
  });
}
