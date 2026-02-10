"use client"

import React from "react"

import { useState } from "react"
import { usePeriod } from "@/lib/period-context"
import { useCategories, useIncomes } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, MONTHS } from "@/lib/format"
import { parseMoneyToNumber } from "@/lib/money"
import { incomeSchema } from "@/lib/validators"
import { isFutureDate } from "@/lib/date"
import { toast } from "sonner"
import { mutate } from "swr"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoneyInput } from "@/components/ui/money-input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CrudDialog } from "@/components/dashboard/crud-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import {
  AdvancedFilters,
  emptyFilters,
  exportToCSV,
  useFilteredData,
} from "@/components/dashboard/advanced-filters"
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface IncomeForm {
  name: string
  value: string
  date: string
  category_id: string
}

const emptyForm: IncomeForm = { name: "", value: "", date: "", category_id: "" }

export default function IncomesPage() {
  const { month, year, periodId, isLoading: periodLoading } = usePeriod()
  const { data: incomes, isLoading } = useIncomes(periodId)
  const { data: categories } = useCategories()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<IncomeForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState(emptyFilters)

  const incomeCategories = (categories ?? []).filter(
    (cat) => cat.type === "income"
  )
  const categoryMap = new Map(
    incomeCategories.map((cat) => [cat.id, cat.name])
  )
  const filteredIncomes = useFilteredData(incomes ?? [], filters)

  const total = filteredIncomes.reduce(
    (sum, i) => sum + Number(i.value),
    0
  )

  const openNew = () => {
    setForm({
      ...emptyForm,
      date: `${year}-${String(month).padStart(2, "0")}-01`,
    })
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (income: (typeof incomes extends (infer T)[] | undefined ? T : never)) => {
    if (!income) return
    setForm({
      name: income.name,
      value: String(income.value),
      date: income.date,
      category_id: income.category_id ?? "",
    })
    setEditId(income.id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!periodId) return
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

    const parsedValue = parseMoneyToNumber(form.value)
    const validation = incomeSchema.safeParse({
      name: form.name,
      value: parsedValue,
      date: form.date,
      category_id: form.category_id || undefined,
    })

    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message ?? "Dados invalidos")
      setSaving(false)
      return
    }

    if (isFutureDate(form.date)) {
      toast.error("Data nao pode ser futura")
      setSaving(false)
      return
    }

    const payload = {
      user_id: user.id,
      period_id: periodId,
      name: form.name,
      value: parsedValue,
      date: form.date,
      category_id: form.category_id || null,
    }

    if (editId) {
      const { error } = await supabase
        .from("incomes")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar receita")
      else toast.success("Receita atualizada")
    } else {
      const { error } = await supabase.from("incomes").insert(payload)
      if (error) toast.error("Erro ao criar receita")
      else toast.success("Receita criada")
    }

    setSaving(false)
    setDialogOpen(false)
    mutate(["incomes", periodId])
  }

  const handleDelete = async () => {
    if (!deleteId || !periodId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("incomes").delete().eq("id", deleteId)
    if (error) toast.error("Erro ao excluir receita")
    else toast.success("Receita excluida")
    setSaving(false)
    setDeleteOpen(false)
    setDeleteId(null)
    mutate(["incomes", periodId])
  }

  const handleExport = () => {
    const rows = filteredIncomes.map((income) => ({
      name: income.name,
      date: formatDate(income.date),
      value: formatCurrency(Number(income.value)),
      category: categoryMap.get(income.category_id ?? "") ?? "Sem categoria",
    }))
    exportToCSV(rows, "receitas", [
      { key: "name", label: "Nome" },
      { key: "date", label: "Data" },
      { key: "value", label: "Valor" },
      { key: "category", label: "Categoria" },
    ])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Receita
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Receitas
          </CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(total)}
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <AdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
              onExport={handleExport}
              showCategory
              categories={incomeCategories}
              itemCount={filteredIncomes.length}
              totalValue={total}
            />
          </div>
          {isLoading || periodLoading ? (
            <div className="flex flex-col gap-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`sk-${
                  // biome-ignore lint: index
                  i
                }`} className="h-10" />
              ))}
            </div>
          ) : filteredIncomes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhuma receita cadastrada</p>
              <Button variant="outline" onClick={openNew}>
                Adicionar receita
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20 text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="font-medium">{income.name}</TableCell>
                    <TableCell>{formatDate(income.date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryMap.get(income.category_id ?? "") ??
                          "Sem categoria"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {formatCurrency(Number(income.value))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(income)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteId(income.id)
                            setDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editId ? "Editar Receita" : "Nova Receita"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <div className="grid gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Salario"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="value">Valor (R$)</Label>
          <MoneyInput
            id="value"
            required
            value={form.value}
            onValueChange={(value) => setForm({ ...form, value })}
            placeholder="0,00"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Categoria</Label>
          <Select
            value={form.category_id || "none"}
            onValueChange={(value) =>
              setForm({ ...form, category_id: value === "none" ? "" : value })
            }
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Sem categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem categoria</SelectItem>
              {incomeCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CrudDialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={saving}
        itemName="esta receita"
      />
    </div>
  )
}
