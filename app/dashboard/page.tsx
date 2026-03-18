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
  useBudgets,
} from "@/lib/use-financial-data"
import { calculateFinancialSummary } from "@/lib/sync-database"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { MonthlyClosing } from "@/components/dashboard/monthly-closing"
import { ExpensesBreakdown } from "@/components/dashboard/expenses-breakdown"
import { EssentialVsDiscretionary } from "@/components/dashboard/essential-vs-discretionary"
import { ExtraIncome } from "@/components/dashboard/extra-income"
import { HeroStats } from "@/components/dashboard/hero-stats"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { GoalsCard } from "@/components/dashboard/goals-card"
import { UpcomingBills } from "@/components/dashboard/upcoming-bills"
import { MonthlyTrend } from "@/components/dashboard/monthly-trend"
import { BudgetAlerts } from "@/components/dashboard/budget-alerts"
import { FinancialAlertsDisplay } from "@/components/dashboard/financial-alerts-display"
import { MONTHS } from "@/lib/format"
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
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(month, year)
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

  // Centralizar todos os cálculos usando uma única função
  const financialSummary = useMemo(() => {
    return calculateFinancialSummary(
      incomes ?? [],
      expenses ?? [],
      reserves ?? [],
      categories,
      month,
      year
    )
  }, [incomes, expenses, reserves, categories, month, year])

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  )

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
        message: `Voce adicionou ${require("@/lib/format").formatCurrency(recentReserveTotal)} em reservas nos ultimos 7 dias.`,
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


  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-10 py-4 lg:py-6">
        <div className="flex items-center justify-end gap-3">
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
          {showValues ? "Ocultar" : "Mostrar"}
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
          <section className="space-y-6">
            <HeroStats
              totalIncome={financialSummary.totalIncome}
              totalExpenses={financialSummary.totalExpenses}
              remaining={financialSummary.balance}
              showValues={showValues}
              month={month}
              year={year}
              creditUsage={financialSummary.creditUsage}
              debitUsage={financialSummary.debitUsage}
              investmentUsage={financialSummary.investmentUsage}
              reservedTotal={financialSummary.reservedTotal}
            />
            <FinancialAlertsDisplay
              expenses={expenses ?? []}
              budgets={budgets}
              bills={bills ?? []}
              goals={goals ?? []}
              reserves={reserves ?? []}
              categories={categories}
            />
          </section>

          <section className="space-y-4">
            <QuickActions />
          </section>

          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <GoalsCard goals={goals ?? []} showValues={showValues} />
              <UpcomingBills bills={bills ?? []} showValues={showValues} />
            </div>
          </section>

          <section className="space-y-6">
            <MonthlyTrend
              incomes={incomes ?? []}
              expenses={expenses ?? []}
              showValues={showValues}
              month={month}
              year={year}
            />
          </section>

          <section className="space-y-6 pt-6 border-t border-muted-foreground/10">
            <ExtraIncome
              incomes={incomes ?? []}
              categories={categories}
              salaryTotal={financialSummary.salaryTotal}
              showValues={showValues}
              month={month}
              year={year}
            />
            <EssentialVsDiscretionary
              expenses={expenses ?? []}
              income={financialSummary.totalIncome}
              showValues={showValues}
            />
            <ExpensesBreakdown
              expenses={expenses ?? []}
              categories={categories}
              showValues={showValues}
            />
          </section>

          <section className="space-y-6 pt-6 border-t border-muted-foreground/10">
            {!budgetsLoading && budgets.length > 0 && (
              <BudgetAlerts
                budgets={budgets}
                expenses={expenses ?? []}
                periodId={periodId}
                categoryMap={categoryMap}
              />
            )}
            <MonthlyClosing
              totalIncome={financialSummary.totalIncome}
              totalExpenses={financialSummary.totalExpenses}
              bills={bills ?? []}
              showValues={showValues}
            />
            <DashboardCharts
              incomes={incomes ?? []}
              expenses={expenses ?? []}
              forecastData={forecastData}
              categoryMap={categoryMap}
              showValues={showValues}
            />
          </section>
        </>
      )}
      </div>
    </div>
  )
}
