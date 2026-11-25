export type ParsedBankStatementRow = {
  date: string;
  description: string;
  amount: number;
  fitId?: string;
};

function normalizeHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const ofx = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
  const br = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (br) return `${br[3]!}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

function parseNumber(value: string): number {
  let raw = value.trim().replace(/R\$|\s/g, "").replace(/[()]/g, "");
  if (!raw) return 0;
  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (raw.includes(",")) raw = raw.replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i] ?? "";
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim()); current = "";
    } else current += char;
  }
  values.push(current.trim());
  return values;
}

export function parseOfx(text: string): ParsedBankStatementRow[] {
  const rows: ParsedBankStatementRow[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  for (const block of blocks) {
    const read = (tag: string) => block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"))?.[1]?.trim() ?? "";
    const date = parseDate(read("DTPOSTED"));
    const signed = parseNumber(read("TRNAMT"));
    const description = read("MEMO") || read("NAME") || read("TRNTYPE") || "Movimentação importada";
    if (date && signed !== 0) { const fitId = read("FITID"); rows.push({ date, description: description.slice(0, 240), amount: signed, ...(fitId ? { fitId } : {}) }); }
  }
  if (!rows.length) throw new Error("Não encontrei movimentações OFX válidas neste arquivo.");
  return rows;
}

export function parseCsv(text: string): ParsedBankStatementRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error("O CSV precisa ter cabeçalho e pelo menos uma movimentação.");
  const first = lines[0] ?? "";
  const delimiter = [",", ";", "\t"].sort((a, b) => splitCsvLine(first, b).length - splitCsvLine(first, a).length)[0] ?? ",";
  const headers = splitCsvLine(first, delimiter).map(normalizeHeader);
  const find = (...names: string[]) => headers.findIndex(header => names.includes(header));
  const dateIndex = find("data", "date", "datamovimento", "datatransacao", "posteddate", "transactiondate");
  const descriptionIndex = find("descricao", "historico", "memo", "description", "name", "lancamento");
  const amountIndex = find("valor", "amount", "value", "valortransacao");
  const debitIndex = find("debito", "debit", "saida", "withdrawal");
  const creditIndex = find("credito", "credit", "entrada", "deposit");
  if (dateIndex < 0 || descriptionIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) {
    throw new Error("Não reconheci as colunas. O CSV deve ter Data, Descrição e Valor (ou Débito/Crédito).");
  }
  const rows: ParsedBankStatementRow[] = [];
  const seenRows = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter);
    const date = parseDate(cells[dateIndex] ?? "");
    const description = (cells[descriptionIndex] ?? "").trim();
    const debit = debitIndex >= 0 ? Math.abs(parseNumber(cells[debitIndex] ?? "")) : 0;
    const credit = creditIndex >= 0 ? Math.abs(parseNumber(cells[creditIndex] ?? "")) : 0;
    const rawAmount = amountIndex >= 0 ? parseNumber(cells[amountIndex] ?? "") : 0;
    const amount = debit || credit ? (credit > 0 ? credit : -debit) : rawAmount;
    if (date && description && amount !== 0) {
      const identity = `${date}|${amount.toFixed(2)}|${description.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/\\s+/g, " ").trim()}`;
      const occurrence = (seenRows.get(identity) ?? 0) + 1;
      seenRows.set(identity, occurrence);
      rows.push({ date, description: description.slice(0, 240), amount, fitId: `csv:${identity}|${occurrence}` });
    }
  }
  if (!rows.length) throw new Error("Não encontrei movimentações válidas no CSV.");
  return rows;
}

export function statementFingerprint(_accountId: string, row: ParsedBankStatementRow): string {
  const normalized = row.description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  return row.fitId ? `fitid:${row.fitId}` : `${row.date}|${row.amount.toFixed(2)}|${normalized}`;
}
