"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, MONTHS } from "@/lib/format"
import { TrendingUp, BarChart3, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { useMemo } from "react"
import { motion } from "framer-motion"

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
  const maxVal = Math.max(totalIncome, totalExpenses) || 1

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-panel border-0 col-span-full hover:shadow-lg transition-shadow">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-6 w-full lg:w-3/4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 shadow-sm">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Tendência Mensal</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-4 rounded-2xl bg-success/5 border border-success/10 hover:bg-success/10 transition-colors">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Entradas</p>
                  <p className="text-2xl font-bold text-success flex items-center gap-2">
                    {renderValue(totalIncome)}
                    <ArrowUpRight className="h-5 w-5" />
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-colors">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Saídas</p>
                  <p className="text-2xl font-bold text-destructive flex items-center gap-2">
                    {renderValue(totalExpenses)}
                    <ArrowDownLeft className="h-5 w-5" />
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border transition-colors ${isPositive ? "bg-primary/5 border-primary/10 hover:bg-primary/10" : "bg-destructive/5 border-destructive/10 hover:bg-destructive/10"}`}>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Balanço do Mês</p>
                  <p className={`text-2xl font-bold flex items-center gap-2 ${isPositive ? "text-primary" : "text-destructive"}`}>
                    {renderValue(Math.abs(balance))}
                    {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex w-1/4 justify-end">
              <div className="space-y-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground mb-4">Proporção</p>
                  <div className="flex gap-4 items-end justify-end">
                    <div className="flex flex-col items-center group">
                      <div className="w-14 rounded-2xl bg-muted/30 flex items-end justify-center overflow-hidden">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(totalIncome / maxVal) * 120}px` }}
                          transition={{ duration: 1, type: "spring", bounce: 0.4 }}
                          className="w-full rounded-2xl bg-gradient-to-t from-success/50 to-success"
                        />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground mt-2 group-hover:text-success transition-colors">Receita</p>
                    </div>
                    <div className="flex flex-col items-center group">
                      <div className="w-14 rounded-2xl bg-muted/30 flex items-end justify-center overflow-hidden">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(totalExpenses / maxVal) * 120}px` }}
                          transition={{ duration: 1, type: "spring", bounce: 0.4, delay: 0.1 }}
                          className="w-full rounded-2xl bg-gradient-to-t from-destructive/50 to-destructive"
                        />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground mt-2 group-hover:text-destructive transition-colors">Despesa</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
