"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
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
  LineChart,
  Line,
  CartesianGrid,
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
  forecastData: Array<{ label: string; income: number; expense: number }>
  categoryMap: Map<string, string>
  showValues: boolean
}

const COLORS = [
  "hsl(222, 62%, 52%)",
  "hsl(153, 47%, 40%)",
  "hsl(32, 85%, 55%)",
  "hsl(10, 65%, 55%)",
  "hsl(262, 45%, 55%)",
]

export function DashboardCharts({
  incomes,
  expenses,
  forecastData,
  categoryMap,
  showValues,
}: DashboardChartsProps) {
  // Line chart: daily balance
  const dailyMap = new Map<number, { income: number; expense: number }>()
  for (const inc of incomes) {
    const day = Number(inc.date.slice(8, 10))
    if (!Number.isFinite(day)) continue
    const existing = dailyMap.get(day) ?? { income: 0, expense: 0 }
    existing.income += Number(inc.value)
    dailyMap.set(day, existing)
  }
  for (const exp of expenses) {
    const day = Number(exp.date.slice(8, 10))
    if (!Number.isFinite(day)) continue
    const existing = dailyMap.get(day) ?? { income: 0, expense: 0 }
    existing.expense += Number(exp.value)
    dailyMap.set(day, existing)
  }

  const dailyBalanceData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a - b)
    .reduce(
      (acc, [day, values]) => {
        const last = acc.length > 0 ? acc[acc.length - 1].saldo : 0
        acc.push({
          day: `Dia ${String(day).padStart(2, "0")}`,
          saldo: last + values.income - values.expense,
        })
        return acc
      },
      [] as Array<{ day: string; saldo: number }>
    )

  // Pie chart: expenses by category
  const categoryTotals = new Map<string, number>()
  for (const exp of expenses) {
    const key = exp.category_id ?? "uncategorized"
    const current = categoryTotals.get(key) ?? 0
    categoryTotals.set(key, current + Number(exp.value))
  }
  const categoryData = Array.from(categoryTotals.entries()).map(([key, value]) => ({
    name: categoryMap.get(key) ?? "Sem categoria",
    value,
  }))

  const formatCompact = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)

  const tickFormatter = (value: number) =>
    showValues ? formatCompact(Number(value)) : "•"

  const customTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color?: string }>
  }) => {
    if (active && payload?.length) {
      if (!showValues) {
        return (
          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
            <p className="text-sm text-muted-foreground">Valor oculto</p>
          </div>
        )
      }
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
      {/* Line: Daily balance */}
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Linha de Saldo (Dia a Dia)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyBalanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dailyBalanceData}>
                <CartesianGrid strokeDasharray="4 4" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={tickFormatter} />
                <Tooltip content={customTooltip} />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="hsl(222, 62%, 52%)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado para exibir
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pie: Expenses by category */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Despesas por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {categoryData.map((_, index) => (
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
            <p className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado para exibir
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bar: Forecast by month */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Barras por Mes (Receitas vs Despesas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={forecastData}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={tickFormatter} />
                <Tooltip content={customTooltip} />
                <Legend />
                <Bar dataKey="income" name="Receitas" fill="hsl(153, 47%, 40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="hsl(10, 65%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              Nenhum dado para exibir
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
