"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { motion } from "framer-motion"
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
  AreaChart,
  Area,
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
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
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
    label,
  }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color?: string }>
    label?: string
  }) => {
    if (active && payload?.length) {
      if (!showValues) {
        return (
          <div className="rounded-[1rem] border border-border/50 bg-background/80 backdrop-blur-md px-4 py-3 shadow-xl">
            <p className="text-sm font-medium text-muted-foreground">Valor oculto</p>
          </div>
        )
      }
      return (
        <div className="rounded-[1rem] border border-border/50 bg-background/80 backdrop-blur-md px-4 py-3 shadow-xl">
          {label && <p className="text-sm font-medium mb-2 text-foreground">{label}</p>}
          {payload.map((p) => (
            <div key={p.name} className="flex items-center gap-3 justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-sm text-muted-foreground">{p.name}</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(p.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {/* Area Chart: Daily balance */}
      <Card className="glass-panel border-0 md:col-span-2 lg:col-span-2 hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Evolução do Saldo Adicionado (Dia a Dia)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyBalanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyBalanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} dy={10} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={tickFormatter} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip content={customTooltip} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSaldo)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground/50">
              Nenhum dado para este período
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pie: Expenses by category */}
      <Card className="glass-panel border-0 md:col-span-2 lg:col-span-1 hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Despesas por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} cursor={{fill: 'transparent'}} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground/50">
              Nenhum dado para exibir
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bar: Forecast by month */}
      <Card className="glass-panel border-0 md:col-span-2 lg:col-span-3 hover:shadow-lg transition-all duration-300 mt-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Comparativo Receitas vs Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} dy={10} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={tickFormatter} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip content={customTooltip} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="income" name="Receitas" fill="url(#colorIncome)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Despesas" fill="url(#colorExpense)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground/50">
              Nenhum dado para exibir
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
