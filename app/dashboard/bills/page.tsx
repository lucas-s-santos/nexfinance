"use client"

import React from "react"

import { useState } from "react"
import { usePeriod } from "@/lib/period-context"
import { useBills } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, MONTHS } from "@/lib/format"
import { parseMoneyToNumber } from "@/lib/money"
import { billSchema } from "@/lib/validators"
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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { CrudDialog } from "@/components/dashboard/crud-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import {
  AdvancedFilters,
  emptyFilters,
  exportToCSV,
  useFilteredData,
} from "@/components/dashboard/advanced-filters"
import { Plus, Pencil, Trash2, Receipt } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface BillForm {
  name: string
  value: string
  due_date: string
  is_planned: boolean
  is_paid: boolean
}

const emptyForm: BillForm = {
  name: "",
  value: "",
  due_date: "",
  is_planned: false,
  is_paid: false,
}

export default function BillsPage() {
  const { month, year, periodId, isLoading: periodLoading } = usePeriod()
  const { data: bills, isLoading } = useBills(periodId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<BillForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState(emptyFilters)

  const billsWithDate = (bills ?? []).map((bill) => ({
    ...bill,
    date: bill.due_date,
  }))
  const filteredBills = useFilteredData(billsWithDate, filters)

  const total = filteredBills.reduce((sum, b) => sum + Number(b.value), 0)
  const totalPaid = filteredBills
    .filter((b) => b.is_paid)
    .reduce((sum, b) => sum + Number(b.value), 0)
  const totalPending = total - totalPaid

  const openNew = () => {
    setForm({
      ...emptyForm,
      due_date: `${year}-${String(month).padStart(2, "0")}-01`,
    })
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (bill: NonNullable<typeof bills>[number]) => {
    setForm({
      name: bill.name,
      value: String(bill.value),
      due_date: bill.due_date,
      is_planned: bill.is_planned,
      is_paid: bill.is_paid,
    })
    setEditId(bill.id)
    setDialogOpen(true)
  }

  const togglePaid = async (billId: string, currentPaid: boolean) => {
    const supabase = createClient()
    const { error } = await supabase
      .from("bills")
      .update({ is_paid: !currentPaid })
      .eq("id", billId)
    if (error) toast.error("Erro ao atualizar status")
    else toast.success(!currentPaid ? "Conta marcada como paga" : "Conta marcada como pendente")
    mutate(["bills", periodId])
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
    const validation = billSchema.safeParse({
      name: form.name,
      value: parsedValue,
      due_date: form.due_date,
      is_planned: form.is_planned,
      is_paid: form.is_paid,
    })

    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message ?? "Dados invalidos")
      setSaving(false)
      return
    }

    const payload = {
      user_id: user.id,
      period_id: periodId,
      name: form.name,
      value: parsedValue,
      due_date: form.due_date,
      is_planned: form.is_planned,
      is_paid: form.is_paid,
    }

    if (editId) {
      const { error } = await supabase
        .from("bills")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar conta")
      else toast.success("Conta atualizada")
    } else {
      const { error } = await supabase.from("bills").insert(payload)
      if (error) toast.error("Erro ao criar conta")
      else toast.success("Conta criada")
    }

    setSaving(false)
    setDialogOpen(false)
    mutate(["bills", periodId])
  }

  const handleDelete = async () => {
    if (!deleteId || !periodId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("bills").delete().eq("id", deleteId)
    if (error) toast.error("Erro ao excluir conta")
    else toast.success("Conta excluida")
    setSaving(false)
    setDeleteOpen(false)
    setDeleteId(null)
    mutate(["bills", periodId])
  }

  const handleExport = () => {
    const rows = filteredBills.map((bill) => ({
      name: bill.name,
      due_date: formatDate(bill.due_date),
      value: formatCurrency(Number(bill.value)),
      status: bill.is_paid ? "Pago" : "Pendente",
      type: bill.is_planned ? "Planejada" : "Nao planejada",
    }))
    exportToCSV(rows, "contas", [
      { key: "name", label: "Nome" },
      { key: "due_date", label: "Vencimento" },
      { key: "value", label: "Valor" },
      { key: "status", label: "Status" },
      { key: "type", label: "Tipo" },
    ])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Contas a Pagar
          </h1>
          <p className="text-muted-foreground">
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">
              {formatCurrency(totalPending)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <AdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
              onExport={handleExport}
              showPaidStatus
              itemCount={filteredBills.length}
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
          ) : filteredBills.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                Nenhuma conta cadastrada
              </p>
              <Button variant="outline" onClick={openNew}>
                Adicionar conta
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Paga</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20 text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow
                    key={bill.id}
                    className={bill.is_paid ? "opacity-60" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={bill.is_paid}
                        onCheckedChange={() =>
                          togglePaid(bill.id, bill.is_paid)
                        }
                      />
                    </TableCell>
                    <TableCell
                      className={`font-medium ${bill.is_paid ? "line-through" : ""}`}
                    >
                      {bill.name}
                    </TableCell>
                    <TableCell>{formatDate(bill.due_date)}</TableCell>
                    <TableCell>
                      {bill.is_planned ? (
                        <Badge variant="secondary">Planejada</Badge>
                      ) : (
                        <Badge variant="outline">Nao Planejada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(bill.value))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(bill)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteId(bill.id)
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

      {/* Dialog */}
      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editId ? "Editar Conta" : "Nova Conta"}
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
            placeholder="Ex: Aluguel"
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
          <Label htmlFor="due_date">Data de Vencimento</Label>
          <Input
            id="due_date"
            type="date"
            required
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_planned}
            onCheckedChange={(v) => setForm({ ...form, is_planned: v })}
          />
          <Label>Conta planejada</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_paid}
            onCheckedChange={(v) => setForm({ ...form, is_paid: v })}
          />
          <Label>Ja paga</Label>
        </div>
      </CrudDialog>

      {/* Delete */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={saving}
        itemName="esta conta"
      />
    </div>
  )
}
