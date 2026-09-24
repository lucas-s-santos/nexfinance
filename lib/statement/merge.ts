// Mesmo código do app (nexfinance-mobile/src/lib/statement/merge.ts). Mantenha os dois iguais.
// O mesmo extrato em dois formatos (ex.: PDF e OFX do mesmo mês) seria importado em dobro.
// Dois arquivos são o mesmo extrato quando quase todos os lançamentos coincidem em data e
// valor — só as datas não bastam: extratos de contas diferentes cobrem o mesmo mês.
import type { StatementCheck, StatementTx } from "./types"

export type LoadedStatement = { name: string; source: "pdf" | "csv" | "ofx"; transactions: StatementTx[]; check?: StatementCheck }

export const SAME_STATEMENT_RATIO = 0.8

// PDF conferido com os totais do banco e com contas do titular reconhecidas > OFX (valores
// exatos) > PDF sem conferência > CSV.
function priority(s: LoadedStatement): number {
  if (s.source === "pdf" && s.check?.ok) return 0
  if (s.source === "ofx") return 1
  if (s.source === "pdf") return 2
  return 3
}

function sharedRatio(a: StatementTx[], b: StatementTx[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const counts = new Map<string, number>()
  for (const t of b) {
    const key = `${t.date}|${t.amount.toFixed(2)}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let shared = 0
  for (const t of a) {
    const key = `${t.date}|${t.amount.toFixed(2)}`
    const left = counts.get(key) ?? 0
    if (left > 0) {
      shared += 1
      counts.set(key, left - 1)
    }
  }
  return shared / Math.min(a.length, b.length)
}

/** Mantém um arquivo por extrato; os repetidos voltam em `skipped` com o arquivo que os cobre. */
export function dropDuplicateStatements<T extends LoadedStatement>(statements: T[]): { kept: T[]; skipped: { statement: T; coveredBy: T }[] } {
  const ordered = statements.map((s, i) => ({ s, i })).sort((x, y) => priority(x.s) - priority(y.s) || x.i - y.i)
  const kept: { s: T; i: number }[] = []
  const skipped: { statement: T; coveredBy: T }[] = []
  for (const item of ordered) {
    const cover = kept.find((k) => sharedRatio(item.s.transactions, k.s.transactions) >= SAME_STATEMENT_RATIO)
    if (cover) skipped.push({ statement: item.s, coveredBy: cover.s })
    else kept.push(item)
  }
  return { kept: kept.sort((a, b) => a.i - b.i).map((k) => k.s), skipped }
}
