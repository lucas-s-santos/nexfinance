"use client"

import { useState, useMemo } from "react"
import { 
  format, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isToday 
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Plus,
  ListTodo,
  Pencil,
  Trash2,
  Inbox,
  AlertCircle,
  CalendarCheck,
  X,
  AlignJustify,
  CalendarDays
} from "lucide-react"
import { useReminders, Reminder } from "@/lib/use-reminders"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AddReminderDialog } from "@/components/dashboard/add-reminder-dialog"
import { cn } from "@/lib/utils"

export default function MegaCalendarPage() {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [reminderToEdit, setReminderToEdit] = useState<Reminder | null>(null)
  
  const { data: reminders, mutate } = useReminders()

  // Analyticas / Top Badges
  const validReminders = useMemo(() => {
    return (reminders ?? []).map(r => ({
      ...r,
      parsedDate: r.date ? new Date(r.date.split("T")[0] + "T00:00:00") : new Date()
    }))
  }, [reminders])

  const pending = validReminders.filter(r => !r.is_completed)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const missedCount = pending.filter(r => r.parsedDate < today).length
  const todayCount = pending.filter(r => isSameDay(r.parsedDate, today)).length
  const totalMonthCount = validReminders.filter(r => isSameMonth(r.parsedDate, currentMonthDate)).length

  // Ações de Data
  const nextMonth = () => setCurrentMonthDate(addMonths(currentMonthDate, 1))
  const prevMonth = () => setCurrentMonthDate(subMonths(currentMonthDate, 1))

  // Geração da Grid do Calendário
  const daysInGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonthDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonthDate), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonthDate])

  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  // Handlers para o Modal
  const openNewModal = (datePref?: Date) => {
    setReminderToEdit(null)
    if (datePref) setSelectedDay(datePref)
    setIsAddOpen(true)
  }

  const openEditModal = (reminder: Reminder) => {
    setReminderToEdit(reminder)
    setIsAddOpen(true)
  }

  const toggleReminderStatus = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("reminders")
        .update({ is_completed: !currentStatus })
        .eq("id", id)

      if (error) throw error
      mutate()
    } catch (err) {
      toast.error("Erro ao atualizar status.")
    }
  }

  const deleteReminder = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("reminders").delete().eq("id", id)

      if (error) throw error
      toast.success("Lembrete excluído!")
      mutate()
    } catch (err) {
      toast.error("Erro ao excluir lembrete")
    }
  }

  // Lista de lembretes para o dia que estiver selecionado no Drawer Lateral
  const dayDetailsReminders = useMemo(() => {
    if (!selectedDay) return []
    return validReminders.filter(r => isSameDay(r.parsedDate, selectedDay))
  }, [selectedDay, validReminders])

  // Lembretes apenas deste mês (para a visão mobile scrollável)
  const mobileMonthReminders = useMemo(() => {
    return validReminders
      .filter(r => isSameMonth(r.parsedDate, currentMonthDate))
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
  }, [validReminders, currentMonthDate])



  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative overflow-hidden -mx-6 px-6 -mb-6 pb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none -z-10" />

      {/* HEADER: Título & Badges Analíticos */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 mt-2 shrink-0">
        <div>
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/50">
            Agenda Global
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {missedCount > 0 && (
              <Badge variant="destructive" className="px-3 py-1 text-xs font-bold shadow-lg animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {missedCount} Atrasados
              </Badge>
            )}
            <Badge variant="secondary" className="px-3 py-1 text-xs font-bold border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
              <CalendarCheck className="w-3.5 h-3.5 mr-1" />
              {todayCount} para Hoje
            </Badge>
            <Badge variant="outline" className="px-3 py-1 text-xs font-bold text-muted-foreground bg-background/50 backdrop-blur-md">
              <ListTodo className="w-3.5 h-3.5 mr-1 text-primary" />
              {totalMonthCount} neste Mês
            </Badge>
          </div>
        </div>

        {/* Navegação de Mês e Toggle */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex p-1 bg-card/60 backdrop-blur-xl border border-white/10 rounded-full shadow-lg">
            <Button 
              variant={viewMode === "grid" ? "default" : "ghost"} 
              size="sm" 
              className={cn("rounded-full px-4 font-bold transition-all", viewMode !== "grid" && "text-muted-foreground")}
              onClick={() => setViewMode("grid")}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Grade</span>
            </Button>
            <Button 
              variant={viewMode === "list" ? "default" : "ghost"} 
              size="sm" 
              className={cn("rounded-full px-4 font-bold transition-all", viewMode !== "list" && "text-muted-foreground")}
              onClick={() => setViewMode("list")}
            >
              <AlignJustify className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
          </div>

          <div className="flex items-center gap-3 bg-card/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-lg shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-background" onClick={prevMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-[120px] text-center font-bold text-sm sm:text-lg capitalize tracking-wide text-primary">
              {format(currentMonthDate, "MMMM yy", { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-background" onClick={nextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      {viewMode === "grid" ? (
        <div className="flex-1 flex gap-6 min-h-0 relative">
          
          {/* === VISÃO DESKTOP: GRID MAGNÍFICO === */}
          <div className="hidden lg:flex flex-col flex-1 bg-card/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden glass-panel relative z-10 transition-all duration-500">
            <div className="grid grid-cols-7 border-b border-white/5 bg-background/50">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-3 text-center text-xs font-black tracking-widest uppercase text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {daysInGrid.map((day, i) => {
                const isCurrMonth = isSameMonth(day, currentMonthDate)
                const isTodayDay = isToday(day)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                
                // Pegando lembretes deste dia
                const dayRems = validReminders.filter(r => isSameDay(r.parsedDate, day))
                
                // Maximo a mostrar no quadradinho (resto vira '+ N')
                const MAX_VISUAL = 3
                
                return (
                  <div 
                    key={day.toISOString() + i}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "border-r border-b border-white/5 p-2 flex flex-col gap-1 transition-all cursor-pointer relative overflow-hidden group",
                      !isCurrMonth && "bg-background/20 opacity-40",
                      isCurrMonth && "hover:bg-primary/5",
                      isSelected && "bg-primary/10 ring-inset ring-2 ring-primary/50",
                      // Arredondar últimos cantos se precisasse, mas grid cuida disso
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                        isTodayDay ? "bg-primary text-primary-foreground shadow-[0_0_15px_-2px_rgba(var(--primary),0.8)]" : "text-foreground",
                        isSelected && !isTodayDay && "text-primary bg-primary/20"
                      )}>
                        {format(day, "d")}
                      </span>
                      {dayRems.length > 0 && <span className="text-[10px] font-black text-muted-foreground group-hover:text-primary transition-colors">{dayRems.length}</span>}
                    </div>

                    {/* Lembretes como Pills (Desktop) */}
                    <div className="mt-1 flex flex-col gap-1 overflow-hidden h-full">
                      {dayRems.slice(0, MAX_VISUAL).map(r => (
                        <div 
                          key={r.id} 
                          className={cn(
                            "text-[10px] sm:text-xs font-semibold px-2 py-1 rounded border overflow-hidden text-ellipsis whitespace-nowrap transition-all",
                            r.is_completed 
                              ? "bg-muted/30 border-transparent text-muted-foreground/60 line-through" 
                              : "bg-background shadow-sm border-border/50 text-foreground"
                          )}
                        >
                          {r.title}
                        </div>
                      ))}
                      {dayRems.length > MAX_VISUAL && (
                        <div className="text-[10px] font-bold text-muted-foreground w-full text-center mt-auto">
                          +{dayRems.length - MAX_VISUAL} itens
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* === VISÃO MOBILE: AGENDA VERTICAL === */}
          <div className="flex lg:hidden flex-col flex-1 bg-card/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl p-4 overflow-hidden relative">
            <h2 className="font-black text-xl mb-4 text-primary">Agenda Mensal</h2>
            <ScrollArea className="flex-1 pr-3 -mr-3">
              {mobileMonthReminders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 opacity-60">
                  <Inbox className="w-12 h-12 mb-3" />
                  <p className="font-bold">Nenhum evento neste mês</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pb-24">
                  {mobileMonthReminders.map(r => (
                     <ReminderCard 
                       key={r.id} 
                       reminder={r} 
                       showDate={true}
                       onToggle={toggleReminderStatus} 
                       onEdit={openEditModal} 
                       onDelete={deleteReminder} 
                     />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* === DESKTOP GLASS SIDE DRAWER (Sobreposição condicional) === */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div 
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
                className="hidden lg:flex flex-col w-[350px] shrink-0 bg-background/70 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl p-5 relative z-20"
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 rounded-full bg-background/50 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setSelectedDay(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
                
                <div className="mb-6 mt-2">
                  <p className="text-sm font-bold text-primary uppercase tracking-widest">
                    {format(selectedDay, "EEEE", { locale: ptBR })}
                  </p>
                  <h3 className="text-3xl font-black mt-1">
                    {format(selectedDay, "dd MMM", { locale: ptBR })}
                  </h3>
                </div>

                <ScrollArea className="flex-1 -mx-2 px-2">
                  {dayDetailsReminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                      <Inbox className="h-10 w-10 mb-3" />
                      <p className="font-semibold text-sm">Dia livre!</p>
                      <p className="text-xs">Nenhum lembrete para a data.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 pb-24">
                      {dayDetailsReminders.map(r => (
                        <ReminderCard 
                          key={r.id} 
                          reminder={r} 
                          showDate={false}
                          onToggle={toggleReminderStatus} 
                          onEdit={openEditModal} 
                          onDelete={deleteReminder} 
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="mt-4 shrink-0">
                  <Button 
                    className="w-full rounded-2xl h-12 font-bold shadow-lg bg-primary/90 hover:bg-primary"
                    onClick={() => openNewModal(selectedDay)}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Novo para este dia
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      ) : (
        /* === VISÃO DE LISTA COMPLETA === */
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex flex-col bg-card/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl p-6 lg:p-8 overflow-hidden relative z-10 transition-all duration-500 min-h-0"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-primary flex items-center gap-2">
              <AlignJustify className="hidden sm:block" />
              Todos os Lembretes
            </h2>
            <Badge variant="outline" className="px-4 py-1.5 font-bold shadow-sm backdrop-blur-md text-sm border-white/20">
               {validReminders.length} registros totais
            </Badge>
          </div>
          
          <ScrollArea className="flex-1 pr-4 -mr-4">
            {validReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                <Inbox className="h-16 w-16 mb-4" />
                <p className="font-bold text-lg">Nenhum lembrete registrado!</p>
                <p className="text-sm">Seu histórico está vazio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-24">
                {[...validReminders]
                  .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
                  .map(r => (
                    <ReminderCard 
                      key={r.id} 
                      reminder={r} 
                      showDate={true}
                      onToggle={toggleReminderStatus} 
                      onEdit={openEditModal} 
                      onDelete={deleteReminder} 
                    />
                ))}
              </div>
            )}
          </ScrollArea>
        </motion.div>
      )}

      {/* FAB GIGANTE NEON (Canto inferior Direito Global) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => openNewModal()}
        className="fixed bottom-8 right-8 z-50 h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-[0_10px_35px_-5px_rgba(var(--primary),0.8)] border border-white/20 transition-all hover:shadow-[0_15px_45px_-5px_rgba(var(--primary),1)] ring-4 ring-background overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <Plus className="w-8 h-8 relative z-10" />
      </motion.button>

      <AddReminderDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        selectedDate={selectedDay || new Date()}
        reminderToEdit={reminderToEdit}
        onSuccess={() => mutate()}
      />
    </div>
  )
}

// ==== SUB-COMPONENTE: CARD ESTILIZADO ====
function ReminderCard({ 
  reminder, 
  onToggle, 
  onEdit, 
  onDelete, 
  showDate = false 
}: { 
  reminder: Reminder & { parsedDate?: Date }
  onToggle: (id: string, status: boolean) => void
  onEdit: (r: Reminder) => void
  onDelete: (id: string) => void
  showDate?: boolean
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }}
      exit={{ opacity: 0, scale: 0.9, x: -20 }}
      className={cn(
        "group flex flex-col gap-1 rounded-[1.25rem] border p-4 transition-all duration-300 relative overflow-hidden",
        reminder.is_completed
          ? "bg-muted/10 border-border/20 opacity-60 grayscale hover:grayscale-0"
          : "bg-background/80 backdrop-blur-sm border-white/10 shadow-sm hover:shadow-lg hover:border-primary/30"
      )}
    >
      {/* Light sweep animation on unused items */}
      {!reminder.is_completed && (
         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-[150%] animate-[shimmer_3s_infinite] pointer-events-none" />
      )}

      <div className="flex items-start justify-between gap-3 relative z-10">
        <button
          onClick={() => onToggle(reminder.id, reminder.is_completed)}
          className="mt-0.5 flex-shrink-0 text-muted-foreground/60 hover:text-emerald-500 transition-all transform active:scale-90"
        >
          {reminder.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        
        <div className="flex-1 min-w-0 pr-1">
          <p
            className={cn(
              "font-bold leading-tight text-sm transition-all",
              reminder.is_completed ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary"
            )}
          >
            {reminder.title}
          </p>
          
          {showDate && reminder.parsedDate && (
             <p className="mt-1 text-[11px] font-black text-primary/80 uppercase tracking-widest flex items-center lg:hidden">
               <CalendarCheck className="w-3 h-3 mr-1" />
               {format(reminder.parsedDate, "dd MMM yyyy", { locale: ptBR })}
             </p>
          )}

          {reminder.description && (
            <p className="mt-1.5 text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
              {reminder.description}
            </p>
          )}
        </div>
        
        {/* Painel Flutuante Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity mt-[-2px] sm:mt-0 bg-background/50 rounded-full p-1 backdrop-blur-md border border-border/50">
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-foreground/70 hover:text-primary hover:bg-primary/20 rounded-full shrink-0"
            onClick={() => onEdit(reminder)} title="Editar"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-foreground/70 hover:text-destructive hover:bg-destructive/20 rounded-full shrink-0"
            onClick={() => onDelete(reminder.id)} title="Excluir"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {reminder.category && (
        <div className="flex flex-row items-center justify-between mt-2 pl-8 relative z-10 w-full pr-1">
          <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black text-primary border-primary/20 bg-primary/5">
            {reminder.category.name}
          </Badge>
        </div>
      )}
    </motion.div>
  )
}
