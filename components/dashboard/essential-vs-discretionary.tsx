"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { AlertCircle, Lightbulb } from "lucide-react"
import { useMemo } from "react"

interface Expense {
  id: string
  name: string
  value: number
  is_essential: boolean
}

interface EssentialVsDiscretionaryProps {
  expenses: Expense[]
  income: number
  showValues: boolean
}

export function EssentialVsDiscretionary({
  expenses,
  income,
  showValues,
}: EssentialVsDiscretionaryProps) {
  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  const { essentialTotal, discretionaryTotal } = useMemo(() => {
    const essential = expenses
      .filter((e) => e.is_essential)
      .reduce((sum, e) => sum + Number(e.value), 0)

    const discretionary = expenses
      .filter((e) => !e.is_essential)
      .reduce((sum, e) => sum + Number(e.value), 0)

    return {
      essentialTotal: essential,
      discretionaryTotal: discretionary,
    }
  }, [expenses])

  const totalExpenses = essentialTotal + discretionaryTotal
  const essentialPercentage = income > 0 ? (essentialTotal / income) * 100 : 0
  const discretionaryPercentage = totalExpenses > 0 ? (discretionaryTotal / totalExpenses) * 100 : 0

  const isBalanced = essentialPercentage <= 50

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Gastos Essenciais
          </CardTitle>
          <CardDescription>
            Contas fixas e necessárias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-3xl font-bold text-orange-500">
              {renderValue(essentialTotal)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {essentialPercentage.toFixed(1)}% da sua renda
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meta ideal: até 50%</span>
              <span className={essentialPercentage <= 50 ? "text-success" : "text-destructive"}>
                {isBalanced ? "✓ Dentro do ideal" : "⚠ Acima da meta"}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={essentialPercentage <= 50 ? "bg-orange-500" : "bg-orange-600"}
                style={{
                  width: `${Math.min(essentialPercentage, 100)}%`,
                }}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Exemplos: Aluguel, contas de utilidade, internet, transporte essencial
          </p>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Gastos Discricionários
          </CardTitle>
          <CardDescription>
            Lazer e compras opcionais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-3xl font-bold text-yellow-500">
              {renderValue(discretionaryTotal)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {discretionaryPercentage > 0 ? `${(discretionaryTotal / totalExpenses * 100).toFixed(1)}% dos gastos` : "Sem gastos discricionários"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recomendado: 20-30%</span>
              <span className={discretionaryTotal <= income * 0.30 ? "text-success" : "text-destructive"}>
                {discretionaryTotal <= income * 0.30 ? "✓ Controlado" : "⚠ Elevado"}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={discretionaryTotal <= income * 0.30 ? "bg-yellow-500" : "bg-yellow-600"}
                style={{
                  width: `${Math.min((discretionaryTotal / income) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Exemplos: Entretenimento, restaurantes, compras online, hobby
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
