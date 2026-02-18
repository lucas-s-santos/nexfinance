"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Bill {
  id: string
  name: string
  value: number | string
  due_date: string
  is_paid: boolean
}

interface UpcomingBillsProps {
  bills: Bill[]
  showValues: boolean
}

export function UpcomingBills({ bills, showValues }: UpcomingBillsProps) {
  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sortedBills = [...(bills || [])].sort((a, b) => {
    const dateA = new Date(a.due_date).getTime()
    const dateB = new Date(b.due_date).getTime()
    return dateA - dateB
  })

  const pendingBills = sortedBills.filter(b => !b.is_paid)
  const paidBills = sortedBills.filter(b => b.is_paid)

  const getStatus = (dueDate: string) => {
    const date = new Date(dueDate)
    date.setHours(0, 0, 0, 0)
    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diff < 0) return { label: "Vencida", color: "text-destructive", bg: "bg-destructive/10" }
    if (diff === 0) return { label: "Vence hoje", color: "text-warning", bg: "bg-warning/10" }
    if (diff <= 3) return { label: `Vence em ${diff}d`, color: "text-orange-500", bg: "bg-orange-500/10" }
    if (diff <= 7) return { label: `Vence em ${diff}d`, color: "text-blue-500", bg: "bg-blue-500/10" }
    return { label: `${diff} dias`, color: "text-muted-foreground", bg: "bg-muted/30" }
  }

  const upcomingCount = pendingBills.filter(b => {
    const date = new Date(b.due_date)
    date.setHours(0, 0, 0, 0)
    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 7
  }).length

  const overdueCount = pendingBills.filter(b => {
    const date = new Date(b.due_date)
    date.setHours(0, 0, 0, 0)
    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff < 0
  }).length

  return (
    <Card className="glass-panel border-0 col-span-full lg:col-span-1">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Contas a Pagar
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {upcomingCount} vencendo em breve
            {overdueCount > 0 && ` • ${overdueCount} vencida${overdueCount !== 1 ? "s" : ""}`}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedBills.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma conta a pagar</p>
          </div>
        ) : (
          <>
            {pendingBills.slice(0, 5).map((bill) => {
              const status = getStatus(bill.due_date)
              const date = new Date(bill.due_date)
              const formattedDate = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

              return (
                <div
                  key={bill.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    status.color === "text-destructive"
                      ? "bg-destructive/10 border-destructive/20"
                      : status.color === "text-warning"
                        ? "bg-warning/10 border-warning/20"
                        : "bg-slate-800/50 border-slate-700/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{bill.name}</p>
                      <p className={cn("text-xs font-semibold", status.color)}>{status.label}</p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="font-bold text-foreground">{renderValue(Number(bill.value))}</p>
                      <p className="text-xs text-muted-foreground">{formattedDate}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            {paidBills.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Pagas</p>
                {paidBills.slice(0, 2).map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-foreground line-through opacity-75">{bill.name}</p>
                    </div>
                    <p className="text-sm font-semibold text-success whitespace-nowrap">{renderValue(Number(bill.value))}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
