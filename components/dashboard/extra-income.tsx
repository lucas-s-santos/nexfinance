"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, MONTHS } from "@/lib/format"
import { TrendingUp, Gift, Briefcase, Award } from "lucide-react"
import { useMemo } from "react"

interface Income {
  id: string
  name: string
  value: number
  category_id: string | null
  date: string
}

interface Category {
  id: string
  name: string
  type: string
}

interface ExtraIncomeProps {
  incomes: Income[]
  categories: Category[]
  salaryTotal: number
  showValues: boolean
  month: number
  year: number
}

const INCOME_ICONS: Record<string, React.ReactNode> = {
  "Freelancer": <Briefcase className="h-5 w-5" />,
  "Bônus": <Gift className="h-5 w-5" />,
  "Prêmio": <Award className="h-5 w-5" />,
  "Investimento": <TrendingUp className="h-5 w-5" />,
  "Outro": <Gift className="h-5 w-5" />,
}

export function ExtraIncome({
  incomes,
  categories,
  salaryTotal,
  showValues,
  month,
  year,
}: ExtraIncomeProps) {
  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  )

  const { extraIncome, extraIncomeBreakdown, totalIncome } = useMemo(() => {
    const extra: Record<string, number> = {}
    let extraTotal = 0
    let total = 0

    incomes.forEach((income) => {
      const categoryName = income.category_id
        ? categoryMap.get(income.category_id) || "Outro"
        : "Outro"

      total += Number(income.value)

      // Considerar como "extra" qualquer coisa que não seja salário
      if (categoryName.toLowerCase() !== "salário" && !categoryName.toLowerCase().includes("renda principal")) {
        extra[categoryName] = (extra[categoryName] || 0) + Number(income.value)
        extraTotal += Number(income.value)
      }
    })

    return {
      extraIncome: extraTotal,
      extraIncomeBreakdown: Object.entries(extra)
        .map(([name, total]) => ({
          name,
          total,
          icon: INCOME_ICONS[name] || INCOME_ICONS["Outro"],
        }))
        .sort((a, b) => b.total - a.total),
      totalIncome: total,
    }
  }, [incomes, categoryMap])

  const percentageFromExtra = totalIncome > 0 ? (extraIncome / totalIncome) * 100 : 0

  if (extraIncomeBreakdown.length === 0) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Rendas Extras
          </CardTitle>
          <CardDescription>
            {MONTHS[month - 1]} de {year}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhuma renda extra registrada neste mês
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Adicione freelances, bônus ou outras rendas para acompanhá-las aqui
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-success" />
          Rendas Extras
        </CardTitle>
        <CardDescription>
          {MONTHS[month - 1]} de {year}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total de Extras</p>
            <p className="text-2xl font-bold text-success">
              {renderValue(extraIncome)}
            </p>
            <p className="text-xs text-muted-foreground">
              {percentageFromExtra.toFixed(1)}% da renda total
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Renda Principal</p>
            <p className="text-2xl font-bold text-primary">
              {renderValue(salaryTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              {salaryTotal > 0 ? ((salaryTotal / totalIncome) * 100).toFixed(1) : "0"}% da renda total
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          {extraIncomeBreakdown.map((income, index) => (
            <div key={`${income.name}-${index}`} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  {income.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{income.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {((income.total / extraIncome) * 100).toFixed(1)}% do extra
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-success">
                {renderValue(income.total)}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t mt-4 space-y-1">
          <div className="flex justify-between">
            <p className="text-sm font-medium">Renda Total</p>
            <p className="text-base font-bold text-success">
              {renderValue(totalIncome)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Você ganhou {renderValue(extraIncome)} extras além de sua renda principal!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
