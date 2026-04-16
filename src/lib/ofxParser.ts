/**
 * OFX/CSV Bank Statement Parser
 * Parses OFX (SGML + XML) and CSV bank statements into normalized transactions
 */

export interface ExtractedTransaction {
  data: string;
  descricao: string;
  valor: number;
  tipo: "Entrada" | "Saída";
  fitId?: string;
}

// ── OFX Parser ──

function parseOFXDate(raw: string): string {
  // OFX dates: 20260115120000[-3:BRT] or 20260115
  const cleaned = raw.replace(/\[.*\]/, "").trim();
  if (cleaned.length >= 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  return raw;
}

function extractTag(content: string, tag: string): string {
  // SGML style: <TAG>value\n or <TAG>value<
  const sgml = new RegExp(`<${tag}>([^<\\n]+)`, "i");
  const match = content.match(sgml);
  if (match) return match[1].trim();

  // XML style: <TAG>value</TAG>
  const xml = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const xmlMatch = content.match(xml);
  if (xmlMatch) return xmlMatch[1].trim();

  return "";
}

export function parseOFX(content: string): ExtractedTransaction[] {
  const transactions: ExtractedTransaction[] = [];

  // Split by STMTTRN blocks
  const blocks = content.split(/<STMTTRN>/i).slice(1);

  for (const block of blocks) {
    const endIdx = block.search(/<\/STMTTRN>/i);
    const segment = endIdx >= 0 ? block.slice(0, endIdx) : block;

    const trntype = extractTag(segment, "TRNTYPE");
    const dtposted = extractTag(segment, "DTPOSTED");
    const trnamt = extractTag(segment, "TRNAMT");
    const fitid = extractTag(segment, "FITID");
    const memo = extractTag(segment, "MEMO") || extractTag(segment, "NAME") || "";

    if (!dtposted || !trnamt) continue;

    const valor = parseFloat(trnamt.replace(",", "."));
    if (isNaN(valor)) continue;

    transactions.push({
      data: parseOFXDate(dtposted),
      descricao: memo,
      valor: Math.abs(valor),
      tipo: valor >= 0 ? "Entrada" : "Saída",
      fitId: fitid,
    });
  }

  return transactions.sort((a, b) => a.data.localeCompare(b.data));
}

// ── CSV Parser ──

function detectSeparator(line: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  for (const char of Object.keys(counts)) {
    counts[char] = (line.match(new RegExp(`\\${char}`, "g")) || []).length;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCSVDate(raw: string): string {
  const trimmed = raw.trim().replace(/"/g, "");
  // DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  // YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // DD-MM-YYYY
  const dmy2 = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy2) return `${dmy2[3]}-${dmy2[2]}-${dmy2[1]}`;
  return trimmed;
}

function parseCSVValue(raw: string): number {
  let cleaned = raw.trim().replace(/"/g, "");
  // Handle Brazilian format: 1.234,56
  if (/\d+\.\d{3}/.test(cleaned) && cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  // Remove currency symbols
  cleaned = cleaned.replace(/[R$\s]/g, "");
  return parseFloat(cleaned) || 0;
}

function detectColumns(headers: string[]): { dateCol: number; descCol: number; valueCol: number; creditCol: number; debitCol: number } {
  const lower = headers.map(h => h.toLowerCase().trim().replace(/"/g, ""));
  let dateCol = -1, descCol = -1, valueCol = -1, creditCol = -1, debitCol = -1;

  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    if (dateCol === -1 && /data|date|dt/.test(h)) dateCol = i;
    if (descCol === -1 && /descri|hist|memo|detail|lanca/.test(h)) descCol = i;
    if (/valor|amount|value|vlr/.test(h) && !/credit|debit/.test(h)) valueCol = i;
    if (/credito|credit|entrada/.test(h)) creditCol = i;
    if (/debito|debit|saida/.test(h)) debitCol = i;
  }

  // Fallback: first col = date, second = desc, third = value
  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = Math.min(1, headers.length - 1);
  if (valueCol === -1 && creditCol === -1 && debitCol === -1) valueCol = Math.min(2, headers.length - 1);

  return { dateCol, descCol, valueCol, creditCol, debitCol };
}

export function parseCSV(content: string): ExtractedTransaction[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = lines[0].split(sep);
  const { dateCol, descCol, valueCol, creditCol, debitCol } = detectColumns(headers);

  const transactions: ExtractedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    if (cols.length < 3) continue;

    const dataStr = parseCSVDate(cols[dateCol] || "");
    const desc = (cols[descCol] || "").trim().replace(/"/g, "");

    let valor = 0;
    let tipo: "Entrada" | "Saída" = "Saída";

    if (creditCol >= 0 && debitCol >= 0) {
      const credit = parseCSVValue(cols[creditCol] || "0");
      const debit = parseCSVValue(cols[debitCol] || "0");
      if (credit > 0) { valor = credit; tipo = "Entrada"; }
      else if (debit > 0) { valor = debit; tipo = "Saída"; }
      else continue;
    } else {
      valor = parseCSVValue(cols[valueCol] || "0");
      if (valor === 0) continue;
      tipo = valor > 0 ? "Entrada" : "Saída";
      valor = Math.abs(valor);
    }

    if (!dataStr || !desc) continue;

    transactions.push({ data: dataStr, descricao: desc, valor, tipo });
  }

  return transactions.sort((a, b) => a.data.localeCompare(b.data));
}

// ── Auto-detect and parse ──

export function parseStatement(content: string, filename: string): ExtractedTransaction[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ofx") || lower.endsWith(".ofc") || content.includes("<OFX>") || content.includes("<STMTTRN>")) {
    return parseOFX(content);
  }
  return parseCSV(content);
}
