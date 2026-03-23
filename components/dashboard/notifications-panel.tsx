"use client"

import { useMemo, useRef, useState, useEffect } from "react"
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
  BellRing,
  BellOff,
} from "lucide-react"
import { mutate } from "swr"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { usePushNotifications } from "@/hooks/use-push-notifications"

const FILTER_PARAM = "notificationsFilter"

type NotificationFilter = "all" | "unread"

function normalizeFilter(value: string | null): NotificationFilter {
  return value === "unread" ? "unread" : "all"
}

type NotificationsPanelProps = {
  title?: string
  subtitle?: string
}

export function NotificationsPanel({
  title = "Alertas e lembretes",
  subtitle = "Avisos de vencimentos, metas e atividades do sistema.",
}: NotificationsPanelProps) {
  const { data: notifications, isLoading } = useNotifications()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname() ?? "/"
  const filter = normalizeFilter(searchParams.get(FILTER_PARAM))
  const searchParamString = searchParams.toString()
  const { permission, requestPermission } = usePushNotifications()
  const [dense, setDense] = useState(false)
  const [filterAnimating, setFilterAnimating] = useState(false)
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filteredNotifications = useMemo(
    () => (notifications ?? []).filter((n) => n.type !== "budget_alert"),
    [notifications]
  )

  const handleFilterChange = (nextFilter: NotificationFilter) => {
    if (filterTimer.current) {
      clearTimeout(filterTimer.current)
    }
    setFilterAnimating(true)
    filterTimer.current = setTimeout(() => setFilterAnimating(false), 180)

    const updated = new URLSearchParams(searchParamString)
    if (nextFilter === "all") {
      updated.delete(FILTER_PARAM)
    } else {
      updated.set(FILTER_PARAM, nextFilter)
    }

    const queryString = updated.toString()
    const destination = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(destination, { scroll: false })
  }

  const unreadCount = useMemo(
    () => filteredNotifications.filter((n) => !n.is_read).length,
    [filteredNotifications]
  )

  const markAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    mutate("notifications")
  }

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return filteredNotifications.filter((n) => !n.is_read)
    }
    return filteredNotifications
  }, [filter, filteredNotifications])

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

  useEffect(
    () => () => {
      if (filterTimer.current) clearTimeout(filterTimer.current)
    },
    []
  )

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          <p className="text-xs text-muted-foreground">{unreadCount} nao lidas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {permission === "default" && (
            <Button
              size="sm"
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10 dark:border-primary/30"
              onClick={requestPermission}
            >
              <BellRing className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Ativar Alertas de Contas</span>
              <span className="sm:hidden">Ativar Alertas</span>
            </Button>
          )}
          {permission === "denied" && (
            <Badge variant="destructive" className="h-9 px-3">
              <BellOff className="mr-2 h-3 w-3" />
              Bloqueado
            </Badge>
          )}
          {permission === "granted" && (
            <Badge variant="secondary" className="h-9 px-3 bg-primary/10 text-primary hover:bg-primary/20">
              <BellRing className="mr-2 h-3 w-3" />
              <span className="hidden sm:inline">Alertas Ativos</span>
              <span className="sm:hidden">Ativos</span>
            </Badge>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDense((prev) => !prev)}
            aria-pressed={dense}
          >
            {dense ? "Espaço normal" : "Modo compacto"}
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => handleFilterChange("all")}
          >
            Todas
          </Button>
          <Button
            size="sm"
            variant={filter === "unread" ? "default" : "outline"}
            onClick={() => handleFilterChange("unread")}
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
          <div
            className="divide-y divide-border/60 transition-all duration-200 ease-out"
            style={{
              opacity: filterAnimating ? 0.45 : 1,
              transform: filterAnimating ? "translateY(4px)" : "translateY(0)",
            }}
          >
            {visibleNotifications.map((notification) => {
              const meta = getNotificationMeta(notification.type)
              const Icon = meta.icon
              const isUnread = !notification.is_read

              return (
                <div
                  key={notification.id}
                  className={`flex items-start justify-between gap-4 ${dense ? "p-4" : "p-6"} ${
                    isUnread ? "bg-card/60" : "bg-transparent"
                  } transition-colors duration-200 hover:bg-muted/40`}
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
                        <p className={`${dense ? "text-sm" : "text-base"} font-semibold text-foreground`}>
                          {notification.title}
                        </p>
                        <Badge variant={isUnread ? "default" : "secondary"}>
                          {isUnread ? "Nao lida" : meta.label}
                        </Badge>
                      </div>
                      <p className={`${dense ? "text-xs" : "text-sm"} text-muted-foreground`}>
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
  )
}
