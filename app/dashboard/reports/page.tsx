"use client"

import { useEffect, useState } from "react"
import { usePeriod } from "@/lib/period-context"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, MONTHS } from "@/lib/format"
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

export default function ReportsPage() {
  const { month, year } = usePeriod()
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [selectedYear, setSelectedYear] = useState(year)
  const [report, setReport] = useState<ReportRow | null>(null)
  const [previous, setPrevious] = useState<ReportRow | null>(null)

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
    exportToCSV(
      [
        {
          month: `${MONTHS[report.month - 1]} ${report.year}`,
          income: formatCurrency(report.income),
          expense: formatCurrency(report.expense),
          balance: formatCurrency(report.income - report.expense),
        },
      ],
      "relatorio-mensal",
      [
        { key: "month", label: "Mes" },
        { key: "income", label: "Receitas" },
        { key: "expense", label: "Despesas" },
        { key: "balance", label: "Saldo" },
      ]
    )
  }

  const handlePDF = () => {
    if (!report) return
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Relatorio Mensal - NexFinance", 14, 20)
    doc.setFontSize(12)
    doc.text(`Mes: ${MONTHS[report.month - 1]} ${report.year}`, 14, 32)
    doc.text(`Receitas: ${formatCurrency(report.income)}`, 14, 44)
    doc.text(`Despesas: ${formatCurrency(report.expense)}`, 14, 56)
    doc.text(`Saldo: ${formatCurrency(report.income - report.expense)}`, 14, 68)
    doc.save("relatorio-mensal.pdf")
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
