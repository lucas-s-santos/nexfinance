"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { ArrowRight, TrendingUp, TrendingDown, Calculator } from "lucide-react"

interface Bill {
  id: string
  value: number
  is_paid: boolean
  name: string
}

interface MonthlyClosingProps {
  totalIncome: number
  totalExpenses: number
  bills: Bill[]
  showValues: boolean
}

export function MonthlyClosing({
  totalIncome,
  totalExpenses,
  bills,
  showValues,
}: MonthlyClosingProps) {
  const currentBalance = totalIncome - totalExpenses
  const unpaidBillsTotal = bills
    .filter((b) => !b.is_paid)
    .reduce((sum, b) => sum + Number(b.value), 0)
  const projectedBalance = currentBalance - unpaidBillsTotal
  const paidBillsTotal = bills
    .filter((b) => b.is_paid)
    .reduce((sum, b) => sum + Number(b.value), 0)
  const totalBills = paidBillsTotal + unpaidBillsTotal
  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Calculator className="h-4 w-4 text-primary" />
          Fechamento Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Flow row */}
        <div className="grid grid-cols-3 items-center gap-2 rounded-lg bg-muted/50 p-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-success" />
              Receitas
            </div>
            <p className="mt-1 text-sm font-bold text-success">
              {renderValue(totalIncome)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-destructive" />
              Despesas
            </div>
            <p className="mt-1 text-sm font-bold text-destructive">
              {renderValue(totalExpenses)}
            </p>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Saldo Atual</div>
            <p
              className={`mt-1 text-sm font-bold ${
                currentBalance >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {renderValue(currentBalance)}
            </p>
          </div>
        </div>

        {/* Projection */}
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Contas Pendentes
            </p>
            <p className="text-lg font-bold text-warning">
              {renderValue(unpaidBillsTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              {bills.filter((b) => !b.is_paid).length} conta(s) a pagar
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Projecao Final
            </p>
            <p
              className={`text-lg font-bold ${
                projectedBalance >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {renderValue(projectedBalance)}
            </p>
            <p className="text-xs text-muted-foreground">
              Saldo previsto do mes
            </p>
          </div>
        </div>

        {/* Bills progress */}
        {totalBills > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Contas pagas: {renderValue(paidBillsTotal)}</span>
              <span>{((paidBillsTotal / totalBills) * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{
                  width: `${(paidBillsTotal / totalBills) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
