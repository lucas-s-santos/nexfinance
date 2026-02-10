"use client"

import { useState, useMemo } from "react"
import { usePeriod } from "@/lib/period-context"
import { useBudgets, useCategories, useExpenses } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { budgetSchema } from "@/lib/validators"
import { logAudit } from "@/lib/audit"
import { formatCurrency, MONTHS } from "@/lib/format"
import { toast } from "sonner"
import { mutate } from "swr"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CrudDialog } from "@/components/dashboard/crud-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { MoneyInput } from "@/components/ui/money-input"
import { Plus, Pencil, Trash2, Target } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { parseMoneyToNumber } from "@/lib/money"

interface BudgetForm {
  category_id: string
  limit_value: string
}

const emptyForm: BudgetForm = {
  category_id: "",
  limit_value: "",
}

export default function BudgetsPage() {
  const { month, year, periodId } = usePeriod()
  const { data: budgets, isLoading } = useBudgets(month, year)
  const { data: categories } = useCategories()
  const { data: expenses } = useExpenses(periodId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<BudgetForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const expenseCategories = (categories ?? []).filter(
    (cat) => cat.type === "expense"
  )
  const categoryMap = new Map(
    expenseCategories.map((cat) => [cat.id, cat.name])
  )

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const expense of expenses ?? []) {
      if (!expense.category_id) continue
      const current = map.get(expense.category_id) ?? 0
      map.set(expense.category_id, current + Number(expense.value))
    }
    return map
  }, [expenses])

  const openNew = () => {
    setForm(emptyForm)
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (budget: NonNullable<typeof budgets>[number]) => {
    setForm({
      category_id: budget.category_id,
      limit_value: String(budget.limit_value),
    })
    setEditId(budget.id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const limitValue = parseMoneyToNumber(form.limit_value)
    const parsed = budgetSchema.safeParse({
      category_id: form.category_id,
      month,
      year,
      limit_value: limitValue,
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
      category_id: form.category_id,
      month,
      year,
      limit_value: limitValue,
    }

    if (editId) {
      const { error } = await supabase
        .from("budgets")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar orcamento")
      else {
        toast.success("Orcamento atualizado")
        await logAudit("budgets", editId, "update", payload)
      }
    } else {
      const { data, error } = await supabase
        .from("budgets")
        .insert(payload)
        .select("id")
        .single()
      if (error) toast.error("Erro ao criar orcamento")
      else {
        toast.success("Orcamento criado")
        await logAudit("budgets", data?.id ?? null, "insert", payload)
      }
    }

    setSaving(false)
    setDialogOpen(false)
    mutate(["budgets", month, year])
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("budgets").delete().eq("id", deleteId)
    if (error) toast.error("Erro ao excluir orcamento")
    else {
      toast.success("Orcamento excluido")
      await logAudit("budgets", deleteId, "delete")
    }
    setSaving(false)
    setDeleteOpen(false)
    setDeleteId(null)
    mutate(["budgets", month, year])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orcamentos</h1>
          <p className="text-muted-foreground">
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Orcamento
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
          ) : (budgets ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Target className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                Nenhum orcamento cadastrado
              </p>
              <Button variant="outline" onClick={openNew}>
                Criar orcamento
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 p-6 md:grid-cols-2">
              {(budgets ?? []).map((budget) => {
                const spent = spentByCategory.get(budget.category_id) ?? 0
                const percent = budget.limit_value > 0 ? (spent / budget.limit_value) * 100 : 0
                return (
                  <div
                    key={budget.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {categoryMap.get(budget.category_id) ?? "Sem categoria"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {percent.toFixed(0)}% usado
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(spent)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Limite {formatCurrency(Number(budget.limit_value))}
                      </p>
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(budget)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteId(budget.id)
                            setDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editId ? "Editar Orcamento" : "Novo Orcamento"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <div className="grid gap-2">
          <Label>Categoria</Label>
          <Select
            value={form.category_id || "none"}
            onValueChange={(value) =>
              setForm({ ...form, category_id: value === "none" ? "" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione</SelectItem>
              {expenseCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Limite (R$)</Label>
          <MoneyInput
            value={form.limit_value}
            onValueChange={(val) => setForm({ ...form, limit_value: val })}
            placeholder="0,00"
          />
        </div>
      </CrudDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={saving}
        itemName="este orcamento"
      />
    </div>
  )
}
