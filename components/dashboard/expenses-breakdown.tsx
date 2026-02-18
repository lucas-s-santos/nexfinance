"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, MONTHS } from "@/lib/format"
import { TrendingDown, Package, Utensils, ShoppingBag, Zap, Home, Smartphone } from "lucide-react"
import { useMemo } from "react"

interface Expense {
  id: string
  name: string
  value: number
  category_id: string | null
  is_essential: boolean
}

interface Category {
  id: string
  name: string
  type: string
}

interface ExpensesByCategotyProps {
  expenses: Expense[]
  categories: Category[]
  showValues: boolean
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Alimentação": <Utensils className="h-5 w-5" />,
  "Compras": <ShoppingBag className="h-5 w-5" />,
  "Utilidades": <Zap className="h-5 w-5" />,
  "Moradia": <Home className="h-5 w-5" />,
  "Celular": <Smartphone className="h-5 w-5" />,
  "Outros": <Package className="h-5 w-5" />,
}

export function ExpensesBreakdown({
  expenses,
  categories,
  showValues,
}: ExpensesByCategotyProps) {
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  )

  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {}

    expenses.forEach((expense) => {
      const categoryName = expense.category_id
        ? categoryMap.get(expense.category_id) || "Sem categoria"
        : "Sem categoria"

      grouped[categoryName] = (grouped[categoryName] || 0) + Number(expense.value)
    })

    return Object.entries(grouped)
      .map(([name, total]) => ({
        name,
        total,
        icon: CATEGORY_ICONS[name] || CATEGORY_ICONS["Outros"],
      }))
      .sort((a, b) => b.total - a.total)
  }, [expenses, categoryMap])

  const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.total, 0)

  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-destructive" />
          Gastos por Categoria
        </CardTitle>
        <CardDescription>
          Breakdown detalhado de suas despesas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expensesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma despesa registrada
            </p>
          ) : (
            expensesByCategory.map((category, index) => {
              const percentage = totalExpenses > 0 ? (category.total / totalExpenses) * 100 : 0
              return (
                <div key={`${category.name}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {category.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}% do total
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">
                      {renderValue(category.total)}
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-destructive h-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
          
          {totalExpenses > 0 && (
            <div className="pt-4 mt-4 border-t space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Total de Gastos</p>
                <p className="text-lg font-bold text-destructive">
                  {renderValue(totalExpenses)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {expensesByCategory.length} categoria{expensesByCategory.length !== 1 ? "s" : ""} com despesas
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
