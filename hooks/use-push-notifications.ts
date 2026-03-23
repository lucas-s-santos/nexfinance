"use client"

import { useEffect, useState } from "react"
import { useBills } from "@/lib/use-financial-data"
import { formatCurrency } from "@/lib/format"
import { usePeriod } from "@/lib/period-context"

export function usePushNotifications() {
  const { periodId } = usePeriod()
  const { data: bills } = useBills(periodId)
  const [permission, setPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    if (!("Notification" in window)) return
    setPermission(Notification.permission)
  }, [])

  const requestPermission = async () => {
    if (!("Notification" in window)) return
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (err) {
      console.warn("Erro ao pedir permissão de notificação", err)
      return "denied" as NotificationPermission
    }
  }

  // Check for upcoming bills and notify
  useEffect(() => {
    if (permission !== "granted" || !bills || bills.length === 0) return

    // Limit notifications to once per day so we don't spam the user
    const lastNotified = localStorage.getItem("last_notified_bills")
    const todayStr = new Date().toISOString().slice(0, 10)
    
    if (lastNotified === todayStr) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcoming = bills.filter(b => {
      if (b.is_paid) return false
      const date = new Date(b.due_date)
      date.setHours(0, 0, 0, 0)
      const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 3 // Due today or within 3 days
    })

    if (upcoming.length > 0) {
      const totalAmount = upcoming.reduce((acc, b) => acc + Number(b.value), 0)
      const message = `Você tem ${upcoming.length} conta(s) vencendo nos próximos 3 dias no valor total de ${formatCurrency(totalAmount)}.`

      try {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification("💸 Contas a Vencer!", {
              body: message,
              icon: "/icon512_maskable.png",
              badge: "/icon512_maskable.png",
              vibrate: [200, 100, 200],
              tag: "upcoming-bills",
              data: { url: "/dashboard" }
            })
          })
        } else {
          // Fallback
          new Notification("💸 Contas a Vencer!", {
            body: message,
            icon: "/logo01.jpg",
          })
        }
        localStorage.setItem("last_notified_bills", todayStr)
      } catch (err) {
        console.warn("Navegador não suportou exibir a notificação", err)
      }
    }
  }, [bills, permission])

  return { permission, requestPermission }
}
