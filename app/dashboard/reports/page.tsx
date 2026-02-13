"use client"

import { useEffect, useState } from "react"
import { usePeriod } from "@/lib/period-context"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, MONTHS } from "@/lib/format"
import { exportToCSV } from "@/components/dashboard/advanced-filters"
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
import jsPDF from "jspdf"

interface ReportRow {
  income: number
  expense: number
  month: number
  year: number
}

type DetailRow = {
  date: string
  type: "Receita" | "Despesa"
  description: string
  category: string
  amount: number
  paymentMethod: string
  essential: string
}

export default function ReportsPage() {
  const { month, year } = usePeriod()
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [selectedYear, setSelectedYear] = useState(year)
  const [report, setReport] = useState<ReportRow | null>(null)
  const [previous, setPrevious] = useState<ReportRow | null>(null)
  const [details, setDetails] = useState<DetailRow[]>([])

  const years = Array.from({ length: 6 }, (_, i) => year - 3 + i)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: period } = await supabase
        .from("financial_periods")
        .select("id")
        .eq("user_id", user.id)
        .eq("month", selectedMonth)
        .eq("year", selectedYear)
        .single()

      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
      const { data: prevPeriod } = await supabase
        .from("financial_periods")
        .select("id")
        .eq("user_id", user.id)
        .eq("month", prevMonth)
        .eq("year", prevYear)
        .single()

      const sumFor = async (periodId?: string | null) => {
        if (!periodId) return { income: 0, expense: 0 }
        const { data: incomes } = await supabase
          .from("incomes")
          .select("value")
          .eq("period_id", periodId)
        const { data: expenses } = await supabase
          .from("expenses")
          .select("value")
          .eq("period_id", periodId)

        return {
          income: (incomes ?? []).reduce((sum, i) => sum + Number(i.value), 0),
          expense: (expenses ?? []).reduce((sum, e) => sum + Number(e.value), 0),
        }
      }

      const currentTotals = await sumFor(period?.id)
      const previousTotals = await sumFor(prevPeriod?.id)

      if (period?.id) {
        const { data: incomes } = await supabase
          .from("incomes")
          .select("name, value, date, category:categories(name)")
          .eq("period_id", period.id)
          .order("date", { ascending: true })

        const { data: expenses } = await supabase
          .from("expenses")
          .select("name, value, date, payment_method, is_essential, category:categories(name)")
          .eq("period_id", period.id)
          .order("date", { ascending: true })

        const incomeRows: DetailRow[] = (incomes ?? []).map((row) => ({
          date: row.date,
          type: "Receita",
          description: row.name,
          category: row.category?.name ?? "",
          amount: Number(row.value),
          paymentMethod: "",
          essential: "",
        }))

        const expenseRows: DetailRow[] = (expenses ?? []).map((row) => ({
          date: row.date,
          type: "Despesa",
          description: row.name,
          category: row.category?.name ?? "",
          amount: Number(row.value),
          paymentMethod: row.payment_method ?? "",
          essential: row.is_essential ? "Sim" : "Nao",
        }))

        const merged = [...incomeRows, ...expenseRows]
        merged.sort((a, b) => a.date.localeCompare(b.date))
        setDetails(merged)
      } else {
        setDetails([])
      }

      setReport({
        ...currentTotals,
        month: selectedMonth,
        year: selectedYear,
      })
      setPrevious({
        ...previousTotals,
        month: prevMonth,
        year: prevYear,
      })
    }

    load()
  }, [selectedMonth, selectedYear])

  const handleCSV = () => {
    if (!report) return
    const fmt = (value: number) => value.toFixed(2)
    const currentBalance = report.income - report.expense
    const prevIncome = previous?.income ?? 0
    const prevExpense = previous?.expense ?? 0
    const prevBalance = prevIncome - prevExpense
    const incomeDelta = report.income - prevIncome
    const expenseDelta = report.expense - prevExpense
    const balanceDelta = currentBalance - prevBalance
    const percent = (value: number, base: number) =>
      base === 0 ? "0.00" : ((value / base) * 100).toFixed(2)

    const summaryRow = {
      row_type: "Resumo",
      period: `${MONTHS[report.month - 1]} ${report.year}`,
      date: "",
      type: "",
      description: "",
      category: "",
      amount: "",
      payment_method: "",
      essential: "",
      income_total: fmt(report.income),
      expense_total: fmt(report.expense),
      balance_total: fmt(currentBalance),
      income_change: fmt(incomeDelta),
      income_change_pct: percent(incomeDelta, prevIncome),
      expense_change: fmt(expenseDelta),
      expense_change_pct: percent(expenseDelta, prevExpense),
      balance_change: fmt(balanceDelta),
      balance_change_pct: percent(balanceDelta, prevBalance),
    }

    const detailRows = details.map((row) => ({
      row_type: "Detalhe",
      period: `${MONTHS[report.month - 1]} ${report.year}`,
      date: formatDate(row.date),
      type: row.type,
      description: row.description,
      category: row.category,
      amount: fmt(row.amount),
      payment_method: row.paymentMethod,
      essential: row.essential,
      income_total: "",
      expense_total: "",
      balance_total: "",
      income_change: "",
      income_change_pct: "",
      expense_change: "",
      expense_change_pct: "",
      balance_change: "",
      balance_change_pct: "",
    }))

    exportToCSV(
      [summaryRow, ...detailRows],
      `relatorio-mensal-${report.year}-${String(report.month).padStart(2, "0")}`,
      [
        { key: "row_type", label: "Tipo de Linha" },
        { key: "period", label: "Periodo" },
        { key: "date", label: "Data" },
        { key: "type", label: "Tipo" },
        { key: "description", label: "Descricao" },
        { key: "category", label: "Categoria" },
        { key: "amount", label: "Valor" },
        { key: "payment_method", label: "Metodo" },
        { key: "essential", label: "Essencial" },
        { key: "income_total", label: "Total Receitas" },
        { key: "expense_total", label: "Total Despesas" },
        { key: "balance_total", label: "Total Saldo" },
        { key: "income_change", label: "Var. Receitas" },
        { key: "income_change_pct", label: "% Var. Receitas" },
        { key: "expense_change", label: "Var. Despesas" },
        { key: "expense_change_pct", label: "% Var. Despesas" },
        { key: "balance_change", label: "Var. Saldo" },
        { key: "balance_change_pct", label: "% Var. Saldo" },
      ]
    )
  }

  const handlePDF = () => {
    if (!report) return
    const doc = new jsPDF()
    const currentBalance = report.income - report.expense
    const prevIncome = previous?.income ?? 0
    const prevExpense = previous?.expense ?? 0
    const prevBalance = prevIncome - prevExpense
    const incomeDelta = report.income - prevIncome
    const expenseDelta = report.expense - prevExpense
    const balanceDelta = currentBalance - prevBalance
    const pageHeight = 280
    const left = 14
    let y = 20

    doc.setFontSize(16)
    doc.text("Relatorio Mensal - NexFinance", left, y)
    doc.setFontSize(12)
    y += 12
    doc.text(`Mes: ${MONTHS[report.month - 1]} ${report.year}`, left, y)
    y += 12
    doc.text(`Receitas: ${formatCurrency(report.income)}`, left, y)
    y += 12
    doc.text(`Despesas: ${formatCurrency(report.expense)}`, left, y)
    y += 12
    doc.text(`Saldo: ${formatCurrency(currentBalance)}`, left, y)
    y += 12
    doc.text(
      `Comparativo (mes anterior): ${formatCurrency(incomeDelta)} / ${formatCurrency(expenseDelta)} / ${formatCurrency(balanceDelta)}`,
      left,
      y
    )

    y += 14
    doc.setFontSize(11)
    doc.text("Detalhamento", left, y)
    y += 8
    doc.setFontSize(10)
    doc.text("Data", left, y)
    doc.text("Tipo", left + 28, y)
    doc.text("Descricao", left + 52, y)
    doc.text("Valor", left + 150, y)
    y += 6

    const truncate = (text: string, max: number) =>
      text.length > max ? `${text.slice(0, max - 1)}...` : text

    for (const row of details) {
      if (y > pageHeight) {
        doc.addPage()
        y = 20
        doc.setFontSize(10)
        doc.text("Data", left, y)
        doc.text("Tipo", left + 28, y)
        doc.text("Descricao", left + 52, y)
        doc.text("Valor", left + 150, y)
        y += 6
      }
      doc.text(formatDate(row.date), left, y)
      doc.text(row.type, left + 28, y)
      doc.text(truncate(row.description, 50), left + 52, y)
      doc.text(formatCurrency(row.amount), left + 150, y, { align: "left" })
      y += 6
    }
    doc.save(
      `relatorio-mensal-${report.year}-${String(report.month).padStart(2, "0")}.pdf`
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatorios</h1>
        <p className="text-muted-foreground">Resumo mensal e comparativo.</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Mes</Label>
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Ano</Label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-2xl font-semibold text-success">
                {formatCurrency(report.income)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-2xl font-semibold text-destructive">
                {formatCurrency(report.expense)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(report.income - report.expense)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {previous && report && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Comparativo com {MONTHS[previous.month - 1]} {previous.year}
            </p>
            <p className="text-sm">
              Receitas: {formatCurrency(previous.income)} | Despesas: {formatCurrency(previous.expense)}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={handleCSV}>Exportar CSV</Button>
        <Button variant="outline" onClick={handlePDF}>
          Exportar PDF
        </Button>
      </div>
    </div>
  )
}
