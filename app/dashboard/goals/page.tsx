"use client"

import React from "react"

import { useState } from "react"
import { useGoals } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/format"
import { parseMoneyToNumber } from "@/lib/money"
import { goalSchema } from "@/lib/validators"
import { toast } from "sonner"
import { mutate } from "swr"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoneyInput } from "@/components/ui/money-input"
import { Progress } from "@/components/ui/progress"
import { CrudDialog } from "@/components/dashboard/crud-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { Plus, Pencil, Trash2, Target } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface GoalForm {
  name: string
  target_value: string
  current_value: string
  deadline: string
}

const emptyForm: GoalForm = {
  name: "",
  target_value: "",
  current_value: "0",
  deadline: "",
}

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<GoalForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openNew = () => {
    setForm(emptyForm)
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (goal: NonNullable<typeof goals>[number]) => {
    setForm({
      name: goal.name,
      target_value: String(goal.target_value),
      current_value: String(goal.current_value),
      deadline: goal.deadline ?? "",
    })
    setEditId(goal.id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Usuario nao autenticado")
      setSaving(false)
      return
    }

    const parsedTarget = parseMoneyToNumber(form.target_value)
    const parsedCurrent = parseMoneyToNumber(form.current_value)
    const validation = goalSchema.safeParse({
      name: form.name,
      target_value: parsedTarget,
      current_value: parsedCurrent,
      deadline: form.deadline || undefined,
    })

    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message ?? "Dados invalidos")
      setSaving(false)
      return
    }

    const payload = {
      user_id: user.id,
      name: form.name,
      target_value: parsedTarget,
      current_value: parsedCurrent,
      deadline: form.deadline || null,
    }

    if (editId) {
      const { error } = await supabase
        .from("financial_goals")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar meta")
      else toast.success("Meta atualizada")
    } else {
      const { error } = await supabase.from("financial_goals").insert(payload)
      if (error) toast.error("Erro ao criar meta")
      else toast.success("Meta criada")
    }

    setSaving(false)
    setDialogOpen(false)
    mutate("goals")
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("financial_goals")
      .delete()
      .eq("id", deleteId)
    if (error) toast.error("Erro ao excluir meta")
    else toast.success("Meta excluida")
    setSaving(false)
    setDeleteOpen(false)
    setDeleteId(null)
    mutate("goals")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Metas Financeiras
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso das suas metas
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {/* Goals grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`sk-${
              // biome-ignore lint: index
              i
            }`} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (goals ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Target className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Nenhuma meta cadastrada
            </p>
            <Button variant="outline" onClick={openNew}>
              Criar meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(goals ?? []).map((goal) => {
            const target = Number(goal.target_value)
            const current = Number(goal.current_value)
            const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0
            const remaining = Math.max(target - current, 0)

            return (
              <Card key={goal.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-card-foreground">
                      {goal.name}
                    </CardTitle>
                    {goal.deadline && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Prazo:{" "}
                        {new Intl.DateTimeFormat("pt-BR").format(
                          new Date(goal.deadline)
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(goal)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeleteId(goal.id)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Excluir</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Atual</p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(current)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Meta</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(target)}
                      </p>
                    </div>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{progress.toFixed(1)}% concluido</span>
                    <span>Faltam {formatCurrency(remaining)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editId ? "Editar Meta" : "Nova Meta"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <div className="grid gap-2">
          <Label htmlFor="name">Nome da Meta</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Viagem Europa"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="target_value">Valor Alvo (R$)</Label>
          <MoneyInput
            id="target_value"
            required
            value={form.target_value}
            onValueChange={(value) =>
              setForm({ ...form, target_value: value })
            }
            placeholder="0,00"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="current_value">Valor Atual (R$)</Label>
          <MoneyInput
            id="current_value"
            required
            value={form.current_value}
            onValueChange={(value) =>
              setForm({ ...form, current_value: value })
            }
            placeholder="0,00"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="deadline">Prazo (opcional)</Label>
          <Input
            id="deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
        </div>
      </CrudDialog>

      {/* Delete */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={saving}
        itemName="esta meta"
      />
    </div>
  )
}
