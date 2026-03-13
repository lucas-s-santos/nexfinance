"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { useNotifications } from "@/lib/use-financial-data"

type NotificationRecord = {
  id: string
  is_read?: boolean
  type?: string
}

const NotificationsPanel = dynamic(
  () =>
    import("@/components/dashboard/notifications-panel").then(
      (mod) => mod.NotificationsPanel
    ),
  {
    loading: () => (
      <Card className="p-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    ),
  }
)

type NotificationStats = {
  total: number
  unread: number
  overdue: number
  goals: number
  read: number
}

function calculateNotificationStats(notifications: NotificationRecord[]): NotificationStats {
  const base = notifications.reduce(
    (acc, notification) => {
      const isRead = Boolean(notification.is_read)
      const type = notification.type

      acc.total += 1

      if (!isRead) {
        acc.unread += 1
        if (type === "bill_overdue") acc.overdue += 1
        if (type === "goal_due" || type === "goal_achieved") acc.goals += 1
      }

      return acc
    },
    { total: 0, unread: 0, overdue: 0, goals: 0 }
  )

  return { ...base, read: base.total - base.unread }
}

function SummaryTile({
  label,
  helper,
  value,
  isLoading,
  tone = "default",
}: {
  label: string
  helper: string
  value: number
  isLoading: boolean
  tone?: "default" | "primary" | "success" | "destructive"
}) {
  const toneClasses =
    tone === "destructive"
      ? "from-destructive/15 text-destructive"
      : tone === "success"
        ? "from-success/15 text-success"
        : tone === "primary"
          ? "from-primary/15 text-primary"
          : "from-muted/50 text-foreground"

  return (
    <div
      className={`rounded-2xl border border-border/60 bg-gradient-to-br ${toneClasses} via-card/70 to-background p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-2 h-7 w-14" />
      ) : (
        <p className="mt-2 text-2xl font-semibold" aria-live="polite">
          {value}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  )
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications()
  const [markingAll, setMarkingAll] = useState(false)
  const [clearingRead, setClearingRead] = useState(false)

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => n.type !== "budget_alert"),
    [notifications]
  )

  const stats = useMemo(() => calculateNotificationStats(visibleNotifications), [visibleNotifications])

  const handleMarkAllRead = async () => {
    if (stats.unread === 0) return

    setMarkingAll(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false)
        .neq("type", "budget_alert")

      if (error) throw error

      await mutate("notifications")
      toast.success("Todas as notificacoes foram marcadas como lidas")
    } catch {
      toast.error("Nao foi possivel marcar as notificacoes")
    } finally {
      setMarkingAll(false)
    }
  }

  const handleClearRead = async () => {
    if (stats.read === 0) return

    setClearingRead(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("is_read", true)
        .neq("type", "budget_alert")

      if (error) throw error

      await mutate("notifications")
      toast.success("Notificacoes lidas removidas")
    } catch {
      toast.error("Nao foi possivel limpar notificacoes lidas")
    } finally {
      setClearingRead(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-primary/12 via-background to-background shadow-sm">
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
              <Bell className="h-3.5 w-3.5" />
              Painel vivo
            </div>
            <h1 className="text-2xl font-bold text-foreground">Central de Notificacoes</h1>
            <p className="text-muted-foreground">
              Acompanhe alertas de contas, metas e reservas. Marque, limpe ou filtre sem perder contexto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleMarkAllRead}
              disabled={markingAll || stats.unread === 0}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              {markingAll ? "Atualizando..." : "Marcar todas"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearRead}
              disabled={clearingRead || stats.read === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {clearingRead ? "Limpando..." : "Limpar lidas"}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 px-6 pb-6 md:grid-cols-3">
          <SummaryTile
            label="Nao lidas"
            helper="Reveja e arquive o que importa agora."
            value={stats.unread}
            tone="primary"
            isLoading={isLoading}
          />
          <SummaryTile
            label="Contas vencidas"
            helper="Priorize faturas atrasadas."
            value={stats.overdue}
            tone="text-destructive"
            isLoading={isLoading}
          />
          <SummaryTile
            label="Metas ativas"
            helper="Alertas de metas e reservas."
            value={stats.goals}
            tone="text-primary"
            isLoading={isLoading}
          />
        </div>
      </Card>

      <NotificationsPanel
        title="Historico de alertas"
        subtitle="Use filtros, marque individualmente ou mantenha apenas o que interessa."
      />
    </div>
  )
}
