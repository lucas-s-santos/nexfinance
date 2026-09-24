// Mesmo código do app (nexfinance-mobile/src/lib/statement/text.ts). Mantenha os dois iguais.
// Utilitários de texto e valores monetários para leitura de extratos.
// Módulo puro (sem React/Supabase) para poder ser testado com `npm test`.

export type Direction = "in" | "out"

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const termCache = new Map<string, RegExp>()

// Casa termos como palavra inteira — "etf" não casa com "netflix", "acao" não casa
// com "alimentacao". Termo terminado em "*" casa como prefixo ("invest*" → investimento).
function termRegex(term: string): RegExp {
  let re = termCache.get(term)
  if (!re) {
    const prefix = term.endsWith("*")
    const body = escapeRegex(prefix ? term.slice(0, -1) : term)
    re = new RegExp(`(?:^|[^a-z0-9])${body}${prefix ? "" : "(?![a-z0-9])"}`)
    termCache.set(term, re)
  }
  return re
}

/** `normalized` precisa ter passado por normalizeText. */
export function hasTerm(normalized: string, terms: readonly string[]): boolean {
  return terms.some((t) => termRegex(t).test(normalized))
}

export function countTerms(normalized: string, terms: readonly string[]): number {
  return terms.filter((t) => termRegex(t).test(normalized)).length
}

/**
 * Converte um valor textual em número. Aceita o formato brasileiro (1.234,56) e o
 * formato com ponto decimal (1234.56), sinais "-"/"−", parênteses contábeis "(150,00)"
 * e marcadores de direção "D"/"C"/"(-)"/"(+)" no fim.
 * Retorna NaN quando não há número.
 */
export function parseAmount(raw: string): number {
  let text = raw.trim()
  if (!text) return Number.NaN

  let negative = false
  if (/\(-\)\s*$|\s[dD]\s*$|^[dD]$/.test(text) || /^\(.*\)$/.test(text)) negative = true
  if (/[-−]/.test(text.replace(/\(-\)\s*$/, "").replace(/\d-\d/g, ""))) negative = true

  text = text.replace(/[^0-9,.]/g, "")
  if (!text) return Number.NaN

  let normalized: string
  if (text.includes(",")) {
    normalized = text.replace(/\./g, "").replace(",", ".")
  } else {
    const parts = text.split(".")
    normalized = parts.length > 2 ? `${parts.slice(0, -1).join("")}.${parts[parts.length - 1]}` : text
  }
  const value = Number.parseFloat(normalized)
  if (Number.isNaN(value)) return Number.NaN
  return negative ? -value : value
}

export type AmountToken = {
  /** Valor absoluto. */
  value: number
  /** Direção pelo sufixo D/C/(-)/(+) — o marcador mais confiável dos extratos. */
  suffixDirection: Direction | null
  /** Direção pelo sinal antes do número ("-150,00", "- R$ 150,00", "+ 20,00"). */
  signDirection: Direction | null
  /** Posição onde o token começa na linha. */
  index: number
}

// Valor no formato BR com 2 casas, com sinal colado (ou "- R$") antes e sufixo D/C/(+)/(-) depois.
const AMOUNT_TOKEN = /(?:^|\s)(?:([+\-−])\s?)?(?:R\$\s?)?([+\-−])?(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2})(?:\s?(\(\+\)|\(-\)|[DC](?![a-zA-Z])))?/g

export function findAmountTokens(line: string): AmountToken[] {
  const tokens: AmountToken[] = []
  for (const m of line.matchAll(AMOUNT_TOKEN)) {
    const sign = m[1] ?? m[2]
    const suffix = m[4]?.toUpperCase()
    const suffixDirection: Direction | null = suffix === "D" || suffix === "(-)" ? "out" : suffix === "C" || suffix === "(+)" ? "in" : null
    const signDirection: Direction | null = sign === "-" || sign === "−" ? "out" : sign === "+" ? "in" : null

    const value = Number.parseFloat(m[3].replace(/\./g, "").replace(",", "."))
    const index = (m.index ?? 0) + (m[0].startsWith(" ") || m[0].startsWith("\t") ? 1 : 0)
    tokens.push({ value, suffixDirection, signDirection, index })
  }
  return tokens
}

const MONTHS: Record<string, number> = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 }

function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function fullYear(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  return raw.length === 2 ? 2000 + Number(raw) : Number(raw)
}

const DATE_AT_START =
  /^(?:(\d{2})\/(\d{2})(?:\/(\d{4}|\d{2}))?|(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?(?:\s+(\d{4}))?)(?![\d/])/i

/** Data no início da linha (dd/mm, dd/mm/aa, dd/mm/aaaa, aaaa-mm-dd, "01 SET 2024"). */
export function matchDateAtStart(line: string, fallbackYear: number): { iso: string; rest: string } | null {
  const m = line.match(DATE_AT_START)
  if (!m) return null
  let iso: string | null
  if (m[1]) iso = isoDate(fullYear(m[3], fallbackYear), Number(m[2]), Number(m[1]))
  else if (m[4]) iso = isoDate(Number(m[4]), Number(m[5]), Number(m[6]))
  else iso = isoDate(fullYear(m[9], fallbackYear), MONTHS[m[8].toLowerCase()], Number(m[7]))
  if (!iso) return null
  return { iso, rest: line.slice(m[0].length).trim() }
}

/** Data isolada de uma célula de CSV. */
export function parseDateCell(value: string): string {
  const clean = value.trim()
  const m = clean.match(/^(\d{2})[/-](\d{2})[/-](\d{4}|\d{2})$/)
  if (m) return isoDate(fullYear(m[3], 2000), Number(m[2]), Number(m[1])) ?? ""
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) ?? ""
  const compact = clean.match(/^(20\d{2})(\d{2})(\d{2})$/) // aaaammdd (CSV da Caixa)
  if (compact) return isoDate(Number(compact[1]), Number(compact[2]), Number(compact[3])) ?? ""
  return ""
}
