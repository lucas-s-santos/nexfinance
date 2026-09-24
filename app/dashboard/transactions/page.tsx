"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, PAYMENT_METHODS, MONTHS } from "@/lib/format"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2, TrendingUp, TrendingDown, Landmark, Search, Filter } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { CrudDialog } from "@/components/dashboard/crud-dialog"
import { MoneyInput } from "@/components/ui/money-input"
import { Label } from "@/components/ui/label"
import { parseMoneyToNumber } from "@/lib/money"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCategories } from "@/lib/use-financial-data"

export type UnifiedTransaction = {
  id: string
  name: string
  value: number
  date: string
  type: "income" | "expense" | "investment"
  table: "incomes" | "expenses" | "reserves_investments"
  method?: string
  categoryId?: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingTable, setDeletingTable] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [editingTx, setEditingTx] = useState<UnifiedTransaction | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", value: "", date: "", type: "expense" as "income" | "expense" | "investment", categoryId: "", method: "" })
  const [isSaving, setIsSaving] = useState(false)

  const { data: categories } = useCategories()

  // Filters
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")

  const fetchTransactions = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    try {
      const [incomesRes, expensesRes, investmentsRes] = await Promise.all([
        supabase.from("incomes").select("*").eq("user_id", user.id),
        supabase.from("expenses").select("*").eq("user_id", user.id),
        supabase.from("reserves_investments").select("*").eq("user_id", user.id),
      ])

      const combined: UnifiedTransaction[] = []

      for (const inc of incomesRes.data || []) {
        combined.push({
          id: inc.id,
          name: inc.name,
          value: Number(inc.value),
          date: inc.date,
          type: "income",
          table: "incomes",
          categoryId: inc.category_id,
        })
      }

      for (const exp of expensesRes.data || []) {
        combined.push({
          id: exp.id,
          name: exp.name,
          value: Number(exp.value),
          date: exp.date,
          type: "expense",
          table: "expenses",
          method: exp.payment_method,
          categoryId: exp.category_id,
        })
      }

      for (const inv of investmentsRes.data || []) {
        combined.push({
          id: inv.id,
          name: inv.name,
          value: Number(inv.value),
          date: inv.date,
          type: "investment",
          table: "reserves_investments",
        })
      }

      // Sort by date descending
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTransactions(combined)
    } catch (error) {
      toast.error("Erro ao carregar o extrato geral")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleDelete = async () => {
    if (!deletingId || !deletingTable) return
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from(deletingTable).delete().eq("id", deletingId)
    
    if (error) {
      toast.error("Erro ao excluir transação")
    } else {
      toast.success("Transação excluída")
      setTransactions((prev) => prev.filter((t) => t.id !== deletingId))
    }
    
    setIsDeleting(false)
    setDeleteOpen(false)
    setDeletingId(null)
    setDeletingTable(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTx) return
    setIsSaving(true)
    const supabase = createClient()
    const parsedValue = parseMoneyToNumber(editForm.value)
    
    if (Number.isNaN(parsedValue)) {
      toast.error("Valor inválido")
      setIsSaving(false)
      return
    }

    const newTable = editForm.type === "income" ? "incomes" : editForm.type === "investment" ? "reserves_investments" : "expenses"
    // Investimento guarda a direção no sinal: resgate negativo (igual ao app). Uma receita
    // convertida em investimento é dinheiro que voltou para a conta (resgate); uma despesa, uma aplicação.
    const amount = Math.abs(parsedValue)
    const wasWithdraw = editingTx.table === "reserves_investments" ? editingTx.value < 0 : editingTx.type === "income"
    const storedValue = newTable === "reserves_investments" && wasWithdraw ? -amount : amount

    if (newTable === editingTx.table) {
      // Simple update
      const updatePayload: any = {
        name: editForm.name,
        value: storedValue,
        date: editForm.date,
      }
      
      if (editForm.type === "income" || editForm.type === "expense") {
        updatePayload.category_id = editForm.categoryId || null
      }
      if (editForm.type === "expense") {
        updatePayload.payment_method = editForm.method || "debit"
      }

      const { error } = await supabase
        .from(editingTx.table)
        .update(updatePayload)
        .eq("id", editingTx.id)

      if (error) {
        toast.error("Erro ao atualizar transação")
      } else {
        toast.success("Transação atualizada com sucesso")
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === editingTx.id
              ? { ...t, name: editForm.name, value: storedValue, date: editForm.date, categoryId: editForm.categoryId || undefined, method: editForm.method || undefined }
              : t
          )
        )
      }
    } else {
      // Transfer to another table
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let periodId = null
      if (editForm.type === "income" || editForm.type === "expense") {
        const [year, month] = editForm.date.split("-")
        const { data: existing } = await supabase.from("financial_periods")
          .select("id").eq("user_id", user.id).eq("month", Number(month)).eq("year", Number(year))
        
        if (existing && existing.length > 0) {
          periodId = existing[0].id
        } else {
           const { data: newPeriod } = await supabase.from("financial_periods").insert({
             user_id: user.id, month: Number(month), year: Number(year)
           }).select("id")
           periodId = newPeriod?.[0]?.id
        }
      }

      await supabase.from(editingTx.table).delete().eq("id", editingTx.id)

      const payload: any = {
        user_id: user.id,
        name: editForm.name,
        value: storedValue,
        date: editForm.date
      }

      if (editForm.type === "income") {
        payload.period_id = periodId
        payload.category_id = editForm.categoryId || null
      } else if (editForm.type === "expense") {
        payload.period_id = periodId
        payload.category_id = editForm.categoryId || null
        payload.payment_method = editForm.method || "debit" 
        payload.is_essential = false
      } else if (editForm.type === "investment") {
        payload.type = "investment"
      }

      const { error, data } = await supabase.from(newTable).insert(payload).select("id")

      if (error) {
        toast.error("Erro ao transferir tipo de transação")
      } else {
        toast.success("Tipo de transação alterado com sucesso")
        const insertedId = data?.[0]?.id || Math.random().toString()
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === editingTx.id
              ? { ...t, id: insertedId, name: editForm.name, value: storedValue, date: editForm.date, type: editForm.type, table: newTable, categoryId: editForm.categoryId || undefined, method: editForm.method || undefined }
              : t
          )
        )
      }
    }

    setIsSaving(false)
    setEditOpen(false)
    setEditingTx(null)
  }

  const openEdit = (tx: UnifiedTransaction) => {
    setEditingTx(tx)
    setEditForm({ name: tx.name, value: String(Math.abs(tx.value)), date: tx.date, type: tx.type, categoryId: tx.categoryId || "", method: tx.method || "" })
    setEditOpen(true)
  }

  const filtered = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    
    if (monthFilter !== "all" || yearFilter !== "all") {
      const [y, m, d] = t.date.split("-")
      if (monthFilter !== "all" && Number(m) !== Number(monthFilter)) return false
      if (yearFilter !== "all" && y !== yearFilter) return false
    }

    return true
  })

  // Calcula totais
  const totals = filtered.reduce(
    (acc, t) => {
      if (t.type === "income") acc.incomes += t.value
      else if (t.type === "expense") acc.expenses += t.value
      else if (t.type === "investment") acc.investments += t.value
      return acc
    },
    { incomes: 0, expenses: 0, investments: 0 }
  )

  const getTypeIcon = (type: string) => {
    if (type === "income") return <TrendingUp className="h-4 w-4 text-success" />
    if (type === "expense") return <TrendingDown className="h-4 w-4 text-destructive" />
    return <Landmark className="h-4 w-4 text-primary" />
  }

  const availableYears = Array.from(new Set(transactions.map((t) => t.date.substring(0, 4)))).sort((a,b) => Number(b) - Number(a))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Extrato Geral
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Visão unificada de todas as suas entradas, saídas e investimentos.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-panel border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receitas</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(totals.incomes)}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Despesas</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.expenses)}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Landmark className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totals.investments)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-4 border-b border-border/50">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 w-full"
              />
            </div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="h-10 w-full sm:w-[130px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer</SelectItem>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="h-10 w-full sm:w-[110px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sempre</SelectItem>
                  {availableYears.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 w-full sm:w-[150px]">
                  <SelectValue placeholder="Qualquer tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                  <SelectItem value="investment">Investimentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-14 rounded-xl opacity-50" />
              <Skeleton className="h-14 rounded-xl opacity-50" />
              <Skeleton className="h-14 rounded-xl opacity-50" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Filter className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-lg font-medium">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/10">
                      <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
                      <TableCell className="font-medium text-foreground">{tx.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(tx.type)}
                          <span className="capitalize text-sm font-medium">
                            {tx.type === "income" ? "Receita" : tx.type === "expense" ? "Despesa" : tx.value < 0 ? "Resgate" : "Aplicação"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${tx.type === "income" ? "text-success" : tx.type === "expense" ? "text-destructive" : "text-primary"}`}>
                        {/* Visão da conta: aplicação (valor positivo) saiu; resgate (negativo) voltou. */}
                        {tx.type === "expense" || (tx.type === "investment" && tx.value > 0) ? "− " : "+ "}
                        {formatCurrency(Math.abs(tx.value))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEdit(tx)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              setDeletingId(tx.id)
                              setDeletingTable(tx.table)
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
          )}
        </CardContent>
      </Card>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        itemName="esta transação"
      />

      <CrudDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Editar Transação"
        onSubmit={handleEditSubmit}
        isLoading={isSaving}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Tipo de Transação</Label>
            <Select
              value={editForm.type}
              onValueChange={(val: any) => setEditForm(prev => ({ ...prev, type: val, categoryId: "", method: "" }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita (Entrada)</SelectItem>
                <SelectItem value="expense">Despesa (Saída)</SelectItem>
                <SelectItem value="investment">Investimento (Reserva)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Descrição</Label>
            <Input
              id="name"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="h-11"
            />
          </div>
          
          {(editForm.type === "income" || editForm.type === "expense") && (
            <div className={`grid gap-4 ${editForm.type === "expense" ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select
                  value={editForm.categoryId}
                  onValueChange={(val) => setEditForm({ ...editForm, categoryId: val })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).filter(c => c.type === editForm.type).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {editForm.type === "expense" && (
                <div className="grid gap-2">
                  <Label>Método</Label>
                  <Select
                    value={editForm.method}
                    onValueChange={(val) => setEditForm({ ...editForm, method: val })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {String(label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <MoneyInput
                id="value"
                required
                value={editForm.value}
                onValueChange={(val) => setEditForm({ ...editForm, value: val })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                required
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
        </div>
      </CrudDialog>
    </motion.div>
  )
}
