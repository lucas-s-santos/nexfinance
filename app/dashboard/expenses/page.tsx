"use client"

import React from "react"

import { useState } from "react"
import { usePeriod } from "@/lib/period-context"
import { useCategories, useExpenses } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, MONTHS, PAYMENT_METHODS } from "@/lib/format"
import { parseMoneyToNumber } from "@/lib/money"
import { expenseSchema } from "@/lib/validators"
import { isFutureDate } from "@/lib/date"
import { toast } from "sonner"
import { mutate } from "swr"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoneyInput } from "@/components/ui/money-input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { CrudDialog } from "@/components/dashboard/crud-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import {
  AdvancedFilters,
  emptyFilters,
  exportToCSV,
  useFilteredData,
} from "@/components/dashboard/advanced-filters"
import { MobileCards } from "@/components/dashboard/mobile-cards"
import { Plus, Pencil, Trash2, TrendingDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface ExpenseForm {
  name: string
  value: string
  date: string
  payment_method: string
  is_essential: boolean
  category_id: string
}

const emptyForm: ExpenseForm = {
  name: "",
  value: "",
  date: "",
  payment_method: "debit",
  is_essential: false,
  category_id: "",
}

export default function ExpensesPage() {
  const { month, year, periodId, isLoading: periodLoading } = usePeriod()
  const { data: expenses, isLoading } = useExpenses(periodId)
  const { data: categories } = useCategories()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<ExpenseForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState(emptyFilters)

  const expenseCategories = (categories ?? []).filter(
    (cat) => cat.type === "expense"
  )
  const categoryMap = new Map(
    expenseCategories.map((cat) => [cat.id, cat.name])
  )

  const filteredExpenses = useFilteredData(expenses ?? [], filters)

  const total = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.value),
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

  const openEdit = (expense: NonNullable<typeof expenses>[number]) => {
    setForm({
      name: expense.name,
      value: String(expense.value),
      date: expense.date,
      payment_method: expense.payment_method,
      is_essential: expense.is_essential,
      category_id: expense.category_id ?? "",
    })
    setEditId(expense.id)
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
    const validation = expenseSchema.safeParse({
      name: form.name,
      value: parsedValue,
      date: form.date,
      category_id: form.category_id || undefined,
      payment_method: form.payment_method,
      is_essential: form.is_essential,
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
      payment_method: form.payment_method,
      is_essential: form.is_essential,
    }

    if (editId) {
      const { error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar despesa")
      else toast.success("Despesa atualizada")
    } else {
      const { error } = await supabase.from("expenses").insert(payload)
      if (error) toast.error("Erro ao criar despesa")
      else toast.success("Despesa criada")
    }

    setSaving(false)
    setDialogOpen(false)
    mutate(["expenses", periodId])
  }

  const handleDelete = async () => {
    if (!deleteId || !periodId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("expenses").delete().eq("id", deleteId)
    if (error) toast.error("Erro ao excluir despesa")
    else toast.success("Despesa excluida")
    setSaving(false)
    setDeleteOpen(false)
    setDeleteId(null)
    mutate(["expenses", periodId])
  }

  // Totals by payment method
  const byMethod = Object.entries(PAYMENT_METHODS).map(([key, label]) => ({
    key,
    label,
    total: filteredExpenses
      .filter((e) => e.payment_method === key)
      .reduce((sum, e) => sum + Number(e.value), 0),
  }))

  const handleExport = () => {
    const rows = filteredExpenses.map((expense) => ({
      name: expense.name,
      date: formatDate(expense.date),
      value: formatCurrency(Number(expense.value)),
      payment_method: PAYMENT_METHODS[expense.payment_method],
      is_essential: expense.is_essential ? "Essencial" : "Nao essencial",
      category: categoryMap.get(expense.category_id ?? "") ?? "Sem categoria",
    }))
    exportToCSV(rows, "despesas", [
      { key: "name", label: "Nome" },
      { key: "date", label: "Data" },
      { key: "value", label: "Valor" },
      { key: "payment_method", label: "Metodo" },
      { key: "is_essential", label: "Tipo" },
      { key: "category", label: "Categoria" },
    ])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground">
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Despesa
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Despesas
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(total)}
            </p>
          </CardContent>
        </Card>
        {byMethod
          .filter((m) => m.total > 0)
          .map((m) => (
            <Card key={m.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {m.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(m.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {total > 0 ? ((m.total / total) * 100).toFixed(1) : 0}% do total
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <AdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
              onExport={handleExport}
              showPaymentMethod
              showEssential
              showCategory
              categories={expenseCategories}
              itemCount={filteredExpenses.length}
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
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <TrendingDown className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                Nenhuma despesa cadastrada
              </p>
              <Button variant="outline" onClick={openNew}>
                Adicionar despesa
              </Button>
            </div>
          ) : (
            <>
              <div className="lg:hidden p-4">
                <MobileCards
                  items={filteredExpenses.map((expense) => ({
                    id: expense.id,
                    name: expense.name,
                    value: Number(expense.value),
                    date: expense.date,
                    badges: [
                      {
                        label:
                          categoryMap.get(expense.category_id ?? "") ??
                          "Sem categoria",
                        variant: "secondary",
                      },
                      {
                        label: PAYMENT_METHODS[expense.payment_method],
                        variant: "outline",
                      },
                      {
                        label: expense.is_essential
                          ? "Essencial"
                          : "Nao Essencial",
                        variant: "outline",
                        className: expense.is_essential
                          ? ""
                          : "border-warning/30 text-warning",
                      },
                    ],
                    valueColor: "text-destructive",
                  }))}
                  onEdit={(id) => {
                    const expense = filteredExpenses.find((e) => e.id === id)
                    if (expense) openEdit(expense)
                  }}
                  onDelete={(id) => {
                    setDeleteId(id)
                    setDeleteOpen(true)
                  }}
                />
              </div>
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Metodo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-20 text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {expense.name}
                        </TableCell>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categoryMap.get(expense.category_id ?? "") ??
                              "Sem categoria"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {PAYMENT_METHODS[expense.payment_method]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expense.is_essential ? (
                            <Badge variant="outline">Essencial</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-warning/30 text-warning"
                            >
                              Nao Essencial
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(Number(expense.value))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(expense)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeleteId(expense.id)
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editId ? "Editar Despesa" : "Nova Despesa"}
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
            placeholder="Ex: Mercado"
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
              {expenseCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Metodo de Pagamento</Label>
          <Select
            value={form.payment_method}
            onValueChange={(v) => setForm({ ...form, payment_method: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_essential}
            onCheckedChange={(v) => setForm({ ...form, is_essential: v })}
          />
          <Label>Despesa essencial</Label>
        </div>
      </CrudDialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={saving}
        itemName="esta despesa"
      />
    </div>
  )
}
