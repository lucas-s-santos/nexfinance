"use client"

import React from "react"

import { useState } from "react"
import { useReserves } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, RESERVE_TYPES } from "@/lib/format"
import { parseMoneyToNumber } from "@/lib/money"
import { reserveSchema } from "@/lib/validators"
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
import { Badge } from "@/components/ui/badge"
import { CrudDialog } from "@/components/dashboard/crud-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { Plus, Pencil, Trash2, Landmark } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface ReserveForm {
  name: string
  type: string
  value: string
  date: string
}

const emptyForm: ReserveForm = {
  name: "",
  type: "emergency",
  value: "",
  date: new Date().toISOString().slice(0, 10),
}

export default function ReservesPage() {
  const { data: reserves, isLoading } = useReserves()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<ReserveForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const totalReserved = (reserves ?? []).reduce(
    (sum, r) => sum + Number(r.value),
    0
  )
  const emergencyTotal = (reserves ?? [])
    .filter((r) => r.type === "emergency")
    .reduce((sum, r) => sum + Number(r.value), 0)
  const investmentTotal = (reserves ?? [])
    .filter((r) => r.type === "investment")
    .reduce((sum, r) => sum + Number(r.value), 0)
  const marketTotal = (reserves ?? [])
    .filter((r) => r.type === "market")
    .reduce((sum, r) => sum + Number(r.value), 0)

  const openNew = () => {
    setForm(emptyForm)
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (reserve: NonNullable<typeof reserves>[number]) => {
    setForm({
      name: reserve.name,
      type: reserve.type,
      value: String(reserve.value),
      date: reserve.date,
    })
    setEditId(reserve.id)
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

    const parsedValue = parseMoneyToNumber(form.value)
    const validation = reserveSchema.safeParse({
      name: form.name,
      value: parsedValue,
      date: form.date,
      type: form.type,
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
      name: form.name,
      type: form.type,
      value: parsedValue,
      date: form.date,
    }

    if (editId) {
      const { error } = await supabase
        .from("reserves_investments")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar")
      else toast.success("Reserva atualizada")
    } else {
      const { error } = await supabase
        .from("reserves_investments")
        .insert(payload)
      if (error) toast.error("Erro ao criar")
      else toast.success("Reserva criada")
    }

    setSaving(false)
    setDialogOpen(false)
    mutate("reserves")
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("reserves_investments")
      .delete()
      .eq("id", deleteId)
    if (error) toast.error("Erro ao excluir")
    else toast.success("Reserva excluida")
    setSaving(false)
    setDeleteOpen(false)
    setDeleteId(null)
    mutate("reserves")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Reservas e Investimentos
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas reservas de emergencia e investimentos
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Reserva
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reservado
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Landmark className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalReserved)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reserva de Emergencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(emergencyTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(investmentTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Carteira (FII/Cripto)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(marketTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`sk-${
                  // biome-ignore lint: index
                  i
                }`} className="h-10" />
              ))}
            </div>
          ) : (reserves ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Landmark className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                Nenhuma reserva cadastrada
              </p>
              <Button variant="outline" onClick={openNew}>
                Adicionar reserva
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20 text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reserves ?? []).map((reserve) => (
                  <TableRow key={reserve.id}>
                    <TableCell className="font-medium">
                      {reserve.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {RESERVE_TYPES[reserve.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(reserve.date)}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(Number(reserve.value))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(reserve)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteId(reserve.id)
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
        title={editId ? "Editar Reserva" : "Nova Reserva"}
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
            placeholder="Ex: Reserva de emergencia"
          />
        </div>
        <div className="grid gap-2">
          <Label>Tipo</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setForm({ ...form, type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RESERVE_TYPES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </CrudDialog>

      {/* Delete */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={saving}
        itemName="esta reserva"
      />
    </div>
  )
}
