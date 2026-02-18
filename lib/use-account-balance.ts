"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export type AccountBalance = {
  id: string
  account_name: string
  current_balance: number
  last_updated: string
}

async function fetchAccountBalance(accountName: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("account_balances")
    .select("*")
    .eq("user_id", user.id)
    .eq("account_name", accountName)
    .single()

  if (error) {
    // Se não existir, retornar um saldo padrão
    return { id: "", account_name: accountName, current_balance: 0, last_updated: new Date().toISOString() }
  }
  return data as AccountBalance
}

async function updateAccountBalance(accountName: string, balance: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Tentar atualizar, se não existir, criar
  const { data, error } = await supabase
    .from("account_balances")
    .upsert(
      {
        user_id: user.id,
        account_name: accountName,
        current_balance: balance,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "user_id,account_name" }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

async function recordBalanceHistory(
  accountId: string,
  balanceBefore: number,
  balanceAfter: number,
  reason: "import" | "manual_update" | "expense" | "income" | "investment",
  transactionId?: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase.from("balance_history").insert({
    user_id: user.id,
    account_id: accountId,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    transaction_id: transactionId || null,
    reason,
  })

  if (error) throw error
}

export function useAccountBalance(accountName: string) {
  const { data, error, isLoading, mutate } = useSWR(
    accountName ? ["account_balance", accountName] : null,
    () => fetchAccountBalance(accountName)
  )

  const updateBalance = async (newBalance: number) => {
    if (!data) return
    const oldBalance = data.current_balance
    const updated = await updateAccountBalance(accountName, newBalance)
    await recordBalanceHistory(
      updated.id,
      oldBalance,
      newBalance,
      "manual_update"
    )
    mutate()
  }

  return {
    balance: data,
    isLoading,
    error,
    updateBalance,
    refetch: mutate,
  }
}

export function useAllAccountBalances() {
  const { data, error, isLoading, mutate } = useSWR("account_balances", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data: balances, error } = await supabase
      .from("account_balances")
      .select("*")
      .eq("user_id", user.id)

    if (error) throw error
    return balances as AccountBalance[]
  })

  return {
    balances: data || [],
    isLoading,
    error,
    refetch: mutate,
  }
}

export function useAccountReconciliation(accountName: string, statementDate: string) {
  const { data, error, isLoading } = useSWR(
    accountName && statementDate ? ["reconciliation", accountName, statementDate] : null,
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await supabase
        .from("account_reconciliation")
        .select("*")
        .eq("user_id", user.id)
        .eq("account_name", accountName)
        .eq("statement_date", statementDate)
        .single()

      return data
    }
  )

  const reconcile = async (systemBalance: number, statementBalance: number, notes?: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { error } = await supabase.from("account_reconciliation").upsert({
      user_id: user.id,
      account_name: accountName,
      statement_date: statementDate,
      system_balance: systemBalance,
      statement_balance: statementBalance,
      difference: statementBalance - systemBalance,
      reconciled: true,
      notes: notes || null,
    })

    if (error) throw error
  }

  return {
    reconciliation: data,
    isLoading,
    error,
    reconcile,
  }
}
