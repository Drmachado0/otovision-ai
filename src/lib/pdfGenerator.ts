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

// ── Relatório de acerto com o construtor ──

export interface AcertoMesItem {
  data?: string;
  fornecedor: string;
  categoria: string;
  origem: string;
  valorBase: number;
  comissao: number;
  pago: boolean;
}

export interface AcertoMes {
  mes: string;
  mesLabel: string;
  gastosMes: number;
  comissaoMes: number;
  pagoMes: number;
  pendenteMes: number;
  itens: AcertoMesItem[];
}

export function printAcertoConstrutorReport(params: {
  nomeObra: string;
  construtor?: string;
  percentual: number;
  periodoLabel: string;
  totalGasto: number;
  comissaoTotal: number;
  comissaoPaga: number;
  comissaoPendente: number;
  meses: AcertoMes[];
}): void {
  const hoje = new Date().toLocaleDateString("pt-BR");
  const aReceber = params.comissaoPendente;

  const mesesHtml = params.meses.map((m) => `
    <div style="margin-top:18px;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:center;background:#f0fdf4;border-left:4px solid #10B981;padding:8px 10px;">
        <strong style="font-size:13px;color:#1a1a2e;">${escapeHtml(m.mesLabel)}</strong>
        <div style="font-size:11px;color:#444;">
          Gastos: <strong>${escapeHtml(formatCurrency(m.gastosMes))}</strong>
          · Comissão (${params.percentual}%): <strong style="color:#0d9488;">${escapeHtml(formatCurrency(m.comissaoMes))}</strong>
          · Pago: <strong style="color:#16a34a;">${escapeHtml(formatCurrency(m.pagoMes))}</strong>
          · Pendente: <strong style="color:#d97706;">${escapeHtml(formatCurrency(m.pendenteMes))}</strong>
        </div>
      </div>
      ${m.itens.length ? `
      <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px;">
        <thead>
          <tr style="background:#fafafa;border-bottom:1px solid #e5e7eb;">
            <th style="padding:5px;text-align:left;">Data</th>
            <th style="padding:5px;text-align:left;">Fornecedor</th>
            <th style="padding:5px;text-align:left;">Categoria</th>
            <th style="padding:5px;text-align:center;">Origem</th>
            <th style="padding:5px;text-align:right;">Valor Base</th>
            <th style="padding:5px;text-align:right;">Comissão</th>
            <th style="padding:5px;text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${m.itens.map((it, i) => `
            <tr style="border-bottom:1px solid #f1f5f9;${i % 2 ? "background:#fcfcfd;" : ""}">
              <td style="padding:5px;">${escapeHtml(it.data ? formatDate(it.data) : "-")}</td>
              <td style="padding:5px;">${escapeHtml(it.fornecedor || "-")}</td>
              <td style="padding:5px;">${escapeHtml(it.categoria || "-")}</td>
              <td style="padding:5px;text-align:center;">${escapeHtml(it.origem)}</td>
              <td style="padding:5px;text-align:right;">${escapeHtml(formatCurrency(it.valorBase))}</td>
              <td style="padding:5px;text-align:right;font-weight:600;">${escapeHtml(formatCurrency(it.comissao))}</td>
              <td style="padding:5px;text-align:center;color:${it.pago ? "#16a34a" : "#d97706"};font-weight:600;">${it.pago ? "Pago" : "Pendente"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>` : `<p style="font-size:10px;color:#999;padding:6px 10px;">Sem lançamentos detalhados neste mês.</p>`}
    </div>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Acerto com o Construtor</title>
    <style>
      @page { margin: 18mm 14mm; size: A4; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head>
    <body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #10B981;padding-bottom:12px;margin-bottom:14px;">
        <div>
          <h1 style="margin:0;font-size:22px;color:#0f172a;">Acerto com o Construtor</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#475569;">
            ${escapeHtml(params.nomeObra || "Obra")} · ${escapeHtml(params.periodoLabel)}
          </p>
          ${params.construtor ? `<p style="margin:2px 0 0;font-size:11px;color:#64748b;">Construtor: <strong>${escapeHtml(params.construtor)}</strong></p>` : ""}
        </div>
        <div style="text-align:right;font-size:11px;color:#64748b;">
          <p style="margin:0;">Gerado em ${hoje}</p>
          <p style="margin:2px 0 0;">Comissão pactuada: <strong>${params.percentual}%</strong></p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
        <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px;">
          <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;">Total Gasto</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;">${escapeHtml(formatCurrency(params.totalGasto))}</p>
        </div>
        <div style="border:1px solid #10B981;border-radius:6px;padding:10px;background:#f0fdf4;">
          <p style="margin:0;font-size:10px;color:#047857;text-transform:uppercase;">Comissão Total (${params.percentual}%)</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#047857;">${escapeHtml(formatCurrency(params.comissaoTotal))}</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px;">
          <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;">Já Pago</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#16a34a;">${escapeHtml(formatCurrency(params.comissaoPaga))}</p>
        </div>
        <div style="border:1px solid #f59e0b;border-radius:6px;padding:10px;background:#fffbeb;">
          <p style="margin:0;font-size:10px;color:#92400e;text-transform:uppercase;">A Pagar Agora</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#b45309;">${escapeHtml(formatCurrency(aReceber))}</p>
        </div>
      </div>

      <h2 style="font-size:13px;color:#0f172a;margin:16px 0 4px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">Detalhamento por mês</h2>
      ${mesesHtml || `<p style="font-size:11px;color:#999;">Nenhum lançamento no período.</p>`}

      <div style="margin-top:30px;padding:14px;border:1px dashed #94a3b8;border-radius:8px;background:#f8fafc;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#0f172a;">Resumo do acerto</p>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">
          <span>Comissão total apurada</span><strong>${escapeHtml(formatCurrency(params.comissaoTotal))}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">
          <span>(−) Já pago</span><strong style="color:#16a34a;">${escapeHtml(formatCurrency(params.comissaoPaga))}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-top:1px solid #cbd5e1;margin-top:6px;">
          <strong>Saldo a pagar ao construtor</strong>
          <strong style="color:#b45309;">${escapeHtml(formatCurrency(aReceber))}</strong>
        </div>
      </div>

      <div style="margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:40px;">
        <div style="text-align:center;border-top:1px solid #334155;padding-top:6px;font-size:11px;color:#475569;">
          Contratante / Proprietário
        </div>
        <div style="text-align:center;border-top:1px solid #334155;padding-top:6px;font-size:11px;color:#475569;">
          Construtor${params.construtor ? ` — ${escapeHtml(params.construtor)}` : ""}
        </div>
      </div>

      <div style="margin-top:30px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e5e7eb;padding-top:6px;">
        ObraFlow · Documento gerado automaticamente em ${hoje}
      </div>
    </body></html>
  `;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

