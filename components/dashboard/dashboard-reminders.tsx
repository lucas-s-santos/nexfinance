"use client"

import { useReminders } from "@/lib/use-reminders"
import { createClient } from "@/lib/supabase/client"
import { CalendarDays, CheckCircle2, Circle } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { format, isToday, isTomorrow, isPast, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function DashboardReminders() {
  const { data: reminders, mutate } = useReminders()

  // Filtramos apenas os não concluídos
  const pendingReminders = (reminders ?? []).filter((r) => !r.is_completed)

  // Ordenamos para mostrar os atrasados primeiro e depois os mais próximos
  const sortedReminders = pendingReminders.sort((a, b) => {
    const timeA = a.date ? new Date(a.date.split("T")[0] + "T00:00:00").getTime() : 0
    const timeB = b.date ? new Date(b.date.split("T")[0] + "T00:00:00").getTime() : 0
    return timeA - timeB
  })

  // Pegar os primeiros 5 ou algo assim
  const displayReminders = sortedReminders.slice(0, 5)

  const handleComplete = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic update effect by making state mutate sync or letting SWR do it
      // For now, simple SWR approach:
      const supabase = createClient()
      const { error } = await supabase
        .from("reminders")
        .update({ is_completed: true }) // since we only show (!is_completed)
        .eq("id", id)

      if (error) throw error
      
      // Update cache
      mutate()
      toast.success("Lembrete concluído!")
    } catch (err) {
      toast.error("Erro ao concluir lembrete")
    }
  }

  const getDateLabel = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr.split("T")[0] + "T00:00:00") // ignorando timezone shift
    if (isToday(d)) return <span className="text-emerald-500 font-semibold">Hoje</span>
    if (isTomorrow(d)) return <span className="text-amber-500 font-semibold">Amanhã</span>
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (d < today) return <span className="text-destructive font-semibold">Atrasado</span>
    return <span className="text-muted-foreground">{format(d, "dd/MM", { locale: ptBR })}</span>
  }

  if (!reminders) return null // loading state handling
  
  if (pendingReminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-border/60 rounded-3xl bg-background/50 backdrop-blur-sm">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <CalendarDays className="h-6 w-6 text-primary" />
        </div>
        <p className="text-base font-medium text-foreground">Tudo em dia!</p>
        <p className="text-sm text-muted-foreground mb-4">Você não tem lembretes pendentes.</p>
        <Link 
          href="/dashboard/calendar" 
          className="text-primary text-sm font-medium hover:underline"
        >
          Ir para o Calendário
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full glass-panel rounded-3xl p-6 relative overflow-hidden bg-gradient-to-br from-card/80 to-background/50 border border-white/10 dark:border-white/5 shadow-2xl">
      <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 p-32 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Lembretes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingReminders.length} pendente{pendingReminders.length !== 1 && "s"}
          </p>
        </div>
        <Link 
          href="/dashboard/calendar" 
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors bg-primary/10 px-3 py-1.5 rounded-full"
        >
          Ver agenda
        </Link>
      </div>

      <div className="relative z-10 flex flex-col gap-3 flex-1">
        <AnimatePresence mode="popLayout">
          {displayReminders.map((reminder) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -20, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              key={reminder.id}
              className="group flex flex-col gap-1 p-3.5 rounded-2xl bg-background/80 hover:bg-background border border-border/40 hover:border-border/80 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleComplete(reminder.id, reminder.is_completed)}
                  className="flex-shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors focus:outline-none"
                  aria-label="Concluir lembrete"
                >
                  <Circle className="h-6 w-6" />
                </button>
                <div className="flex-col flex flex-1 min-w-0">
                  <span className="font-semibold text-[15px] truncate text-foreground group-hover:text-primary transition-colors">
                    {reminder.title}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    {getDateLabel(reminder.date)}
                    {reminder.category && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="text-muted-foreground">{reminder.category.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {pendingReminders.length > 5 && (
          <Link href="/dashboard/calendar" className="text-center text-sm text-muted-foreground hover:text-foreground mt-2 py-2">
            + {pendingReminders.length - 5} outros lembretes
          </Link>
        )}
      </div>
    </div>
  )
}
