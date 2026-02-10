"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, PAYMENT_METHODS } from "@/lib/format"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface Expense {
  id: string
  value: number
  date: string
  payment_method: string
  category_id: string | null
}

interface Income {
  id: string
  value: number
  date: string
}

interface DashboardChartsProps {
  incomes: Income[]
  expenses: Expense[]
  totalIncome: number
  totalExpenses: number
  forecastData: Array<{ label: string; income: number; expense: number }>
}

const COLORS = [
  "hsl(210, 90%, 45%)",
  "hsl(160, 70%, 42%)",
  "hsl(35, 92%, 50%)",
  "hsl(0, 75%, 55%)",
  "hsl(270, 60%, 55%)",
]

export function DashboardCharts({
  incomes,
  expenses,
  totalIncome,
  totalExpenses,
  forecastData,
}: DashboardChartsProps) {
  // Donut chart: remaining to spend
  const remaining = Math.max(totalIncome - totalExpenses, 0)
  const donutData = [
    { name: "Gasto", value: totalExpenses },
    { name: "Restante", value: remaining },
  ]

  // Bar chart: cash flow by date
  const cashFlowMap = new Map<string, { income: number; expense: number }>()
  for (const inc of incomes) {
    const day = inc.date.slice(8, 10)
    const existing = cashFlowMap.get(day) ?? { income: 0, expense: 0 }
    existing.income += Number(inc.value)
    cashFlowMap.set(day, existing)
  }
  for (const exp of expenses) {
    const day = exp.date.slice(8, 10)
    const existing = cashFlowMap.get(day) ?? { income: 0, expense: 0 }
    existing.expense += Number(exp.value)
    cashFlowMap.set(day, existing)
  }
  const cashFlowData = Array.from(cashFlowMap.entries())
    .map(([day, vals]) => ({
      day: `Dia ${day}`,
      Receitas: vals.income,
      Despesas: vals.expense,
    }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // Pie chart: expenses by payment method
  const methodMap = new Map<string, number>()
  for (const exp of expenses) {
    const current = methodMap.get(exp.payment_method) ?? 0
    methodMap.set(exp.payment_method, current + Number(exp.value))
  }
  const methodData = Array.from(methodMap.entries()).map(([method, value]) => ({
    name: PAYMENT_METHODS[method] ?? method,
    value,
  }))

  const customTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color?: string }>
  }) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
          {payload.map((p) => (
            <p key={p.name} className="text-sm text-card-foreground">
              <span style={{ color: p.color }}>{p.name}</span>:{" "}
              {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Donut: Remaining to spend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Disponivel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  <Cell fill="hsl(0, 75%, 55%)" />
                  <Cell fill="hsl(160, 70%, 42%)" />
                </Pie>
                <Tooltip content={customTooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar: Cash flow by day */}
      <Card className="md:col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Fluxo de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cashFlowData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={customTooltip} />
                <Legend />
                <Bar dataKey="Receitas" fill="hsl(160, 70%, 42%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="hsl(0, 75%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado para exibir
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pie: Expenses by payment method */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Despesas por Metodo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {methodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {methodData.map((_, index) => (
                    <Cell
                      key={`cell-${
                        // biome-ignore lint: index needed
                        index
                      }`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado para exibir
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bar: Forecast (next months) */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Projecao de Receitas vs Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={forecastData}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={customTooltip} />
                <Legend />
                <Bar dataKey="income" name="Receitas" fill="hsl(160, 70%, 42%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="hsl(0, 75%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado para exibir
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
