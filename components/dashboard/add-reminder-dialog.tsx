"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCategories } from "@/lib/use-financial-data"
import { toast } from "sonner"
import { format } from "date-fns"
import { Reminder } from "@/lib/use-reminders"

import { CrudDialog } from "@/components/dashboard/crud-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AddReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  reminderToEdit: Reminder | null
  onSuccess: () => void
}

export function AddReminderDialog({
  open,
  onOpenChange,
  selectedDate,
  reminderToEdit,
  onSuccess,
}: AddReminderDialogProps) {
  const { data: categories } = useCategories()
  const reminderCategories = (categories ?? []).filter(c => c.type === "reminder")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState<string>("none")
  const [saving, setSaving] = useState(false)

  // Quando abrir com editMode, popula os estados
  useEffect(() => {
    if (open) {
      if (reminderToEdit) {
        setTitle(reminderToEdit.title)
        setDescription(reminderToEdit.description || "")
        setCategoryId(reminderToEdit.category_id || "none")
      } else {
        setTitle("")
        setDescription("")
        setCategoryId("none")
      }
    }
  }, [open, reminderToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // No edit mode, we might not rely on selectedDate if they don't change the date, but currently we just keep the selectedDate passed by the parent. 
    // In our Calendar, clicking "Edit" will pass the reminder and the date it was already on.
    if (!selectedDate && !reminderToEdit) return
    if (!title.trim()) {
      toast.error("O título é obrigatório.")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não encontrado")

      // Use a data selecionada atualmente ou mantém a data do lembrete alvo (caso mude)
      // Como o design ainda não permite trocar a data dentro do modal, usaremos a selectedDate.
      const dateTarget = selectedDate 
        ? format(selectedDate, "yyyy-MM-dd") 
        : (reminderToEdit?.date ? reminderToEdit.date.split("T")[0] : format(new Date(), "yyyy-MM-dd"))

      const payload = {
        category_id: categoryId !== "none" ? categoryId : null,
        date: dateTarget,
        title: title.trim(),
        description: description.trim() || null,
      }

      if (reminderToEdit) {
        // Atualiza
        const { error } = await supabase
          .from("reminders")
          .update(payload)
          .eq("id", reminderToEdit.id)
        if (error) throw error
        toast.success("Lembrete atualizado!")
      } else {
        // Insere
        const insertPayload = {
          ...payload,
          user_id: user.id,
          type: "general",
          is_completed: false,
        }
        const { error } = await supabase.from("reminders").insert(insertPayload)
        if (error) throw error
        toast.success("Lembrete salvo com sucesso!")
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar lembrete")
    } finally {
      setSaving(false)
    }
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={reminderToEdit 
        ? `Editar Lembrete` 
        : `Novo Lembrete (${selectedDate ? format(selectedDate, "dd/MM/yyyy") : ""})`}
      onSubmit={handleSubmit}
      isLoading={saving}
    >
      <div className="grid gap-2 text-left">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Pagar fatura..."
          autoFocus
        />
      </div>

      <div className="grid gap-2 text-left">
        <Label htmlFor="category">Categoria</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Selecione uma categoria..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem categoria</SelectItem>
            {reminderCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 text-left">
        <Label htmlFor="description">Descrição (Opcional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes adicionais..."
          className="min-h-[80px] resize-none"
        />
      </div>
    </CrudDialog>
  )
}
