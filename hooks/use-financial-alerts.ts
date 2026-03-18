/**
 * Hook para gerenciar alertas e notificações do sistema financeiro
 * Calcula alertas baseado em regras de negócio:
 * - Orçamento próximo do limite
 * - Contas vencidas
 * - Metas próximas do deadline
 * - Reservas abaixo do mínimo
 */

import { useMemo } from "react"

export type AlertLevel = "info" | "warning" | "critical"

export interface FinancialAlert {
  id: string
  type: "budget" | "overdue_bill" | "goal_deadline" | "low_reserve"
  level: AlertLevel
  title: string
  description: string
  value?: number
  action?: {
    label: string
    href: string
  }
  dismissible?: boolean
  timestamp: number
}

interface UseFinancialAlertsParams {
  expenses: any[]
  budgets: any[]
  bills: any[]
  goals: any[]
  reserves: any[]
  categories: any[]
}

export function useFinancialAlerts({
  expenses = [],
  budgets = [],
  bills = [],
  goals = [],
  reserves = [],
  categories = [],
}: UseFinancialAlertsParams): FinancialAlert[] {
  return useMemo(() => {
    const alerts: FinancialAlert[] = []
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

    // ===== ALERTAS DE ORÇAMENTO =====
    budgets.forEach((budget) => {
      const category = categories.find((c) => c.id === budget.category_id)
      const spent = expenses
        .filter((e) => e.category_id === budget.category_id)
        .reduce((sum, e) => sum + Number(e.value), 0)

      const percentUsed = (spent / budget.limit_value) * 100

      // ⚠️ Aviso: 80% do limite
      if (percentUsed >= 80 && percentUsed < 100) {
        alerts.push({
          id: `budget_warning_${budget.id}`,
          type: "budget",
          level: "warning",
          title: `Orçamento próximo do limite`,
          description: `${category?.name || "Categoria"}: ${percentUsed.toFixed(0)}% utilizado (R$ ${spent.toFixed(2)} de R$ ${budget.limit_value.toFixed(2)})`,
          value: percentUsed,
          action: {
            label: "Ver orçamentos",
            href: "/dashboard/budgets",
          },
          timestamp: Date.now(),
        })
      }

      // 🔴 Crítico: Ultrapassou limite
      if (percentUsed >= 100) {
        alerts.push({
          id: `budget_critical_${budget.id}`,
          type: "budget",
          level: "critical",
          title: `Orçamento ULTRAPASSADO`,
          description: `${category?.name || "Categoria"}: ${percentUsed.toFixed(0)}% utilizado (R$ ${spent.toFixed(2)} de R$ ${budget.limit_value.toFixed(2)})`,
          value: percentUsed,
          action: {
            label: "Ver orçamentos",
            href: "/dashboard/budgets",
          },
          dismissible: false,
          timestamp: Date.now(),
        })
      }
    })

    // ===== ALERTAS DE CONTAS VENCIDAS =====
    bills.forEach((bill) => {
      const dueDate = bill.due_date
      const isOverdue = dueDate < today
      const daysUntilDue = Math.ceil(
        (new Date(dueDate).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      // 🔴 Vencido
      if (isOverdue && !bill.is_paid) {
        const daysPassed = Math.abs(daysUntilDue)
        alerts.push({
          id: `overdue_${bill.id}`,
          type: "overdue_bill",
          level: "critical",
          title: `Conta vencida há ${daysPassed} dia${daysPassed > 1 ? "s" : ""}`,
          description: `${bill.name} - Vencimento: ${bill.due_date} (R$ ${Number(bill.value).toFixed(2)})`,
          value: Number(bill.value),
          action: {
            label: "Marcar como pago",
            href: "/dashboard/bills",
          },
          dismissible: false,
          timestamp: Date.now(),
        })
      }

      // ⚠️ Vencendo em breve (até 3 dias)
      if (!isOverdue && daysUntilDue > 0 && daysUntilDue <= 3 && !bill.is_paid) {
        alerts.push({
          id: `due_soon_${bill.id}`,
          type: "overdue_bill",
          level: "warning",
          title: `Conta vence em ${daysUntilDue} dia${daysUntilDue > 1 ? "s" : ""}`,
          description: `${bill.name} - Vencimento: ${bill.due_date} (R$ ${Number(bill.value).toFixed(2)})`,
          value: Number(bill.value),
          action: {
            label: "Ver contas",
            href: "/dashboard/bills",
          },
          timestamp: Date.now(),
        })
      }
    })

    // ===== ALERTAS DE METAS =====
    goals.forEach((goal) => {
      if (!goal.deadline) return

      const deadline = goal.deadline
      const daysUntil = Math.ceil(
        (new Date(deadline).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      const percentProgress = (goal.current_value / goal.target_value) * 100

      // ⚠️ Meta próxima do deadline
      if (daysUntil > 0 && daysUntil <= 7) {
        alerts.push({
          id: `goal_deadline_${goal.id}`,
          type: "goal_deadline",
          level: "warning",
          title: `Meta "${goal.name}" vence em ${daysUntil} dia${daysUntil > 1 ? "s" : ""}`,
          description: `Progresso: ${percentProgress.toFixed(0)}% (R$ ${goal.current_value.toFixed(2)} de R$ ${goal.target_value.toFixed(2)})`,
          value: percentProgress,
          action: {
            label: "Ver metas",
            href: "/dashboard/goals",
          },
          timestamp: Date.now(),
        })
      }

      // 🔴 Meta expirada
      if (daysUntil <= 0) {
        alerts.push({
          id: `goal_expired_${goal.id}`,
          type: "goal_deadline",
          level: "critical",
          title: `Meta "${goal.name}" expirou`,
          description: `Progresso final: ${percentProgress.toFixed(0)}% (R$ ${goal.current_value.toFixed(2)} de R$ ${goal.target_value.toFixed(2)})`,
          value: percentProgress,
          action: {
            label: "Atualizar meta",
            href: "/dashboard/goals",
          },
          dismissible: true,
          timestamp: Date.now(),
        })
      }
    })

    // ===== ALERTAS DE RESERVAS =====
    const totalReserves = reserves.reduce((sum, r) => sum + Number(r.value), 0)
    const recommendedReserve = 10000 // R$ 10k mínimo

    if (totalReserves < recommendedReserve) {
      alerts.push({
        id: "low_reserve",
        type: "low_reserve",
        level: "info",
        title: "Reserva de emergência baixa",
        description: `Você tem R$ ${totalReserves.toFixed(2)}. Recomendado: mínimo R$ ${recommendedReserve.toFixed(2)}`,
        value: totalReserves,
        action: {
          label: "Aumentar reserva",
          href: "/dashboard/reserves",
        },
        timestamp: Date.now(),
      })
    }

    return alerts
  }, [expenses, budgets, bills, goals, reserves, categories])
}
