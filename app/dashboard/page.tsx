"use client"

import { usePeriod } from "@/lib/period-context"
import { useIncomes, useExpenses, useBills, useForecast, useBudgets, useCategories } from "@/lib/use-financial-data"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { MonthlyClosing } from "@/components/dashboard/monthly-closing"
import { BudgetAlerts } from "@/components/dashboard/budget-alerts"
import { MONTHS } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { month, year, periodId, isLoading: periodLoading } = usePeriod()
  const { data: incomes, isLoading: incomesLoading } = useIncomes(periodId)
  const { data: expenses, isLoading: expensesLoading } = useExpenses(periodId)
  const { data: bills, isLoading: billsLoading } = useBills(periodId)
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(month, year)
  const { data: categories = [] } = useCategories()
  const { data: forecastData = [], isLoading: forecastLoading } = useForecast(
    month,
    year
  )

  const isLoading =
    periodLoading || incomesLoading || expensesLoading || billsLoading || forecastLoading || budgetsLoading

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
  const voucherUsage = (expenses ?? [])
    .filter((e) => e.payment_method === "voucher")
    .reduce((sum, e) => sum + Number(e.value), 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {MONTHS[month - 1]} de {year}
        </p>
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
            voucherUsage={voucherUsage}
          />
          <BudgetAlerts
            budgets={budgets}
            expenses={expenses ?? []}
            periodId={periodId}
            categoryMap={new Map(categories.map((c) => [c.id, c.name]))}
          />
          <MonthlyClosing
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            bills={bills ?? []}
          />
          <DashboardCharts
            incomes={incomes ?? []}
            expenses={expenses ?? []}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            forecastData={forecastData}
          />
        </>
      )}
    </div>
  )
}
