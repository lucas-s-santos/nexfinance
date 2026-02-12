"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Banknote,
  UtensilsCrossed,
} from "lucide-react"

interface SummaryCardsProps {
  totalIncome: number
  totalExpenses: number
  creditUsage: number
  debitUsage: number
  voucherUsage: number
  showValues: boolean
}

export function SummaryCards({
  totalIncome,
  totalExpenses,
  creditUsage,
  debitUsage,
  voucherUsage,
  showValues,
}: SummaryCardsProps) {
  const remaining = totalIncome - totalExpenses
  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  const cards = [
    {
      title: "Receita Total",
      value: totalIncome,
      icon: TrendingUp,
      color: "text-success" as const,
      bgColor: "bg-success/10" as const,
    },
    {
      title: "Despesa Total",
      value: totalExpenses,
      icon: TrendingDown,
      color: "text-destructive" as const,
      bgColor: "bg-destructive/10" as const,
    },
    {
      title: "Saldo Restante",
      value: remaining,
      icon: Wallet,
      color: remaining >= 0 ? ("text-success" as const) : ("text-destructive" as const),
      bgColor: remaining >= 0 ? ("bg-success/10" as const) : ("bg-destructive/10" as const),
    },
    {
      title: "Cartao de Credito",
      value: creditUsage,
      icon: CreditCard,
      color: "text-primary" as const,
      bgColor: "bg-primary/10" as const,
    },
    {
      title: "Cartao de Debito",
      value: debitUsage,
      icon: Banknote,
      color: "text-primary" as const,
      bgColor: "bg-primary/10" as const,
    },
    {
      title: "Vale Refeicao",
      value: voucherUsage,
      icon: UtensilsCrossed,
      color: "text-warning" as const,
      bgColor: "bg-warning/10" as const,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${card.color}`}>
              {renderValue(card.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
