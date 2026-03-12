"use client"

import { useEffect } from "react"
import { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"

/**
 * Hook para sincronizar dados com o Supabase em tempo real
 * Usa SWR mutate() para atualizar cache sem recarregar página
 * 🔧 OTIMIZAÇÃO: Melhora drasticamente a UX ao evitar recarga completa
 */
export function useSyncWithDatabase() {
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to real-time changes
    const subscriptions = [
      supabase
        .channel("expenses-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "expenses" },
          () => {
            // ✅ Revalidate apenas o cache de expenses, não a página toda
            mutate((key) => {
              return typeof key === "string" && key.includes("expenses")
            })
          }
        )
        .subscribe(),

      supabase
        .channel("incomes-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "incomes" },
          () => {
            mutate((key) => {
              return typeof key === "string" && key.includes("incomes")
            })
          }
        )
        .subscribe(),

      supabase
        .channel("bills-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bills" },
          () => {
            mutate((key) => {
              return typeof key === "string" && key.includes("bills")
            })
          }
        )
        .subscribe(),

      // Sincronizar notificações quando há mudança
      supabase
        .channel("notifications-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          () => {
            mutate((key) => {
              return typeof key === "string" && key.includes("notifications")
            })
          }
        )
        .subscribe(),
    ]

    return () => {
      subscriptions.forEach((sub) => {
        supabase.removeChannel(sub)
      })
    }
  }, [])
}

/**
 * Função auxiliar para calcular resumo financeiro
 * Garante que todos os cálculos usem os mesmos valores do banco
 */
export interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  balance: number
  creditUsage: number
  debitUsage: number
  investmentUsage: number
  salaryTotal: number
  essentialExpenses: number
  discretionaryExpenses: number
}

export function calculateFinancialSummary(
  incomes: any[] = [],
  expenses: any[] = [],
  reserves: any[] = [],
  categories: any[] = [],
  month: number,
  year: number
): FinancialSummary {
  // Income totals
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.value || 0), 0)

  // Expense totals
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.value || 0), 0)

  // Payment method breakdown
  const creditUsage = expenses
    .filter((e) => e.payment_method === "credit")
    .reduce((sum, e) => sum + Number(e.value || 0), 0)

  const debitUsage = expenses
    .filter((e) => e.payment_method === "debit")
    .reduce((sum, e) => sum + Number(e.value || 0), 0)

  // Essential vs Discretionary
  const essentialExpenses = expenses
    .filter((e) => e.is_essential)
    .reduce((sum, e) => sum + Number(e.value || 0), 0)

  const discretionaryExpenses = expenses
    .filter((e) => !e.is_essential)
    .reduce((sum, e) => sum + Number(e.value || 0), 0)

  // Investments in current period
  const isSamePeriod = (date: string) => {
    const [y, m] = date.split("-").map(Number)
    return y === year && m === month
  }

  const investmentUsage = reserves
    .filter(
      (item) =>
        (item.type === "investment" || item.type === "market") &&
        isSamePeriod(item.date)
    )
    .reduce((sum, item) => sum + Number(item.value || 0), 0)

  // Salary
  const salaryCategories = categories
    .filter(
      (c) =>
        c.name?.toLowerCase().includes("salário") ||
        c.name?.toLowerCase().includes("salario") ||
        c.name?.toLowerCase().includes("renda principal")
    )
    .map((c) => c.id)

  const salaryTotal = incomes
    .filter((income) => salaryCategories.includes(income.category_id))
    .reduce((sum, income) => sum + Number(income.value || 0), 0)

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    creditUsage,
    debitUsage,
    investmentUsage,
    salaryTotal,
    essentialExpenses,
    discretionaryExpenses,
  }
}
