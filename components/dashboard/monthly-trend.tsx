"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, MONTHS } from "@/lib/format"
import { TrendingUp, BarChart3, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { useMemo } from "react"

interface Income {
  id: string
  name: string
  value: number
  date: string
}

interface Expense {
  id: string
  name: string
  value: number
  date: string
}

interface MonthlyTrendProps {
  incomes: Income[]
  expenses: Expense[]
  showValues: boolean
  month: number
  year: number
}

export function MonthlyTrend({
  incomes,
  expenses,
  showValues,
  month,
  year,
}: MonthlyTrendProps) {
  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  const { totalIncome, totalExpenses, trend } = useMemo(() => {
    const income = incomes.reduce((sum, i) => sum + Number(i.value), 0)
    const expense = expenses.reduce((sum, e) => sum + Number(e.value), 0)
    const balance = income - expense

    return {
      totalIncome: income,
      totalExpenses: expense,
      trend: balance >= 0 ? "positive" : "negative",
    }
  }, [incomes, expenses])

  const balance = totalIncome - totalExpenses
  const isPositive = balance >= 0

  return (
    <Card className="glass-panel border-0 col-span-full">
      <CardContent className="p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Tendência Mensal</h3>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Entradas</p>
                <p className="text-2xl font-bold text-success flex items-center gap-2">
                  {renderValue(totalIncome)}
                  <ArrowUpRight className="h-5 w-5" />
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Saídas</p>
                <p className="text-2xl font-bold text-destructive flex items-center gap-2">
                  {renderValue(totalExpenses)}
                  <ArrowDownLeft className="h-5 w-5" />
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Saldo</p>
                <p className={`text-2xl font-bold flex items-center gap-2 ${isPositive ? "text-success" : "text-destructive"}`}>
                  {renderValue(Math.abs(balance))}
                  {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="space-y-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-2">Distribuição</p>
                <div className="flex gap-2 items-end justify-end">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-12 rounded-t-lg bg-gradient-to-t from-success/50 to-success"
                      style={{
                        height: `${(totalIncome / Math.max(totalIncome, totalExpenses)) * 120}px`,
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Receita</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className="w-12 rounded-t-lg bg-gradient-to-t from-destructive/50 to-destructive"
                      style={{
                        height: `${(totalExpenses / Math.max(totalIncome, totalExpenses)) * 120}px`,
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Despesa</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
