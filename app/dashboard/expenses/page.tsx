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
import { motion } from "framer-motion"
import { useSmartCategory } from "@/hooks/use-smart-category"
import { FileUpload } from "@/components/ui/file-upload"
import { uploadReceipt } from "@/lib/upload-receipt"

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
  receipt_url: string | null
}

const emptyForm: ExpenseForm = {
  name: "",
  value: "",
  date: "",
  payment_method: "debit",
  is_essential: false,
  category_id: "",
  receipt_url: null,
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

  useSmartCategory(
    form.name,
    expenseCategories,
    form.category_id,
    (id) => setForm((prev) => ({ ...prev, category_id: id }))
  )

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
      receipt_url: expense.receipt_url ?? null,
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
      toast.error("Usuário não autenticado")
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
      receipt_url: form.receipt_url || undefined,
    })

    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message ?? "Dados inválidos")
      setSaving(false)
      return
    }

    if (isFutureDate(form.date)) {
      toast.error("Data não pode ser futura")
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
      receipt_url: form.receipt_url || null,
    }

    if (editId) {
      const { error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar despesa")
      else toast.success("Despesa atualizada com sucesso")
    } else {
      const { error } = await supabase.from("expenses").insert(payload)
      if (error) toast.error("Erro ao criar despesa")
      else toast.success("Despesa registrada com sucesso")
    }

    setSaving(false)
    setDialogOpen(false)
    mutate(["expenses", periodId])
  }

  const handleDelete = async () => {
    if (!deleteId || !periodId) return
    setSaving(true)
    const supabase = createClient()
    const expenseToDelete = (expenses ?? []).find(
      (expense) => expense.id === deleteId
    )
    const { error } = await supabase.from("expenses").delete().eq("id", deleteId)
    if (error) {
      toast.error("Erro ao excluir despesa")
      setSaving(false)
      return
    }

    if (expenseToDelete?.bill_id) {
      const { error: billError } = await supabase
        .from("bills")
        .update({ is_paid: false })
        .eq("id", expenseToDelete.bill_id)
      if (billError) {
        toast.error("Despesa excluída, mas não foi possível atualizar a conta")
      } else {
        mutate(["bills", periodId])
        toast.success("Despesa excluída e conta marcada como pendente")
      }
    } else {
      toast.success("Despesa excluída com sucesso")
    }
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
      is_essential: expense.is_essential ? "Essencial" : "Não essencial",
      category: categoryMap.get(expense.category_id ?? "") ?? "Sem categoria",
    }))
    exportToCSV(rows, "despesas", [
      { key: "name", label: "Nome" },
      { key: "date", label: "Data" },
      { key: "value", label: "Valor" },
      { key: "payment_method", label: "Método" },
      { key: "is_essential", label: "Tipo" },
      { key: "category", label: "Categoria" },
    ])
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Despesas</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
        <Button onClick={openNew} className="rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Nova Despesa</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-panel border-0 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-0 top-0 w-24 h-24 bg-destructive/5 rounded-bl-full transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Despesas
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-bold text-destructive">
              {formatCurrency(total)}
            </p>
          </CardContent>
        </Card>
        
        {byMethod
          .filter((m) => m.total > 0)
          .map((m) => {
            const isCredit = m.key === "credit"
            const iconBg = isCredit ? "bg-primary/10" : "bg-blue-500/10"
            const iconColor = isCredit ? "text-primary" : "text-blue-500"
            const cornerBg = isCredit ? "bg-primary/5" : "bg-blue-500/5"
            return (
              <Card key={m.key} className="glass-panel border-0 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className={`absolute right-0 top-0 w-24 h-24 ${cornerBg} rounded-bl-full transition-transform group-hover:scale-110`} />
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {m.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(m.total)}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">
                    {total > 0 ? ((m.total / total) * 100).toFixed(1) : 0}% do total
                  </p>
                </CardContent>
              </Card>
            )
          })}
      </div>

      {/* Table */}
      <Card className="glass-panel border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 sm:p-5 border-b border-border/50">
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
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={`sk-${i}`} className="h-14 rounded-xl opacity-50" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-2">
                <TrendingDown className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">Nenhuma despesa encontrada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione sua primeira despesa deste formato ou ajuste os filtros.
                </p>
              </div>
              <Button variant="outline" className="mt-4 rounded-full" onClick={openNew}>
                Começar a adicionar
              </Button>
            </div>
          ) : (
            <>
              <div className="lg:hidden p-4 bg-muted/20">
                <MobileCards
                  items={filteredExpenses.map((expense) => ({
                    id: expense.id,
                    name: expense.name,
                    value: Number(expense.value),
                    date: expense.date,
                    badges: [
                      {
                        label: categoryMap.get(expense.category_id ?? "") ?? "Sem categoria",
                        variant: categoryMap.get(expense.category_id ?? "") ? "secondary" : "outline",
                      },
                      {
                        label: PAYMENT_METHODS[expense.payment_method],
                        variant: "outline",
                      },
                      {
                        label: expense.is_essential ? "Essencial" : "Não Essencial",
                        variant: "outline",
                        className: expense.is_essential ? "" : "border-warning/30 text-warning",
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
                  <TableHeader className="bg-muted/30 hover:bg-muted/30">
                    <TableRow className="border-border/50">
                      <TableHead className="font-medium">Nome</TableHead>
                      <TableHead className="font-medium">Data</TableHead>
                      <TableHead className="font-medium">Categoria</TableHead>
                      <TableHead className="font-medium">Método</TableHead>
                      <TableHead className="font-medium">Tipo</TableHead>
                      <TableHead className="text-right font-medium">Valor</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          {expense.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(expense.date)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-secondary/50 hover:bg-secondary">
                            {categoryMap.get(expense.category_id ?? "") ?? "Sem categoria"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border/50 text-muted-foreground">
                            {PAYMENT_METHODS[expense.payment_method]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expense.is_essential ? (
                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">Essencial</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-warning/30 bg-warning/5 text-warning"
                            >
                              Não Essencial
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-[15px] font-bold text-destructive">
                          {formatCurrency(Number(expense.value))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                              onClick={() => openEdit(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
                              onClick={() => {
                                setDeleteId(expense.id)
                                setDeleteOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
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
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Qual foi a despesa?</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Mercado, Uber..."
              className="h-11"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Quando?</Label>
              <Input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label>Método de Pagamento</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) => setForm({ ...form, payment_method: v })}
              >
                <SelectTrigger className="h-11">
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
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={form.category_id || "none"}
              onValueChange={(value) =>
                setForm({ ...form, category_id: value === "none" ? "" : value })
              }
            >
              <SelectTrigger id="category" className="h-11">
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
          <div className="flex items-center gap-3 p-3 mt-2 rounded-xl border border-border/50 bg-muted/20">
            <Switch
              checked={form.is_essential}
              onCheckedChange={(v) => setForm({ ...form, is_essential: v })}
            />
            <div className="flex flex-col">
              <Label className="text-sm font-medium">Despesa Essencial</Label>
              <span className="text-xs text-muted-foreground mt-0.5">Marque se este gasto for vital para o seu mês.</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Comprovante (Opcional)</Label>
            <FileUpload
              value={form.receipt_url}
              onChange={(url) => setForm({ ...form, receipt_url: url })}
              onUpload={uploadReceipt}
              disabled={saving}
            />
          </div>
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
    </motion.div>
  )
}
