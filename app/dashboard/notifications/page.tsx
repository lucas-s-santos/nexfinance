"use client"

import { useMemo, useState } from "react"
import { useNotifications } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Bell,
  AlertTriangle,
  CalendarClock,
  Target,
  Wallet,
} from "lucide-react"
import { mutate } from "swr"

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications()
  const [filter, setFilter] = useState<"all" | "unread">("all")

  const markAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    mutate("notifications")
  }

  const unreadCount = useMemo(
    () => (notifications ?? []).filter((n) => !n.is_read).length,
    [notifications]
  )

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return (notifications ?? []).filter((n) => !n.is_read)
    }
    return notifications ?? []
  }, [filter, notifications])

  const getNotificationMeta = (type?: string) => {
    switch (type) {
      case "bill_overdue":
        return { label: "Vencidas", icon: AlertTriangle, color: "text-destructive" }
      case "bill_due":
        return { label: "Vencimento", icon: CalendarClock, color: "text-warning" }
      case "goal_update":
        return { label: "Meta", icon: Target, color: "text-primary" }
      case "goal_due":
        return { label: "Meta", icon: Target, color: "text-primary" }
      case "goal_achieved":
        return { label: "Meta", icon: Target, color: "text-success" }
      case "reserve_update":
        return { label: "Reserva", icon: Wallet, color: "text-success" }
      case "budget_alert":
        return { label: "Alerta", icon: AlertTriangle, color: "text-destructive" }
      default:
        return { label: "Sistema", icon: Bell, color: "text-muted-foreground" }
    }
  }

  const formatNotificationDate = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificacoes</h1>
        <p className="text-muted-foreground">
          Avisos de vencimentos, metas e atividades do sistema.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Alertas e lembretes</CardTitle>
            <p className="text-xs text-muted-foreground">
              {unreadCount} nao lidas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={filter === "unread" ? "default" : "outline"}
              onClick={() => setFilter("unread")}
            >
              Nao lidas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`sk-${i}`} className="h-12" />
              ))}
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Sem notificacoes</p>
              <p className="text-xs text-muted-foreground/80">
                Quando houver algo importante, voce vera aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {visibleNotifications.map((notification) => {
                const meta = getNotificationMeta(notification.type)
                const Icon = meta.icon
                const isUnread = !notification.is_read

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start justify-between gap-4 p-6 ${
                      isUnread ? "bg-card/60" : "bg-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 ${
                          meta.color
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {notification.title}
                          </p>
                          <Badge variant={isUnread ? "default" : "secondary"}>
                            {isUnread ? "Nao lida" : meta.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {formatNotificationDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Marcar lida
                      </Button>
                    )}
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
