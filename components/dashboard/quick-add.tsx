"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePeriod } from "@/lib/period-context"
import { useCategories } from "@/lib/use-financial-data"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoneyInput } from "@/components/ui/money-input"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { parseMoneyToNumber } from "@/lib/money"

export function QuickAdd() {
  const { periodId } = usePeriod()
  const { data: categories } = useCategories()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState("expense")
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState("debit")
  const [categoryId, setCategoryId] = useState("")
  const [saving, setSaving] = useState(false)

  const filteredCategories = (categories ?? []).filter(
    (cat) => cat.type === type
  )

  const handleSave = async () => {
    if (!periodId) return
    if (!name.trim() || !value) {
      toast.error("Preencha nome e valor")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const numericValue = parseMoneyToNumber(value)

    if (type === "income") {
      const { error } = await supabase.from("incomes").insert({
        user_id: user.id,
        period_id: periodId,
        name,
        value: numericValue,
        date,
        category_id: categoryId || null,
      })
      if (error) toast.error("Erro ao criar receita")
      else toast.success("Receita criada")
    } else {
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        period_id: periodId,
        name,
        value: numericValue,
        date,
        category_id: categoryId || null,
        payment_method: paymentMethod,
        is_essential: false,
      })
      if (error) toast.error("Erro ao criar despesa")
      else toast.success("Despesa criada")
    }

    setSaving(false)
    setOpen(false)
    setName("")
    setValue("")
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.35)] lg:hidden"
        aria-label="Adicionar rapido"
      >
        <Plus className="h-6 w-6" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar rapido</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Valor</Label>
              <MoneyInput value={value} onValueChange={setValue} />
            </div>
            <div className="grid gap-2">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === "expense" && (
              <div className="grid gap-2">
                <Label>Metodo</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Cartao de Debito</SelectItem>
                    <SelectItem value="credit">Cartao de Credito</SelectItem>
                    <SelectItem value="voucher">Investimento</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
