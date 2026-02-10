"use client"

import { useState } from "react"
import { useCategories } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { categorySchema } from "@/lib/validators"
import { logAudit } from "@/lib/audit"
import { toast } from "sonner"
import { mutate } from "swr"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Pencil, Trash2, Tags } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface CategoryForm {
  name: string
  type: "income" | "expense"
}

const emptyForm: CategoryForm = {
  name: "",
  type: "expense",
}

const SUGGESTIONS = [
  "Mercado",
  "Aluguel",
  "Internet",
  "Transporte",
  "Saude",
  "Educacao",
  "Lazer",
  "Salario",
  "Freelance",
]

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openNew = () => {
    setForm(emptyForm)
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (category: NonNullable<typeof categories>[number]) => {
    setForm({ name: category.name, type: category.type })
    setEditId(category.id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = categorySchema.safeParse(form)
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
      name: form.name.trim(),
      type: form.type,
    }

    if (editId) {
      const { error } = await supabase
        .from("categories")
        .update(payload)
        .eq("id", editId)
      if (error) toast.error("Erro ao atualizar categoria")
      else {
        toast.success("Categoria atualizada")
        await logAudit("categories", editId, "update", payload)
      }
    } else {
      const { data, error } = await supabase
        .from("categories")
        .insert(payload)
        .select("id")
        .single()
      if (error) toast.error("Erro ao criar categoria")
      else {
        toast.success("Categoria criada")
        await logAudit("categories", data?.id ?? null, "insert", payload)
      }
    }

    setSaving(false)
    setDialogOpen(false)
    mutate("categories")
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", deleteId)
    if (error) toast.error("Erro ao excluir categoria")
    else {
      toast.success("Categoria excluida")
      await logAudit("categories", deleteId, "delete")
    }
    setSaving(false)
    setDeleteOpen(false)
    setDeleteId(null)
    mutate("categories")
  }

  const handleSuggestion = (name: string) => {
    setForm({ ...form, name })
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground">
            Organize suas receitas e despesas.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Sugestoes rapidas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((name) => (
            <Button
              key={name}
              variant="outline"
              size="sm"
              onClick={() => handleSuggestion(name)}
            >
              {name}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`sk-${i}`} className="h-10" />
              ))}
            </div>
          ) : (categories ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Tags className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                Nenhuma categoria cadastrada
              </p>
              <Button variant="outline" onClick={openNew}>
                Criar categoria
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 p-6 md:grid-cols-2">
              {(categories ?? []).map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {category.name}
                    </p>
                    <Badge variant="secondary" className="mt-1">
                      {category.type === "income" ? "Receita" : "Despesa"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(category)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeleteId(category.id)
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
        title={editId ? "Editar Categoria" : "Nova Categoria"}
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
          <Label>Tipo</Label>
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm({ ...form, type: value as "income" | "expense" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CrudDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={saving}
        itemName="esta categoria"
      />
    </div>
  )
}
