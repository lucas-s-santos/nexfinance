"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { MONTHS } from "@/lib/format"

const supabase = createClient()

async function fetchIncomes(periodId: string) {
  const { data, error } = await supabase
    .from("incomes")
    .select("*")
    .eq("period_id", periodId)
    .order("date", { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchExpenses(periodId: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("period_id", periodId)
    .order("date", { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchBills(periodId: string) {
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("period_id", periodId)
    .order("due_date", { ascending: true })
  if (error) throw error
  return data ?? []
}

async function fetchReserves() {
  const { data, error } = await supabase
    .from("reserves_investments")
    .select("*")
    .order("date", { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchGoals() {
  const { data, error } = await supabase
    .from("financial_goals")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name")
  if (error) throw error
  return data ?? []
}

async function fetchBudgets(month: number, year: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
  if (error) throw error
  return data ?? []
}

async function fetchNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchAuditLogs() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchRecurringBills() {
  const { data, error } = await supabase
    .from("recurring_bills")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

type ForecastItem = {
  label: string
  month: number
  year: number
  income: number
  expense: number
}

function getNextMonths(startMonth: number, startYear: number, count: number) {
  const months: Array<{ month: number; year: number }> = []
  let m = startMonth
  let y = startYear
  for (let i = 0; i < count; i += 1) {
    months.push({ month: m, year: y })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months
}

async function fetchForecast(month: number, year: number): Promise<ForecastItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const upcoming = getNextMonths(month, year, 6)
  const { data: periods, error: periodError } = await supabase
    .from("financial_periods")
    .select("id, month, year")
    .eq("user_id", user.id)

  if (periodError) throw periodError

  const periodMap = new Map<string, { id: string; month: number; year: number }>()
  for (const p of periods ?? []) {
    periodMap.set(`${p.year}-${p.month}`, p)
  }

  const periodIds = upcoming
    .map((p) => periodMap.get(`${p.year}-${p.month}`)?.id)
    .filter(Boolean) as string[]

  const incomeTotals = new Map<string, number>()
  const expenseTotals = new Map<string, number>()

  if (periodIds.length > 0) {
    const { data: incomes, error: incomeError } = await supabase
      .from("incomes")
      .select("period_id, value")
      .in("period_id", periodIds)
    if (incomeError) throw incomeError
    for (const row of incomes ?? []) {
      const current = incomeTotals.get(row.period_id) ?? 0
      incomeTotals.set(row.period_id, current + Number(row.value))
    }

    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select("period_id, value")
      .in("period_id", periodIds)
    if (expenseError) throw expenseError
    for (const row of expenses ?? []) {
      const current = expenseTotals.get(row.period_id) ?? 0
      expenseTotals.set(row.period_id, current + Number(row.value))
    }
  }

  return upcoming.map((p) => {
    const period = periodMap.get(`${p.year}-${p.month}`)
    const income = period ? incomeTotals.get(period.id) ?? 0 : 0
    const expense = period ? expenseTotals.get(period.id) ?? 0 : 0
    return {
      label: `${MONTHS[p.month - 1].slice(0, 3)}/${p.year}`,
      month: p.month,
      year: p.year,
      income,
      expense,
    }
  })
}

export function useIncomes(periodId: string | null) {
  return useSWR(periodId ? ["incomes", periodId] : null, () =>
    fetchIncomes(periodId!)
  )
}

export function useExpenses(periodId: string | null) {
  return useSWR(periodId ? ["expenses", periodId] : null, () =>
    fetchExpenses(periodId!)
  )
}

export function useBills(periodId: string | null) {
  return useSWR(periodId ? ["bills", periodId] : null, () =>
    fetchBills(periodId!)
  )
}

export function useReserves() {
  return useSWR("reserves", fetchReserves)
}

export function useGoals() {
  return useSWR("goals", fetchGoals)
}

export function useCategories() {
  return useSWR("categories", fetchCategories)
}

export function useBudgets(month: number, year: number) {
  return useSWR(["budgets", month, year], () => fetchBudgets(month, year))
}

export function useNotifications() {
  return useSWR("notifications", fetchNotifications)
}

export function useAuditLogs() {
  return useSWR("audit_logs", fetchAuditLogs)
}

export function useRecurringBills() {
  return useSWR("recurring_bills", fetchRecurringBills)
}

export function useForecast(month: number, year: number) {
  return useSWR(["forecast", month, year], () => fetchForecast(month, year))
}
