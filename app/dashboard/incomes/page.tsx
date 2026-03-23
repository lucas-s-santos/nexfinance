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
import { motion } from "framer-motion"
import { useSmartCategory } from "@/hooks/use-smart-category"
import { FileUpload } from "@/components/ui/file-upload"
import { uploadReceipt } from "@/lib/upload-receipt"

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
import { MobileCards } from "@/components/dashboard/mobile-cards" // if exists, but we can render inline for incomes or use the component

interface IncomeForm {
  name: string
  value: string
  date: string
  category_id: string
  receipt_url: string | null
}

const emptyForm: IncomeForm = { name: "", value: "", date: "", category_id: "", receipt_url: null }

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

  useSmartCategory(
    form.name,
    incomeCategories,
    form.category_id,
    (id) => setForm((prev) => ({ ...prev, category_id: id }))
  )

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
      receipt_url: income.receipt_url ?? null,
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
      toast.error("Usuário não autenticado")
      setSaving(false)
      return
    }

    const parsedValue = parseMoneyToNumber(form.value)
    const validation = incomeSchema.safeParse({
      name: form.name,
      value: parsedValue,
      date: form.date,
      category_id: form.category_id || undefined,
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
      receipt_url: form.receipt_url || null,
    }

    if (editId) {
      const { error } = await supabase
        .from("incomes")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar receita")
      else toast.success("Receita atualizada com sucesso")
    } else {
      const { error } = await supabase.from("incomes").insert(payload)
      if (error) toast.error("Erro ao registrar receita")
      else toast.success("Receita registrada com sucesso")
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
    else toast.success("Receita excluída com sucesso")
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Receitas</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
        <Button onClick={openNew} className="rounded-full shadow-lg shadow-success/20 hover:scale-105 transition-transform bg-success text-success-foreground hover:bg-success/90">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Nova Receita</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Summary */}
      <Card className="glass-panel border-0 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute right-0 top-0 w-32 h-32 bg-success/5 rounded-bl-full transition-transform group-hover:scale-110" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Receitas
          </CardTitle>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <p className="text-3xl font-bold text-success">
            {formatCurrency(total)}
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-panel border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 sm:p-5 border-b border-border/50">
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
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={`sk-${i}`} className="h-14 rounded-xl opacity-50" />
              ))}
            </div>
          ) : filteredIncomes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-2">
                <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">Nenhuma receita encontrada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione sua primeira receita deste formato ou ajuste os filtros.
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
                  items={filteredIncomes.map((income) => ({
                    id: income.id,
                    name: income.name,
                    value: Number(income.value),
                    date: income.date,
                    badges: [
                      {
                        label: categoryMap.get(income.category_id ?? "") ?? "Sem categoria",
                        variant: categoryMap.get(income.category_id ?? "") ? "secondary" : "outline",
                      },
                    ],
                    valueColor: "text-success",
                  }))}
                  onEdit={(id) => {
                    const income = filteredIncomes.find((e) => e.id === id)
                    if (income) openEdit(income)
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
                      <TableHead className="text-right font-medium">Valor</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncomes.map((income) => (
                      <TableRow key={income.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-foreground">{income.name}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(income.date)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-secondary/50 hover:bg-secondary">
                            {categoryMap.get(income.category_id ?? "") ??
                              "Sem categoria"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-[15px] font-bold text-success">
                          {formatCurrency(Number(income.value))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                              onClick={() => openEdit(income)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
                              onClick={() => {
                                setDeleteId(income.id)
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
        title={editId ? "Editar Receita" : "Nova Receita"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">De onde veio essa receita?</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Salário, Pix João..."
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="date">Quando entrou?</Label>
              <Input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-11"
              />
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
                {incomeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        itemName="esta receita"
      />
    </motion.div>
  )
}
