"use client"

import { useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Budget = {
  id: string
  category_id: string
  limit_value: number
}

type Expense = {
  category_id: string | null
  value: number
}

interface BudgetAlertsProps {
  budgets: Budget[]
  expenses: Expense[]
  periodId: string | null
  categoryMap: Map<string, string>
}

export function BudgetAlerts({
  budgets,
  expenses,
  periodId,
  categoryMap,
}: BudgetAlertsProps) {
  const totals = useMemo(() => {
    const map = new Map<string, number>()
    for (const expense of expenses) {
      if (!expense.category_id) continue
      const current = map.get(expense.category_id) ?? 0
      map.set(expense.category_id, current + Number(expense.value))
    }
    return map
  }, [expenses])

  const alerts = useMemo(() => {
    return budgets
      .map((budget) => {
        const spent = totals.get(budget.category_id) ?? 0
        const percent = budget.limit_value > 0 ? (spent / budget.limit_value) * 100 : 0
        return {
          ...budget,
          spent,
          percent,
        }
      })
      .filter((b) => b.percent >= 80)
      .sort((a, b) => b.percent - a.percent)
  }, [budgets, totals])

  useEffect(() => {
    if (!periodId || alerts.length === 0) return
    const supabase = createClient()

    const upsertNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const rows = alerts
        .filter((alert) => alert.percent >= 80)
        .map((alert) => {
          const threshold = alert.percent >= 100 ? 100 : 80
          return {
            user_id: user.id,
            type: "budget_alert",
            title:
              threshold === 100
                ? "Orcamento estourado"
                : "Orcamento em alerta",
            message:
              threshold === 100
                ? `A categoria ${categoryMap.get(alert.category_id) ?? "Sem categoria"} passou de 100% do orcamento.`
                : `A categoria ${categoryMap.get(alert.category_id) ?? "Sem categoria"} passou de 80% do orcamento.`,
            category_id: alert.category_id,
            period_id: periodId,
            threshold,
          }
        })

      if (rows.length === 0) return
      await supabase.from("notifications").upsert(rows, {
        onConflict: "user_id,type,category_id,period_id,threshold",
      })
    }

    upsertNotifications()
  }, [alerts, categoryMap, periodId])

  if (alerts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Alertas de Orcamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {categoryMap.get(alert.category_id) ?? "Sem categoria"}
              </p>
              <p className="text-xs text-muted-foreground">
                {alert.percent.toFixed(0)}% do orcamento
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-destructive">
                {formatCurrency(alert.spent)}
              </p>
              <p className="text-xs text-muted-foreground">
                Limite {formatCurrency(alert.limit_value)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
