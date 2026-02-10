"use client"

import { useAuditLogs } from "@/lib/use-financial-data"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { History, Plus, Edit3, Trash2 } from "lucide-react"

const ENTITY_LABELS: Record<string, string> = {
  incomes: "Receita",
  expenses: "Despesa",
  bills: "Conta",
  reserves_investments: "Reserva/Investimento",
  financial_goals: "Meta",
  categories: "Categoria",
  budgets: "Orcamento",
  recurring_bills: "Conta Recorrente",
}

const ACTION_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  insert: { label: "Criou", icon: Plus, color: "bg-success/10 text-success" },
  update: { label: "Editou", icon: Edit3, color: "bg-primary/10 text-primary" },
  delete: { label: "Excluiu", icon: Trash2, color: "bg-destructive/10 text-destructive" },
}

export default function AuditPage() {
  const { data: logs, isLoading } = useAuditLogs()

  const getChangeSummary = (log: any) => {
    const changes = log.changes as any
    if (log.action === "insert" && changes?.new) {
      return `${changes.new.name || "Item"} - ${changes.new.value ? `R$ ${changes.new.value}` : ""}`
    }
    if (log.action === "delete" && changes?.old) {
      return `${changes.old.name || "Item"} - ${changes.old.value ? `R$ ${changes.old.value}` : ""}`
    }
    if (log.action === "update" && changes?.old && changes?.new) {
      const parts = []
      if (changes.old.name !== changes.new.name) {
        parts.push(`Nome: ${changes.old.name} → ${changes.new.name}`)
      }
      if (changes.old.value !== changes.new.value) {
        parts.push(`Valor: R$ ${changes.old.value} → R$ ${changes.new.value}`)
      }
      if (changes.old.date !== changes.new.date) {
        parts.push(`Data: ${changes.old.date} → ${changes.new.date}`)
      }
      return parts.length > 0 ? parts.join(" | ") : "Alteracao registrada"
    }
    return ""
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
        <p className="text-muted-foreground">
          Registro de criacoes, edicoes e exclusoes.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`sk-${i}`} className="h-10" />
              ))}
            </div>
          ) : (logs ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <History className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Sem registros</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {(logs ?? []).map((log) => {
                const actionInfo = ACTION_LABELS[log.action] || {
                  label: log.action,
                  icon: History,
                  color: "bg-muted text-muted-foreground",
                }
                const Icon = actionInfo.icon
                return (
                  <div key={log.id} className="flex items-start gap-4 p-6">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${actionInfo.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground">
                          {actionInfo.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getChangeSummary(log)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(log.created_at))}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
