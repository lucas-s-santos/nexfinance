"use client"

import { useEffect, useState } from "react"
import { usePeriod } from "@/lib/period-context"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, MONTHS } from "@/lib/format"
import { exportToCSV } from "@/components/dashboard/advanced-filters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion } from "framer-motion"
import { FileDown, FileText, TrendingDown, TrendingUp, WalletCards } from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { toast } from "sonner"

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
          essential: row.is_essential ? "Sim" : "Não",
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
        { key: "period", label: "Período" },
        { key: "date", label: "Data" },
        { key: "type", label: "Tipo" },
        { key: "description", label: "Descrição" },
        { key: "category", label: "Categoria" },
        { key: "amount", label: "Valor" },
        { key: "payment_method", label: "Método" },
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

  const handlePDF = async () => {
    if (!report) return
    const element = document.getElementById("report-content")
    if (!element) return

    toast.loading("Gerando PDF Mágico...", { id: "pdf-gen" })

    try {
      // Force white background and good scale
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      })
      const imgData = canvas.toDataURL("image/jpeg", 0.95)

      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      // Draw a Premium Header
      pdf.setFillColor(15, 23, 42) // Slate 900
      pdf.rect(0, 0, pdfWidth, 40, "F")

      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(24)
      pdf.setFont("helvetica", "bold")
      pdf.text("NexFinance", 15, 22)

      pdf.setFontSize(11)
      pdf.setFont("helvetica", "normal")
      pdf.text(`Relatório Financeiro Premium • ${MONTHS[report.month - 1]} ${report.year}`, 15, 30)

      pdf.setTextColor(150, 150, 150)
      pdf.setFontSize(9)
      pdf.text("Docs Confidenciais", pdfWidth - 40, 25)

      // Add the Dashboard Screenshot below header
      pdf.addImage(imgData, "JPEG", 0, 45, pdfWidth, pdfHeight)

      pdf.save(`NexFinance-${report.year}-${String(report.month).padStart(2, "0")}.pdf`)
      toast.success("PDF baixado com sucesso!", { id: "pdf-gen" })
    } catch (err) {
      console.error(err)
      toast.error("Falha ao gerar PDF. Tente novamente.", { id: "pdf-gen" })
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Resumo mensal e comparativo da sua saúde financeira.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCSV} className="rounded-full shadow-sm hover:shadow-md transition-shadow">
            <FileDown className="mr-2 h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button variant="outline" onClick={handlePDF} className="rounded-full shadow-sm hover:shadow-md transition-shadow">
            <FileText className="mr-2 h-4 w-4 text-destructive" />
            <span className="hidden sm:inline">Gerar PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      <Card className="glass-panel border-0 shadow-sm overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-primary/50 to-teal-400" />
        <CardContent className="grid gap-6 p-6 sm:grid-cols-2 lg:p-8">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-muted-foreground ml-1">Mês de Referência</Label>
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger className="h-11 bg-background/50 backdrop-blur-sm border-input/50 rounded-xl">
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
            <Label className="text-sm font-medium text-muted-foreground ml-1">Ano</Label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="h-11 bg-background/50 backdrop-blur-sm border-input/50 rounded-xl">
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
        <div id="report-content" className="space-y-6 pt-2 pb-6 px-1 rounded-3xl bg-background">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="glass-panel border-0 relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute right-0 top-0 w-24 h-24 bg-success/5 rounded-bl-full transition-transform group-hover:scale-110" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receitas do Mês
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-3xl font-bold text-success">
                  {formatCurrency(report.income)}
                </p>
              </CardContent>
            </Card>
            
            <Card className="glass-panel border-0 relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute right-0 top-0 w-24 h-24 bg-destructive/5 rounded-bl-full transition-transform group-hover:scale-110" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesas do Mês
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-3xl font-bold text-destructive">
                  {formatCurrency(report.expense)}
                </p>
              </CardContent>
            </Card>

            <Card className="glass-panel border-0 shadow-md relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-full transition-transform group-hover:scale-110" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Final
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <WalletCards className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className={`text-3xl font-bold ${report.income - report.expense >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(report.income - report.expense)}
                </p>
              </CardContent>
            </Card>
          </div>

          {previous && (
            <Card className="border-0 bg-muted/20 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Desempenho comparativo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Referência: <span className="font-medium text-foreground">{MONTHS[previous.month - 1]} {previous.year}</span>
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Receitas no período</p>
                      <p className="text-sm font-medium text-foreground">{formatCurrency(previous.income)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Despesas no período</p>
                      <p className="text-sm font-medium text-foreground">{formatCurrency(previous.expense)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {details.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/10 rounded-3xl border border-border/30 border-dashed mt-4">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-base font-medium text-muted-foreground">Nenhuma transação neste período</p>
          <p className="text-sm text-muted-foreground/70 max-w-sm mt-1">Gere um relatório escolhendo um mês com transações.</p>
        </div>
      )}
    </motion.div>
  )
}
