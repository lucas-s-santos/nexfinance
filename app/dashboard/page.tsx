"use client"

import { useEffect, useMemo, useState } from "react"
import { usePeriod } from "@/lib/period-context"
import {
  useIncomes,
  useExpenses,
  useBills,
  useForecast,
  useCategories,
  useGoals,
  useReserves,
} from "@/lib/use-financial-data"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { MonthlyClosing } from "@/components/dashboard/monthly-closing"
import { formatCurrency, MONTHS } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { mutate } from "swr"

export default function DashboardPage() {
  const { month, year, periodId, isLoading: periodLoading } = usePeriod()
  const { data: incomes, isLoading: incomesLoading } = useIncomes(periodId)
  const { data: expenses, isLoading: expensesLoading } = useExpenses(periodId)
  const { data: bills, isLoading: billsLoading } = useBills(periodId)
  const { data: categories = [] } = useCategories()
  const { data: goals, isLoading: goalsLoading } = useGoals()
  const { data: reserves, isLoading: reservesLoading } = useReserves()
  const { data: forecastData = [], isLoading: forecastLoading } = useForecast(
    month,
    year
  )
  const [showValues, setShowValues] = useState(true)
  const storageKey = "dashboard_show_values"

  const isLoading =
    periodLoading || incomesLoading || expensesLoading || billsLoading || forecastLoading

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey)
    if (stored !== null) {
      setShowValues(stored === "true")
    }
  }, [])

  const toggleShowValues = () => {
    const next = !showValues
    setShowValues(next)
    window.localStorage.setItem(storageKey, String(next))
  }

  const notificationSeeds = useMemo(() => {
    if (!periodId) {
      return { rows: [], deletes: [] as Array<{ type: string; threshold: number }> }
    }
    if (!bills || !goals || !reserves) {
      return { rows: [], deletes: [] as Array<{ type: string; threshold: number }> }
    }

    const today = new Date()
    const toDate = (value: string) => {
      const [y, m, d] = value.split("-").map(Number)
      return new Date(y, m - 1, d)
    }
    const diffInDays = (target: Date) => {
      const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
      const end = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
      return Math.floor((end - start) / 86400000)
    }

    const dueSoon = bills.filter((bill) => {
      if (bill.is_paid) return false
      const diff = diffInDays(toDate(bill.due_date))
      return diff >= 0 && diff <= 3
    })
    const overdue = bills.filter((bill) => {
      if (bill.is_paid) return false
      return diffInDays(toDate(bill.due_date)) < 0
    })

    const goalsDueSoon = goals.filter((goal) => {
      if (!goal.deadline) return false
      const diff = diffInDays(new Date(goal.deadline))
      const target = Number(goal.target_value)
      const current = Number(goal.current_value)
      return current < target && diff >= 0 && diff <= 30
    })

    const goalsAchieved = goals.filter((goal) => {
      const target = Number(goal.target_value)
      const current = Number(goal.current_value)
      return target > 0 && current >= target
    })

    const recentReserveTotal = reserves
      .filter((reserve) => {
        const diff = diffInDays(toDate(reserve.date))
        return diff >= 0 && diff <= 7
      })
      .reduce((sum, reserve) => sum + Number(reserve.value), 0)

    const rows: Array<{
      type: string
      title: string
      message: string
      threshold: number
    }> = []
    const deletes: Array<{ type: string; threshold: number }> = []

    if (dueSoon.length > 0) {
      rows.push({
        type: "bill_due",
        title: "Contas vencendo em breve",
        message: `${dueSoon.length} conta(s) vencem nos proximos 3 dias.`,
        threshold: 3,
      })
    } else {
      deletes.push({ type: "bill_due", threshold: 3 })
    }

    if (overdue.length > 0) {
      rows.push({
        type: "bill_overdue",
        title: "Contas vencidas",
        message: `${overdue.length} conta(s) estao vencidas.`,
        threshold: 0,
      })
    } else {
      deletes.push({ type: "bill_overdue", threshold: 0 })
    }

    if (goalsDueSoon.length > 0) {
      rows.push({
        type: "goal_due",
        title: "Metas com prazo proximo",
        message: `${goalsDueSoon.length} meta(s) vencem nos proximos 30 dias.`,
        threshold: 30,
      })
    } else {
      deletes.push({ type: "goal_due", threshold: 30 })
    }

    if (goalsAchieved.length > 0) {
      rows.push({
        type: "goal_achieved",
        title: "Metas atingidas",
        message: `${goalsAchieved.length} meta(s) foram atingidas.`,
        threshold: 100,
      })
    } else {
      deletes.push({ type: "goal_achieved", threshold: 100 })
    }

    if (recentReserveTotal > 0) {
      rows.push({
        type: "reserve_update",
        title: "Reserva atualizada",
        message: `Voce adicionou ${formatCurrency(recentReserveTotal)} em reservas nos ultimos 7 dias.`,
        threshold: 7,
      })
    } else {
      deletes.push({ type: "reserve_update", threshold: 7 })
    }

    return { rows, deletes }
  }, [bills, goals, periodId, reserves])

  useEffect(() => {
    if (!periodId || billsLoading || goalsLoading || reservesLoading) return
    if (notificationSeeds.rows.length === 0 && notificationSeeds.deletes.length === 0) return

    const supabase = createClient()
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      if (notificationSeeds.rows.length > 0) {
        const rows = notificationSeeds.rows.map((row) => ({
          user_id: user.id,
          type: row.type,
          title: row.title,
          message: row.message,
          category_id: null,
          period_id: periodId,
          threshold: row.threshold,
        }))
        await supabase.from("notifications").upsert(rows, {
          onConflict: "user_id,type,category_id,period_id,threshold",
        })
      }

      if (notificationSeeds.deletes.length > 0) {
        await Promise.all(
          notificationSeeds.deletes.map((item) =>
            supabase
              .from("notifications")
              .delete()
              .eq("user_id", user.id)
              .eq("type", item.type)
              .eq("period_id", periodId)
              .eq("threshold", item.threshold)
          )
        )
      }

      mutate("notifications")
    }

    run()
  }, [
    billsLoading,
    goalsLoading,
    notificationSeeds,
    periodId,
    reservesLoading,
  ])

  const totalIncome = (incomes ?? []).reduce(
    (sum, i) => sum + Number(i.value),
    0
  )
  const totalExpenses = (expenses ?? []).reduce(
    (sum, e) => sum + Number(e.value),
    0
  )
  const creditUsage = (expenses ?? [])
    .filter((e) => e.payment_method === "credit")
    .reduce((sum, e) => sum + Number(e.value), 0)
  const debitUsage = (expenses ?? [])
    .filter((e) => e.payment_method === "debit")
    .reduce((sum, e) => sum + Number(e.value), 0)
  const isSamePeriod = (date: string) => {
    const [y, m] = date.split("-").map(Number)
    return y === year && m === month
  }
  const investmentUsage = (reserves ?? [])
    .filter((item) =>
      (item.type === "investment" || item.type === "market") &&
      isSamePeriod(item.date)
    )
    .reduce((sum, item) => sum + Number(item.value), 0)


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleShowValues}
          aria-label={showValues ? "Ocultar valores" : "Mostrar valores"}
        >
          {showValues ? (
            <EyeOff className="mr-2 h-4 w-4" />
          ) : (
            <Eye className="mr-2 h-4 w-4" />
          )}
          {showValues ? "Ocultar valores" : "Mostrar valores"}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={`skeleton-${
                // biome-ignore lint: index key
                i
              }`}
              className="h-28 rounded-xl"
            />
          ))}
        </div>
      ) : (
        <>
          <SummaryCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            creditUsage={creditUsage}
            debitUsage={debitUsage}
            investmentUsage={investmentUsage}
            showValues={showValues}
          />
          <MonthlyClosing
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            bills={bills ?? []}
            showValues={showValues}
          />
          <DashboardCharts
            incomes={incomes ?? []}
            expenses={expenses ?? []}
            forecastData={forecastData}
            categoryMap={new Map(categories.map((c) => [c.id, c.name]))}
            showValues={showValues}
          />
        </>
      )}
    </div>
  )
}
