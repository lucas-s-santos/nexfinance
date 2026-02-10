"use client"

import { useState } from "react"
import { useRecurringBills } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { billSchema } from "@/lib/validators"
import { logAudit } from "@/lib/audit"
import { parseMoneyToNumber } from "@/lib/money"
import { toast } from "sonner"
import { mutate } from "swr"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { MoneyInput } from "@/components/ui/money-input"
import { CrudDialog } from "@/components/dashboard/crud-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { Plus, Pencil, Trash2, Repeat } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface RecurringForm {
  name: string
  value: string
  due_day: string
  is_planned: boolean
  is_active: boolean
}

const emptyForm: RecurringForm = {
  name: "",
  value: "",
  due_day: "1",
  is_planned: false,
  is_active: true,
}

export default function RecurringBillsPage() {
  const { data: recurring, isLoading } = useRecurringBills()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<RecurringForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openNew = () => {
    setForm(emptyForm)
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (item: NonNullable<typeof recurring>[number]) => {
    setForm({
      name: item.name,
      value: String(item.value),
      due_day: String(item.due_day),
      is_planned: item.is_planned,
      is_active: item.is_active,
    })
    setEditId(item.id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericValue = parseMoneyToNumber(form.value)
    const parsed = billSchema.safeParse({
      name: form.name,
      value: numericValue,
      due_date: "2000-01-01",
      is_planned: form.is_planned,
      is_paid: false,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados invalidos")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      name: form.name,
      value: numericValue,
      due_day: Number(form.due_day),
      is_planned: form.is_planned,
      is_active: form.is_active,
    }

    if (editId) {
      const { error } = await supabase
        .from("recurring_bills")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar recorrencia")
      else {
        toast.success("Recorrencia atualizada")
        await logAudit("recurring_bills", editId, "update", payload)
      }
    } else {
      const { data, error } = await supabase
        .from("recurring_bills")
        .insert(payload)
        .select("id")
        .single()
      if (error) toast.error("Erro ao criar recorrencia")
      else {
        toast.success("Recorrencia criada")
        await logAudit("recurring_bills", data?.id ?? null, "insert", payload)
      }
    }

    setSaving(false)
    setDialogOpen(false)
    mutate("recurring_bills")
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("recurring_bills")
      .delete()
      .eq("id", deleteId)
    if (error) toast.error("Erro ao excluir recorrencia")
    else {
      toast.success("Recorrencia excluida")
      await logAudit("recurring_bills", deleteId, "delete")
    }
    setSaving(false)
    setDeleteOpen(false)
    setDeleteId(null)
    mutate("recurring_bills")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recorrentes</h1>
          <p className="text-muted-foreground">
            Contas clonadas automaticamente todo mes.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Recorrencia
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`sk-${i}`} className="h-10" />
              ))}
            </div>
          ) : (recurring ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Repeat className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhuma recorrencia</p>
              <Button variant="outline" onClick={openNew}>
                Criar recorrencia
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 p-6 md:grid-cols-2">
              {(recurring ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dia {item.due_day} • {item.is_planned ? "Planejada" : "Nao planejada"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={async (value) => {
                        const supabase = createClient()
                        await supabase
                          .from("recurring_bills")
                          .update({ is_active: value })
                          .eq("id", item.id)
                        mutate("recurring_bills")
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeleteId(item.id)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Excluir</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editId ? "Editar Recorrencia" : "Nova Recorrencia"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <div className="grid gap-2">
          <Label>Nome</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Aluguel"
          />
        </div>
        <div className="grid gap-2">
          <Label>Valor</Label>
          <MoneyInput
            value={form.value}
            onValueChange={(value) => setForm({ ...form, value })}
            placeholder="0,00"
          />
        </div>
        <div className="grid gap-2">
          <Label>Dia do vencimento</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={form.due_day}
            onChange={(e) => setForm({ ...form, due_day: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_planned}
            onCheckedChange={(value) =>
              setForm({ ...form, is_planned: value })
            }
          />
          <Label>Conta planejada</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_active}
            onCheckedChange={(value) =>
              setForm({ ...form, is_active: value })
            }
          />
          <Label>Ativa</Label>
        </div>
      </CrudDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={saving}
        itemName="esta recorrencia"
      />
    </div>
  )
}
