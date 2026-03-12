"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { mutate } from "swr"
import { NotificationsPanel } from "@/components/dashboard/notifications-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useNotifications } from "@/lib/use-financial-data"

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications()
  const [markingAll, setMarkingAll] = useState(false)
  const [clearingRead, setClearingRead] = useState(false)

  const stats = useMemo(() => {
    const unread = notifications.filter((item) => !item.is_read).length
    const overdue = notifications.filter(
      (item) => item.type === "bill_overdue" && !item.is_read
    ).length
    const goals = notifications.filter(
      (item) =>
        (item.type === "goal_due" || item.type === "goal_achieved") &&
        !item.is_read
    ).length

    return {
      total: notifications.length,
      unread,
      overdue,
      goals,
      read: notifications.length - unread,
    }
  }, [notifications])

  const handleMarkAllRead = async () => {
    if (stats.unread === 0) return

    setMarkingAll(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false)

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

      if (error) throw error

      await mutate("notifications")
      toast.success("Notificacoes lidas removidas")
    } catch {
      toast.error("Nao foi possivel limpar notificacoes lidas")
    } finally {
      setClearingRead(false)
    }
  }

  const loadingText = isLoading ? "Carregando..." : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Notificacoes</h1>
          <p className="text-muted-foreground">
            Acompanhe alertas de contas, metas, reservas e orcamento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleMarkAllRead}
            disabled={markingAll || stats.unread === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {markingAll ? "Atualizando..." : "Marcar todas como lidas"}
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nao lidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {loadingText ?? stats.unread}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contas vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {loadingText ?? stats.overdue}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Metas com alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {loadingText ?? stats.goals}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span>
            Total de alertas no historico: {loadingText ?? stats.total}.
          </span>
        </CardContent>
      </Card>

      <NotificationsPanel
        title="Historico de alertas"
        subtitle="Filtre por status e marque avisos individualmente."
      />
    </div>
  )
}
