// Mesmo código do app (nexfinance-mobile/src/lib/import-core.ts). Mantenha os dois iguais.
// Gravação de extratos no Supabase — deduplicação, inserção em lote e desfazer.
// Recebe o cliente como parâmetro e só usa imports relativos: o app (lib/import-engine.ts)
// e o script de terminal (scripts/import-statements.ts) usam exatamente o mesmo código.
import type { SupabaseClient } from "@supabase/supabase-js"
import { investmentValueFromStatement, resolvePaymentMethod, type TxKind } from "./statement/rules"
import { normalizeText } from "./statement/text"
import type { StatementTx } from "./statement/types"

export type Table = "incomes" | "expenses" | "reserves_investments"
export const TABLES: Table[] = ["incomes", "expenses", "reserves_investments"]

// ===== Deduplicação (regra estrita + aproximada, igual ao web) =====

export type ExistingRow = {
  table: Table
  id: string
  date: string
  value: number
  name: string
  created_at?: string | null
  category_id?: string | null
  receipt_url?: string | null
  is_essential?: boolean | null
  bill_id?: string | null
  type?: string | null
}

// Paginado: o Supabase devolve no máximo 1.000 linhas por consulta. "*" porque nem todo banco
// tem todas as colunas opcionais (receipt_url, bill_id…) e pedir uma que não existe dá erro.
const PAGE = 1000

async function fetchTable(db: SupabaseClient, userId: string, table: Table, from?: string, to?: string): Promise<ExistingRow[]> {
  const out: ExistingRow[] = []
  for (let offset = 0; ; offset += PAGE) {
    let query = db.from(table).select("*").eq("user_id", userId)
    if (from) query = query.gte("date", from)
    if (to) query = query.lte("date", to)
    const { data, error } = await query.order("id").range(offset, offset + PAGE - 1)
    if (error) throw error
    for (const row of data ?? []) out.push({ ...row, table })
    if (!data || data.length < PAGE) return out
  }
}

