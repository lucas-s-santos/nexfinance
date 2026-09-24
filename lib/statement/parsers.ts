// Mesmo código do app (nexfinance-mobile/src/lib/statement/parsers.ts). Mantenha os dois iguais.
// Leitura de extratos em PDF (texto extraído) e CSV para uma lista de lançamentos
// com valor COM SINAL na visão da conta: positivo = entrou, negativo = saiu.
import type { CsvData } from "../csv"
import { directionFromText, isBalanceLine } from "./rules"
import { isNubankStatement, parseNubankStatement } from "./nubank"
import { findAmountTokens, matchDateAtStart, normalizeText, parseAmount, parseDateCell, type Direction } from "./text"
import type { PdfStatement, StatementTx } from "./types"

export type { PdfStatement, StatementCheck, StatementTx } from "./types"


// ===== PDF =====

// Rodapés/cabeçalhos repetidos a cada página que não podem virar parte da descrição.
const NOISE_PATTERNS = [
  /^\d+ de \d+$/,
  /^pagina \d+/,
  /^valores em r\$/,
  /^movimentac/,
  /^extrato (gerado|de conta)/,
  /ouvidoria/,
  /^sac\b/,
  /^tem alguma duvida/,
  /^caso (tenha|queira)/,
  /cnpj/,
  /^data (lancamento|mov)/,
  /^(data|historico|valor|documento|descricao)( |$)/,
]

function isNoise(normalized: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(normalized))
}

// Ano de referência para datas sem ano ("01/09", "01 SET"): o primeiro ano completo do extrato.
function inferYear(text: string): number {
  const m = text.match(/\b\d{2}\/\d{2}\/(20\d{2})\b/) ?? text.match(/\b\d{1,2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?\s+(20\d{2})\b/i)
  return m ? Number(m[1]) : new Date().getFullYear()
}

function cleanDescription(parts: string[]): string {
  return parts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/^\d{3,}\s+/, "") // nº de documento no início (Caixa/BB)
    .replace(/[\s\-–:|]+$/, "")
    .trim()
}

/**
 * Extrato do Nubank tem leitor próprio (nubank.ts). Aqui, os demais formatos:
 *  - blocos "Total de entradas"/"Total de saídas" com valores sem sinal — a direção vem do bloco;
 *  - Banco do Brasil: "dd/mm/aaaa descrição 150,00 (-)" ou "150,00 D".
 *  - Caixa: "dd/mm/aaaa nº descrição 150,00 D 1.050,00 C" (valor + saldo; o saldo é ignorado).
 *  - Genérico: valor com sinal ("-150,00").
 * Precedência da direção: sufixo D/C > bloco entradas/saídas > sinal > palavras da descrição.
 */
export function parsePdfStatement(text: string): PdfStatement {
  if (isNubankStatement(text)) return parseNubankStatement(text)
  return { transactions: parseGenericPdf(text), warnings: [] }
}

function parseGenericPdf(text: string): StatementTx[] {
  const fallbackYear = inferYear(text)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  const out: StatementTx[] = []
  let currentDate = ""
  let section: Direction | null = null
  let buffer: string[] = []

  for (const rawLine of lines) {
    let line = rawLine
    const date = matchDateAtStart(line, fallbackYear)
    if (date) {
      if (date.iso !== currentDate) section = null
      currentDate = date.iso
      line = date.rest
      buffer = []
    }

    const normalized = normalizeText(line)
    if (/^total de entradas/.test(normalized)) {
      section = "in"
      buffer = []
      continue
    }
    if (/^total de saidas/.test(normalized)) {
      section = "out"
      buffer = []
      continue
    }
    if (!line || !currentDate) continue
    if (isBalanceLine(normalized)) {
      buffer = []
      continue
    }
    if (isNoise(normalized)) continue

    const tokens = findAmountTokens(line)
    if (tokens.length === 0) {
      buffer.push(line)
      if (buffer.length > 3) buffer.shift()
      continue
    }

    // Com dois valores na linha (Caixa), o primeiro é o lançamento e o último o saldo.
    const token = tokens[0]
    const name = cleanDescription([...buffer, line.slice(0, token.index)])
    buffer = []
    if (token.value === 0) continue

    let direction = token.suffixDirection ?? section ?? token.signDirection ?? directionFromText(name)
    const uncertain = direction === null
    if (!direction) direction = "out"

    out.push({
      id: `pdf-${out.length}`,
      date: currentDate,
      amount: direction === "in" ? token.value : -token.value,
      name: name || "Lançamento sem descrição",
      source: "pdf",
      uncertain: uncertain || undefined,
    })
  }

  return out
}

