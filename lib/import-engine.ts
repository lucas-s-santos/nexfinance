// Importação no site: usa o cliente Supabase do navegador sobre a lógica de lib/import-core.ts,
// a mesma do app (nexfinance-mobile/src/lib/import-engine.ts).
import { createClient } from "@/lib/supabase/client"
import { dateRange, fetchRowsInRange, findDuplicates, importRows, listBatches, undoBatch, type ImportBatch, type ImportRow } from "@/lib/import-core"
import type { StatementTx } from "@/lib/statement/types"

export type { ImportBatch, ImportRow } from "@/lib/import-core"

async function currentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await createClient().auth.getUser()
  return user?.id ?? null
}

/** Ids das movimentações que já estão no banco (mesmo valor, data próxima, nome parecido). */
export async function detectDuplicates(transactions: StatementTx[]): Promise<Set<string>> {
  const range = dateRange(transactions)
  const userId = await currentUserId()
  if (!range || !userId) return new Set()
  return findDuplicates(transactions, await fetchRowsInRange(createClient(), userId, range.min, range.max))
}

export async function importTransactions(rows: ImportRow[], fileName: string, source: StatementTx["source"]) {
  const userId = await currentUserId()
  if (!userId) throw new Error("Sessão expirada. Entre novamente para importar.")
  return importRows(createClient(), userId, rows, fileName, source)
}

export function listImportBatches(): Promise<ImportBatch[]> {
  return listBatches(createClient())
}

export function undoImportBatch(batch: ImportBatch): Promise<number> {
  return undoBatch(createClient(), batch)
}
