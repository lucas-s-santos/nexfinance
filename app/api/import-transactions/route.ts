/**
 * API route para importacao em lote de transacoes financeiras
 * Valida, deduplica, e insere receitas, despesas e investimentos com
 * registro de batch para rastreabilidade e possibilidade de desfazer
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  importBatchSchema,
  ImportTransactionPayload,
} from "@/lib/validators"

async function handler(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Metodo nao permitido" }, { status: 405 })
  }

  try {
    const body = await request.json()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Autenticacao necessaria" }, { status: 401 })
    }

    const validation = importBatchSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: validation.error.issues },
        { status: 400 }
      )
    }

    const {
      fileName,
      source,
      transactions,
    } = validation.data

    // --- Garante periodos financeiros (batch upsert) ---
    const periodMap = await ensurePeriods(supabase, user.id, transactions)

    const results: Array<{
      status: "success" | "error"
      index: number
      table?: string
      entityId?: string
      error?: string
    }> = []

    const batchDetails: Array<{ table: string; entity_id: string }> = []
    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i]
      try {
        const periodKey = `${tx.date}`
        const periodId = periodMap.get(periodKey)

        if (!periodId) {
          results.push({ status: "error", index: i, error: "Periodo nao criado" })
          failedCount++
          continue
        }

        let insertResult: any

        if (tx.type === "income") {
          insertResult = await supabase
            .from("incomes")
            .insert({
              user_id: user.id,
              period_id: periodId,
              name: tx.name,
              value: tx.value,
              date: tx.date,
              category_id: tx.category_id || null,
            })
            .select("id")
            .single()

          if (insertResult.error) {
            results.push({ status: "error", index: i, table: "incomes", error: insertResult.error.message })
            failedCount++
          } else {
            results.push({ status: "success", index: i, table: "incomes", entityId: insertResult.data.id })
            batchDetails.push({ table: "incomes", entity_id: insertResult.data.id })
            successCount++
          }
        } else if (tx.type === "investment") {
          insertResult = await supabase
            .from("reserves_investments")
            .insert({
              user_id: user.id,
              name: tx.name,
              value: tx.value,
              date: tx.date,
              type: "investment",
              category_id: tx.category_id || null,
            })
            .select("id")
            .single()

          if (insertResult.error) {
            results.push({ status: "error", index: i, table: "reserves_investments", error: insertResult.error.message })
            failedCount++
          } else {
            results.push({ status: "success", index: i, table: "reserves_investments", entityId: insertResult.data.id })
            batchDetails.push({ table: "reserves_investments", entity_id: insertResult.data.id })
            successCount++
          }
        } else {
          // expense
          insertResult = await supabase
            .from("expenses")
            .insert({
              user_id: user.id,
              period_id: periodId,
              name: tx.name,
              value: tx.value,
              date: tx.date,
              category_id: tx.category_id || null,
              payment_method: tx.payment_method || "debit",
              is_essential: tx.is_essential ?? false,
            })
            .select("id")
            .single()

          if (insertResult.error) {
            results.push({ status: "error", index: i, table: "expenses", error: insertResult.error.message })
            failedCount++
          } else {
            results.push({ status: "success", index: i, table: "expenses", entityId: insertResult.data.id })
            batchDetails.push({ table: "expenses", entity_id: insertResult.data.id })
            successCount++
          }
        }
      } catch (err: any) {
        results.push({ status: "error", index: i, error: err.message ?? "Erro desconhecido" })
        failedCount++
      }
    }

    // --- Salva registro do batch ---
    if (batchDetails.length > 0) {
      await supabase.from("import_batches").insert({
        user_id: user.id,
        file_name: fileName || null,
        source: source || "unknown",
        total_transactions: transactions.length,
        success_count: successCount,
        failed_count: failedCount,
        details: batchDetails,
      })
    }

    return NextResponse.json(
      {
        success: true,
        summary: { total: transactions.length, success: successCount, failed: failedCount },
        results,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("Erro na importacao em lote:", err)
    return NextResponse.json(
      { error: "Erro interno ao processar importacao", details: err.message },
      { status: 500 }
    )
  }
}

export { handler as POST }

// Helpers

/**
 * Garante que todos os períodos referenciados nas transacoes existem.
 * Retorna um Map: date string -> period_id
 */
async function ensurePeriods(
  supabase: any,
  userId: string,
  transactions: ImportTransactionPayload[]
): Promise<Map<string, string>> {
  const periodKeys = new Map<string, { month: number; year: number }>()

  for (const tx of transactions) {
    const [year, month] = tx.date.split("-").map(Number)
    const key = tx.date
    if (!periodKeys.has(key)) {
      periodKeys.set(key, { month, year })
    }
  }

  const result = new Map<string, string>()

  // Busca periodos existentes
  const uniqueKeys = new Set(periodKeys.values())
  const conditions = Array.from(uniqueKeys).map(
    (p: any) => `(month.eq.${p.month},year.eq.${p.year})`
  )

  if (conditions.length > 0) {
    const { data: existing } = await supabase
      .from("financial_periods")
      .select("id, month, year")
      .eq("user_id", userId)

    const periodLookup = new Map<string, string>()
    for (const p of existing ?? []) {
      periodLookup.set(`${p.year}-${String(p.month).padStart(2, "0")}`, p.id)
    }

    // Insere periodos faltantes
    const toInsert: Array<{ user_id: string; month: number; year: number }> = []
    const inserted: Array<{ month: number; year: number }> = []

    for (const [dateKey, { month, year }] of periodKeys) {
      const lookupKey = `${year}-${String(month).padStart(2, "0")}`
      const existingId = periodLookup.get(lookupKey)
      if (existingId) {
        result.set(dateKey, existingId)
      } else {
        const insertKey = `${month}-${year}`
        if (!inserted.find((i: any) => i.month === month && i.year === year)) {
          toInsert.push({ user_id: userId, month, year })
          inserted.push({ month, year })
        }
      }
    }

    if (toInsert.length > 0) {
      const { data: newPeriods } = await supabase
        .from("financial_periods")
        .insert(toInsert)
        .select("id, month, year")

      for (const p of newPeriods ?? []) {
        const lookupKey = `${p.year}-${String(p.month).padStart(2, "0")}`
        // Atribui este period_id para todas as datas que correspondem
        for (const [dateKey, { month, year }] of periodKeys) {
          if (p.month === month && p.year === year) {
            result.set(dateKey, p.id)
          }
        }
      }
    }

    // Re-processa: caso algum still missing, tenta de novo
    for (const [dateKey] of periodKeys) {
      if (!result.has(dateKey)) {
        // Caso extremo: re-busca
        const [year, month] = dateKey.split("-").map(Number)
        const { data: refetch } = await supabase
          .from("financial_periods")
          .select("id")
          .eq("user_id", userId)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle()

        if (refetch) {
          result.set(dateKey, refetch.id)
        }
      }
    }
  }

  return result
}