// ===== CSV =====

export type CsvColumnMap = {
  date: string
  name: string
  memo: string
  /** Coluna única de valor (com ou sem sinal). */
  amount: string
  /** Colunas separadas de débito/crédito — usadas quando não há coluna única. */
  debit: string
  credit: string
  /** Coluna que diz a direção: "D"/"C", "Entrada"/"Saída", "Débito"/"Crédito". */
  type: string
  /** Extrato de cartão (ex.: fatura Nubank "date,title,amount"): valor positivo = compra. */
  isCardStatement: boolean
}

export function detectCsvMapping(headers: string[]): CsvColumnMap {
  const normalized = headers.map((h) => normalizeText(h))
  const find = (pred: (h: string) => boolean) => {
    const i = normalized.findIndex(pred)
    return i >= 0 ? headers[i] : ""
  }
  const has = (h: string, keys: string[]) => keys.some((k) => h.includes(k))

  const type = find((h) => has(h, ["tipo", "deb/cred", "deb_cred", "debcred", "d/c", "natureza"]))
  const amount = find((h) => has(h, ["valor", "amount", "value", "vlr", "quantia"]) && !has(h, ["saldo"]))
  const debit = find((h) => has(h, ["debito", "saida"]) && !has(h, ["credito", "entrada", "tipo", "cred"]))
  const credit = find((h) => has(h, ["credito", "entrada"]) && !has(h, ["debito", "saida", "tipo", "deb"]))

  return {
    date: find((h) => has(h, ["data", "date"])),
    name: find((h) => has(h, ["descricao", "description", "historico", "lancamento", "title", "estabelecimento", "nome", "name"]) && !has(h, ["tipo"])),
    memo: find((h) => has(h, ["memo", "obs", "detalhe", "details", "identificador", "complemento"])),
    amount,
    debit: amount ? "" : debit,
    credit: amount ? "" : credit,
    type,
    isCardStatement: normalized.includes("title") && normalized.includes("amount"),
  }
}

export function hasUsableCsvMapping(map: CsvColumnMap): boolean {
  return Boolean(map.date && map.name && (map.amount || map.debit || map.credit))
}

function directionFromTypeCell(value: string): Direction | null {
  const t = normalizeText(value)
  if (!t) return null
  if (t === "d" || t.startsWith("deb") || t.startsWith("sai") || t.startsWith("desp")) return "out"
  if (t === "c" || t.startsWith("cred") || t.startsWith("ent") || t.startsWith("rec")) return "in"
  return null
}

export function buildTransactionsFromCsv(data: CsvData, map: CsvColumnMap): StatementTx[] {
  if (!hasUsableCsvMapping(map)) return []
  const col = (key: string) => (key ? data.headers.indexOf(key) : -1)
  const idx = {
    date: col(map.date),
    name: col(map.name),
    memo: col(map.memo),
    amount: col(map.amount),
    debit: col(map.debit),
    credit: col(map.credit),
    type: col(map.type),
  }
  const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "")

  const out: StatementTx[] = []
  data.rows.forEach((row, i) => {
    const date = parseDateCell(cell(row, idx.date))
    const name = cell(row, idx.name)
    if (!date || !name || isBalanceLine(normalizeText(name))) return

    let amount: number
    if (idx.amount >= 0) {
      amount = parseAmount(cell(row, idx.amount))
    } else {
      const debit = Math.abs(parseAmount(cell(row, idx.debit)) || 0)
      const credit = Math.abs(parseAmount(cell(row, idx.credit)) || 0)
      amount = credit - debit
    }
    if (Number.isNaN(amount) || amount === 0) return

    const typeDirection = directionFromTypeCell(cell(row, idx.type))
    if (typeDirection) amount = typeDirection === "in" ? Math.abs(amount) : -Math.abs(amount)
    if (map.isCardStatement) amount = -amount

    const memo = cell(row, idx.memo) || undefined
    const cardPayment = map.isCardStatement && amount > 0 && /pagamento/.test(normalizeText(name))
    out.push({
      id: `csv-${i}`,
      date,
      amount,
      name,
      memo,
      source: "csv",
      hint: cardPayment ? "card-credit" : undefined,
    })
  })
  return out
}
