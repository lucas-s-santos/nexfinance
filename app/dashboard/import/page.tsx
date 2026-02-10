"use client"

import { useState } from "react"
import { useCategories } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { parseOfx } from "@/lib/ofx"
import { formatCurrency, formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function ImportPage() {
  const { data: categories } = useCategories()
  const [transactions, setTransactions] = useState<ReturnType<typeof parseOfx>>([])
  const [loading, setLoading] = useState(false)
  const [incomeCategory, setIncomeCategory] = useState("")
  const [expenseCategory, setExpenseCategory] = useState("")

  const investmentKeywords = [
    "aplicacao rdb",
    "aplicacao cdb",
    "aplicacao em investimento",
    "aplicacao",
    "investimento",
    "nuinvest",
    "transferencia de saldo nuinvest",
    "tesouro",
    "fundo",
    "rdb",
    "cdb",
  ]

  const marketKeywords = [
    "compra de fii",
    "fii",
    "compra de criptomoedas",
    "cripto",
    "btc",
  ]

  const transferExceptions = [
    "transferencia enviada pelo pix",
    "transferencia recebida pelo pix",
    "transferencia recebida",
    "transferencia enviada",
  ]

  const incomeCategories = (categories ?? []).filter(
    (cat) => cat.type === "income"
  )
  const expenseCategories = (categories ?? []).filter(
    (cat) => cat.type === "expense"
  )

  const handleFile = async (file: File) => {
    const text = await file.text()
    const parsed = parseOfx(text)
    setTransactions(parsed)
  }

  const classifyInvestment = (
    tx: ReturnType<typeof parseOfx>[number]
  ): "investment" | "market" | null => {
    const description = `${tx.name} ${tx.memo ?? ""}`.toLowerCase()
    const normalized = description
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
    if (marketKeywords.some((keyword) => normalized.includes(keyword))) {
      return "market"
    }
    if (investmentKeywords.some((keyword) => normalized.includes(keyword))) {
      return "investment"
    }
    if (transferExceptions.some((keyword) => normalized.includes(keyword))) {
      return null
    }
    return null
  }

  const ensurePeriod = async (userId: string, date: string) => {
    const [year, month] = date.split("-")
    const supabase = createClient()
    const { data: existing } = await supabase
      .from("financial_periods")
      .select("id")
      .eq("user_id", userId)
      .eq("month", Number(month))
      .eq("year", Number(year))
      .single()

    if (existing?.id) return existing.id

    const { data: newPeriod } = await supabase
      .from("financial_periods")
      .insert({
        user_id: userId,
        month: Number(month),
        year: Number(year),
      })
      .select("id")
      .single()

    return newPeriod?.id ?? null
  }

  const handleImport = async () => {
    if (transactions.length === 0) {
      toast.error("Nenhuma transacao encontrada")
      return
    }
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    for (const tx of transactions) {
      const periodId = await ensurePeriod(user.id, tx.date)
      if (!periodId) continue

      const investmentType = classifyInvestment(tx)

      if (investmentType) {
        await supabase.from("reserves_investments").insert({
          user_id: user.id,
          name: tx.name,
          value: Math.abs(tx.amount),
          date: tx.date,
          type: investmentType,
        })
        continue
      }

      if (tx.amount >= 0) {
        await supabase.from("incomes").insert({
          user_id: user.id,
          period_id: periodId,
          name: tx.name,
          value: tx.amount,
          date: tx.date,
          category_id: incomeCategory || null,
        })
      } else {
        await supabase.from("expenses").insert({
          user_id: user.id,
          period_id: periodId,
          name: tx.name,
          value: Math.abs(tx.amount),
          date: tx.date,
          category_id: expenseCategory || null,
          payment_method: "debit",
          is_essential: false,
        })
      }
    }

    setLoading(false)
    toast.success("Importacao concluida")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importacao OFX</h1>
        <p className="text-muted-foreground">
          Importe extratos para acelerar seu onboarding.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-2">
            <Label>Arquivo OFX</Label>
            <input
              type="file"
              accept=".ofx"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Categoria padrao para receitas</Label>
              <Select value={incomeCategory || "none"} onValueChange={(v) => setIncomeCategory(v === "none" ? "" : v)}>
                <SelectTrigger>
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
              <Label>Categoria padrao para despesas</Label>
              <Select value={expenseCategory || "none"} onValueChange={(v) => setExpenseCategory(v === "none" ? "" : v)}>
                <SelectTrigger>
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
          </div>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? "Importando..." : "Importar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Nenhuma transacao carregada.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {transactions.map((tx, index) => {
                const investmentType = classifyInvestment(tx)
                return (
                  <div key={`${tx.name}-${index}`} className="p-6">
                    <p className="text-sm font-semibold text-foreground">
                      {tx.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.date)} • {formatCurrency(Math.abs(tx.amount))}
                      {investmentType === "investment"
                        ? " • Investimento"
                        : investmentType === "market"
                          ? " • Carteira"
                          : tx.amount >= 0
                            ? " • Receita"
                            : " • Despesa"}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
