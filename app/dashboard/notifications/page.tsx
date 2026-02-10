"use client"

import { useNotifications } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Bell } from "lucide-react"
import { mutate } from "swr"

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications()

  const markAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    mutate("notifications")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificacoes</h1>
        <p className="text-muted-foreground">
          Alertas de orcamento e atividades do sistema.
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
          ) : (notifications ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Sem notificacoes</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {(notifications ?? []).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start justify-between gap-4 p-6"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
