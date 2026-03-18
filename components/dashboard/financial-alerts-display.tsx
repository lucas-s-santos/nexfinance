/**
 * Componente para exibir alertas financeiros na dashboard
 * Mostra alertas de orçamento, contas vencidas, metas, etc.
 */

"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Zap, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useFinancialAlerts, FinancialAlert, AlertLevel } from "@/hooks/use-financial-alerts"

interface FinancialAlertsDisplayProps {
  expenses: any[]
  budgets: any[]
  bills: any[]
  goals: any[]
  reserves: any[]
  categories: any[]
}

const levelIcons: Record<AlertLevel, any> = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Zap,
}

const levelColors: Record<AlertLevel, string> = {
  critical: "border-red-500 bg-red-50 text-red-900",
  warning: "border-yellow-500 bg-yellow-50 text-yellow-900",
  info: "border-blue-500 bg-blue-50 text-blue-900",
}

const levelTitleColors: Record<AlertLevel, string> = {
  critical: "text-red-700",
  warning: "text-yellow-700",
  info: "text-blue-700",
}

export function FinancialAlertsDisplay({
  expenses,
  budgets,
  bills,
  goals,
  reserves,
  categories,
}: FinancialAlertsDisplayProps) {
  const alerts = useFinancialAlerts({
    expenses,
    budgets,
    bills,
    goals,
    reserves,
    categories,
  })

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const visibleAlerts = useMemo(
    () => alerts.filter((a) => a.dismissible !== false || !dismissedAlerts.has(a.id)),
    [alerts, dismissedAlerts]
  )

  const criticalAlerts = visibleAlerts.filter((a) => a.level === "critical")
  const warningAlerts = visibleAlerts.filter((a) => a.level === "warning")
  const infoAlerts = visibleAlerts.filter((a) => a.level === "info")

  if (visibleAlerts.length === 0) {
    return null
  }

  const handleDismiss = (id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]))
  }

  const renderAlert = (alert: FinancialAlert) => {
    const Icon = levelIcons[alert.level]

    return (
      <div
        key={alert.id}
        className={`relative flex items-start gap-3 rounded-lg border-l-4 p-3 ${levelColors[alert.level]}`}
      >
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${levelTitleColors[alert.level]}`}>
            {alert.title}
          </p>
          <p className="mt-1 text-sm opacity-90">{alert.description}</p>

          {alert.action && (
            <Link href={alert.action.href}>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-8"
              >
                {alert.action.label}
              </Button>
            </Link>
          )}
        </div>

        {alert.dismissible && (
          <button
            onClick={() => handleDismiss(alert.id)}
            className="mt-1 flex-shrink-0 opacity-50 hover:opacity-100"
            aria-label="Descartar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Alertas Financeiros
          {visibleAlerts.length > 0 && (
            <span className="ml-auto rounded-full bg-red-100 px-2 py-1 text-sm font-normal text-red-700">
              {visibleAlerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {criticalAlerts.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-red-700 uppercase">
                🔴 Crítico ({criticalAlerts.length})
              </h4>
              <div className="space-y-2">
                {criticalAlerts.map(renderAlert)}
              </div>
            </div>
          )}

          {warningAlerts.length > 0 && (
            <div>
              {criticalAlerts.length > 0 && <div className="my-3 border-t" />}
              <h4 className="mb-2 text-xs font-semibold text-yellow-700 uppercase">
                ⚠️ Aviso ({warningAlerts.length})
              </h4>
              <div className="space-y-2">
                {warningAlerts.map(renderAlert)}
              </div>
            </div>
          )}

          {infoAlerts.length > 0 && (
            <div>
              {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
                <div className="my-3 border-t" />
              )}
              <h4 className="mb-2 text-xs font-semibold text-blue-700 uppercase">
                ℹ️ Informação ({infoAlerts.length})
              </h4>
              <div className="space-y-2">
                {infoAlerts.map(renderAlert)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