export async function fetchRowsInRange(db: SupabaseClient, userId: string, minDate: string, maxDate: string): Promise<ExistingRow[]> {
  const pad = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00`)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }
  const from = pad(minDate, -2)
  const to = pad(maxDate, 2)
  return (await Promise.all(TABLES.map((table) => fetchTable(db, userId, table, from, to)))).flat()
}

/** Todas as receitas, despesas e investimentos do usuário. */
export async function fetchAllRows(db: SupabaseClient, userId: string): Promise<ExistingRow[]> {
  return (await Promise.all(TABLES.map((table) => fetchTable(db, userId, table)))).flat()
}

export type DeletedRow = ExistingRow & { deleted_at: string | null }

/**
 * Linhas apagadas entre `minDate` e `maxDate`, como estavam antes de sair: o gatilho de auditoria
 * do banco guarda a linha inteira em audit_logs. Sem acesso à auditoria, volta vazio.
 */
export async function fetchDeletedRows(db: SupabaseClient, userId: string, minDate: string, maxDate: string): Promise<DeletedRow[]> {
  const out: DeletedRow[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db
      .from("audit_logs")
      .select("id, entity_type, changes, created_at")
      .eq("user_id", userId)
      .eq("action", "delete")
      .in("entity_type", TABLES)
      .order("id")
      .range(offset, offset + PAGE - 1)
    if (error) return out
    for (const log of data ?? []) {
      const old = (log.changes as { old?: Omit<ExistingRow, "table"> } | null)?.old
      if (!old || typeof old.date !== "string" || old.date < minDate || old.date > maxDate) continue
      out.push({ ...old, table: log.entity_type as Table, deleted_at: (log.created_at as string | null) ?? null })
    }
    if (!data || data.length < PAGE) return out
  }
}

/** Ids das movimentações que já existem entre `existing` (mesmo valor, data próxima, nome parecido). */
export function findDuplicates(transactions: StatementTx[], existing: ExistingRow[]): Set<string> {
  const cleanName = (n: string) => normalizeText(n).replace(/[^a-z0-9]/g, "")
  // Valores comparados em módulo: resgates ficam negativos no banco.
  const rows = existing.map((row) => ({
    time: new Date(`${row.date}T00:00:00`).getTime(),
    date: row.date,
    value: Math.abs(Number(row.value)),
    name: cleanName(row.name),
  }))

  const duplicates = new Set<string>()
  for (const tx of transactions) {
    const value = Math.abs(tx.amount)
    const name = cleanName(tx.name)
    const time = new Date(`${tx.date}T00:00:00`).getTime()
    const match = rows.some(
      (ex) =>
        ex.value === value &&
        ((ex.date === tx.date && ex.name.slice(0, 12) === name.slice(0, 12)) ||
          (Math.abs(ex.time - time) <= 2 * 86400000 && ex.name.slice(0, 8) === name.slice(0, 8)))
    )
    if (match) duplicates.add(tx.id)
  }
  return duplicates
}

export function dateRange(transactions: { date: string }[]): { min: string; max: string } | null {
  if (transactions.length === 0) return null
  let min = transactions[0].date
  let max = transactions[0].date
  for (const tx of transactions) {
    if (tx.date < min) min = tx.date
    if (tx.date > max) max = tx.date
  }
  return { min, max }
}

// ===== Substituição de um período já importado =====

/** Mesmo lançamento = mesma data e mesmo valor absoluto (resgates ficam negativos no banco). */
export function movementKey(date: string, value: number): string {
  return `${date}|${Math.abs(Number(value)).toFixed(2)}`
}

/**
 * Casa cada movimentação do extrato com no máximo uma linha do banco de mesma data e valor, de
 * preferência na tabela em que ela vai ser gravada. O nome não entra: importações antigas
 * gravaram nomes diferentes ("Transferência enviada pelo Pix - IFOOD…" × "Pix para iFood").
 */
export function pairMovements<T extends { date: string; amount: number; table?: Table }>(
  transactions: T[],
  rows: ExistingRow[]
): { tx: T; row: ExistingRow }[] {
  const free = new Map<string, ExistingRow[]>()
  for (const row of rows) {
    const key = movementKey(row.date, row.value)
    free.set(key, [...(free.get(key) ?? []), row])
  }
  const pairs: { tx: T; row: ExistingRow }[] = []
  const take = (tx: T, anyTable: boolean) => {
    const candidates = free.get(movementKey(tx.date, tx.amount)) ?? []
    const index = candidates.findIndex((row) => anyTable || row.table === tx.table)
    if (index < 0) return false
    pairs.push({ tx, row: candidates.splice(index, 1)[0] })
    return true
  }
  // Primeiro a linha que já está na tabela certa; depois qualquer uma (importação antiga que classificou errado).
  const pending = transactions.filter((tx) => !take(tx, false))
  for (const tx of pending) take(tx, true)
  return pairs
}

/** O que a pessoa pode ter ajustado num lançamento e passa para a versão nova dele. */
export type Carried = { category_id?: string; receipt_url?: string; is_essential?: boolean; bill_id?: string; type?: string }

/**
 * Para cada movimentação que vai ser gravada, junta os ajustes das linhas antigas dela (mesma
 * tabela, data e valor): categoria, comprovante, "essencial", conta paga vinculada e tipo de
 * reserva. `oldRows` vem em ordem de preferência — a primeira linha que tiver o campo ganha.
 * Uma conta paga só se vincula a uma despesa (índice único em expenses.bill_id).
 */
export function carryOver<T extends { date: string; amount: number; table: Table }>(
  transactions: T[],
  oldRows: ExistingRow[],
  options: { isValidCategory: (id: string) => boolean; freeBills: Set<string> }
): Map<T, Carried> {
  const byKey = new Map<string, ExistingRow[]>()
  for (const row of oldRows) {
    const key = `${row.table}|${movementKey(row.date, row.value)}`
    byKey.set(key, [...(byKey.get(key) ?? []), row])
  }
  const freeBills = new Set(options.freeBills)
  const result = new Map<T, Carried>()
  for (const tx of transactions) {
    const rows = byKey.get(`${tx.table}|${movementKey(tx.date, tx.amount)}`)
    if (!rows) continue
    const carried: Carried = {}
    const category = rows.find((r) => r.category_id && options.isValidCategory(r.category_id))?.category_id
    if (category) carried.category_id = category
    if (tx.table !== "reserves_investments") {
      const receipt = rows.find((r) => r.receipt_url)?.receipt_url
      if (receipt) carried.receipt_url = receipt
    }
    if (tx.table === "expenses") {
      if (rows.some((r) => r.is_essential)) carried.is_essential = true
      const bill = rows.find((r) => r.bill_id && freeBills.has(r.bill_id))?.bill_id
      if (bill) {
        carried.bill_id = bill
        freeBills.delete(bill)
      }
    }
    if (tx.table === "reserves_investments") {
      const type = rows.find((r) => r.type && r.type !== "investment")?.type
      if (type) carried.type = type
    }
    if (Object.keys(carried).length > 0) result.set(tx, carried)
  }
  return result
}

export async function deleteRows(db: SupabaseClient, rows: { table: Table; id: string }[]): Promise<number> {
  let removed = 0
  for (const table of TABLES) {
    const ids = rows.filter((r) => r.table === table).map((r) => r.id)
    for (let i = 0; i < ids.length; i += 100) {
      const { error, count } = await db.from(table).delete({ count: "exact" }).in("id", ids.slice(i, i + 100))
      if (error) throw error
      removed += count ?? 0
    }
  }
  return removed
}

// ===== Importação em lote =====

export type ImportRow = {
  name: string
  /** Valor com sinal na visão da conta: positivo = entrou, negativo = saiu. */
  amount: number
  date: string
  kind: TxKind
  category_id: string | null
  /** Forma de pagamento informada pelo extrato (senão é deduzida pelo nome). */
  paymentMethod?: "pix" | "debit"
  /** Ajustes da versão antiga deste lançamento (ver carryOver). */
  carried?: Carried
}

async function ensurePeriods(db: SupabaseClient, userId: string, rows: ImportRow[]): Promise<(date: string) => string | null> {
  const needed = new Map<string, { month: number; year: number }>()
  for (const tx of rows) {
    if (tx.kind === "investment") continue
    const [year, month] = tx.date.split("-").map(Number)
    needed.set(`${year}-${month}`, { month, year })
  }

  const { data: existingPeriods } = await db.from("financial_periods").select("id, month, year").eq("user_id", userId)
  const lookup = new Map<string, string>()
  for (const p of existingPeriods ?? []) lookup.set(`${p.year}-${p.month}`, p.id)

  const toInsert = [...needed.entries()].filter(([key]) => !lookup.has(key)).map(([, p]) => ({ user_id: userId, ...p }))
  if (toInsert.length > 0) {
    const { data: created } = await db.from("financial_periods").insert(toInsert).select("id, month, year")
    for (const p of created ?? []) lookup.set(`${p.year}-${p.month}`, p.id)
  }

  return (date: string) => {
    const [y, m] = date.split("-").map(Number)
    return lookup.get(`${y}-${m}`) ?? null
  }
}

type DbRecord = Record<string, unknown>
/** `plain` é a linha sem os ajustes herdados, para gravar mesmo se um deles não valer mais. */
type MappedRow = { table: Table; record: DbRecord; plain: DbRecord }

function toRecord(tx: ImportRow, userId: string, periodFor: (date: string) => string | null): MappedRow | null {
  const base = { user_id: userId, name: tx.name, date: tx.date }
  const withCarried = (table: Table, plain: DbRecord): MappedRow => ({ table, plain, record: tx.carried ? { ...plain, ...tx.carried } : plain })
  if (tx.kind === "investment") {
    // Aplicação (saiu da conta) grava positivo; resgate (voltou para a conta) grava negativo.
    return withCarried("reserves_investments", { ...base, value: investmentValueFromStatement(tx.amount), type: "investment" })
  }
  const periodId = periodFor(tx.date)
  if (!periodId) return null
  if (tx.kind === "income") {
    return withCarried("incomes", { ...base, value: Math.abs(tx.amount), period_id: periodId, category_id: tx.category_id })
  }
  return withCarried("expenses", {
    ...base,
    value: Math.abs(tx.amount),
    period_id: periodId,
    category_id: tx.category_id,
    payment_method: tx.paymentMethod ?? resolvePaymentMethod(tx),
    is_essential: false,
  })
}

// Insere em lote por tabela; se o lote falhar, tenta linha a linha para salvar o que for válido —
// e, se um ajuste herdado impedir a gravação (conta ou categoria que não existe mais), grava a
// linha sem ele: a movimentação não pode ficar de fora.
async function insertMany(db: SupabaseClient, table: Table, rows: MappedRow[]): Promise<{ ids: string[]; failed: number }> {
  if (rows.length === 0) return { ids: [], failed: 0 }
  const { data, error } = await db.from(table).insert(rows.map((r) => r.record)).select("id")
  if (!error) return { ids: (data ?? []).map((r) => r.id as string), failed: 0 }

  const insertOne = (record: DbRecord) => db.from(table).insert(record).select("id").single()
  const ids: string[] = []
  let failed = 0
  for (const { record, plain } of rows) {
    let result = await insertOne(record)
    if ((result.error || !result.data) && record !== plain) result = await insertOne(plain)
    if (result.error || !result.data) failed += 1
    else ids.push(result.data.id as string)
  }
  return { ids, failed }
}

/** Grava as movimentações e registra o lote em import_batches (para poder desfazer depois). */
export async function importRows(db: SupabaseClient, userId: string, rows: ImportRow[], fileName: string, source: StatementTx["source"]) {
  const periodFor = await ensurePeriods(db, userId, rows)

  const byTable: Record<Table, MappedRow[]> = { incomes: [], expenses: [], reserves_investments: [] }
  let failed = 0
  for (const tx of rows) {
    const mapped = toRecord(tx, userId, periodFor)
    if (mapped) byTable[mapped.table].push(mapped)
    else failed += 1
  }

  let success = 0
  const batchDetails: { table: Table; entity_id: string }[] = []
  for (const table of TABLES) {
    const result = await insertMany(db, table, byTable[table])
    success += result.ids.length
    failed += result.failed
    for (const id of result.ids) batchDetails.push({ table, entity_id: id })
  }

  if (batchDetails.length > 0) {
    await db.from("import_batches").insert({
      user_id: userId,
      file_name: fileName || null,
      source,
      total_transactions: rows.length,
      success_count: success,
      failed_count: failed,
      details: batchDetails,
    })
  }

  return { success, failed }
}

// ===== Histórico de importações =====

export type ImportBatch = {
  id: string
  file_name: string | null
  source: string | null
  total_transactions: number
  success_count: number
  failed_count: number
  imported_at: string
  details: { table: string; entity_id: string }[] | null
}

export async function listBatches(db: SupabaseClient): Promise<ImportBatch[]> {
  const { data, error } = await db
    .from("import_batches")
    .select("id, file_name, source, total_transactions, success_count, failed_count, imported_at, details")
    .order("imported_at", { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []) as ImportBatch[]
}

/** Ids gravados por um lote, por tabela. */
export function batchEntityIds(batch: ImportBatch): Map<Table, string[]> {
  const byTable = new Map<Table, string[]>()
  for (const detail of batch.details ?? []) {
    const table = detail.table as Table
    if (!TABLES.includes(table) || !detail.entity_id) continue
    byTable.set(table, [...(byTable.get(table) ?? []), detail.entity_id])
  }
  return byTable
}

// Desfaz uma importação apagando exatamente o que ela gravou. Feito pelo cliente — e não pela
// função undo_import_batch do banco, que roda como SECURITY DEFINER sem conferir o dono do
// lote: aqui as regras de acesso (RLS) garantem que só registros do próprio usuário saem.
export async function undoBatch(db: SupabaseClient, batch: ImportBatch): Promise<number> {
  let removed = 0
  for (const [table, ids] of batchEntityIds(batch)) {
    for (let i = 0; i < ids.length; i += 100) {
      const { error, count } = await db.from(table).delete({ count: "exact" }).in("id", ids.slice(i, i + 100))
      if (error) throw error
      removed += count ?? 0
    }
  }

  const { error } = await db.from("import_batches").delete().eq("id", batch.id)
  if (error) throw error
  return removed
}
