"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { parseOfx } from "@/lib/ofx"
import { parseCsv } from "@/lib/csv"
import { parseMoneyToNumber } from "@/lib/money"
import { formatCurrency, formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

type ImportTransaction = {
  id: string
  date: string
  amount: number
  name: string
  memo?: string
  source: "ofx" | "csv"
}

type CsvColumnMap = {
  date: string
  amount: string
  name: string
  memo: string
  type: string
}

export default function ImportPage() {
  const [transactions, setTransactions] = useState<ImportTransaction[]>([])
  const [fileName, setFileName] = useState("")
  const [fileType, setFileType] = useState<"ofx" | "csv" | null>(null)
  const [csvData, setCsvData] = useState<ReturnType<typeof parseCsv> | null>(null)
  const [csvMap, setCsvMap] = useState<CsvColumnMap>({
    date: "",
    amount: "",
    name: "",
    memo: "",
    type: "",
  })
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [ignoreTransfers, setIgnoreTransfers] = useState(false)
  const [autoDetectInvestments, setAutoDetectInvestments] = useState(true)
  const [expensePaymentMethod] = useState("debit")
  const [showMapping, setShowMapping] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [previewSearch, setPreviewSearch] = useState("")
  const [previewType, setPreviewType] = useState("all")
  const [previewStatus, setPreviewStatus] = useState("all")
  const [previewDateFrom, setPreviewDateFrom] = useState("")
  const [previewDateTo, setPreviewDateTo] = useState("")
  const [previewMinValue, setPreviewMinValue] = useState("")
  const [previewMaxValue, setPreviewMaxValue] = useState("")

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

  const investmentIncomeKeywords = [
    "devolucao",
    "rendimento",
    "resgate",
    "transferencia de saldo nuinvest",
  ]

  const marketKeywords = [
    "compra de fii",
    "fii",
    "compra de criptomoedas",
    "cripto",
    "btc",
  ]

  const transferOutKeywords = [
    "transferencia enviada pelo pix",
    "transferencia enviada",
  ]

  const transferInKeywords = [
    "transferencia recebida pelo pix",
    "transferencia recebida pelo pix via open banking",
    "transferencia recebida",
  ]

  const getTxDescription = (tx: ImportTransaction) => {
    const override = descriptionOverrides[tx.id]
    const cleaned = override?.trim()
    return cleaned ? cleaned : tx.name
  }

  const detectMapping = (headers: string[]) => {
    const normalized = headers.map((h) => h.toLowerCase())
    const guess = (keys: string[]) =>
      headers[normalized.findIndex((h) => keys.some((k) => h.includes(k)))] ?? ""

    return {
      date: guess(["data", "date", "dt"]) || "",
      amount: guess(["valor", "amount", "value", "vlr"]) || "",
      name: guess(["descricao", "description", "historico", "nome", "name"]) || "",
      memo: guess(["memo", "obs", "detalhe", "details"]) || "",
      type: guess(["tipo", "type", "debito", "credito"]) || "",
    }
  }

  const parseCsvDate = (value: string) => {
    const clean = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      const [day, month, year] = clean.split("/")
      return `${year}-${month}-${day}`
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
      const [day, month, year] = clean.split("-")
      return `${year}-${month}-${day}`
    }
    return ""
  }

  const inferType = (value: string) => {
    const text = value.toLowerCase()
    if (!text) return null
    if (text.includes("deb") || text.includes("desp") || text === "d") return "expense"
    if (text.includes("cred") || text.includes("rec") || text === "c") return "income"
    return null
  }

  const buildTransactionsFromCsv = (
    data: ReturnType<typeof parseCsv>,
    map: CsvColumnMap
  ): ImportTransaction[] => {
    if (!map.date || !map.amount || !map.name) return []

    const getIndex = (key: string) => data.headers.indexOf(key)
    const dateIndex = getIndex(map.date)
    const amountIndex = getIndex(map.amount)
    const nameIndex = getIndex(map.name)
    const memoIndex = map.memo ? getIndex(map.memo) : -1
    const typeIndex = map.type ? getIndex(map.type) : -1

    const isImportTransaction = (
      item: ImportTransaction | null
    ): item is ImportTransaction => item !== null

    return data.rows
      .map((row, index) => {
        const rawDate = row[dateIndex] ?? ""
        const rawAmount = row[amountIndex] ?? ""
        const rawName = row[nameIndex] ?? ""
        const rawMemo = memoIndex >= 0 ? row[memoIndex] ?? "" : ""
        const rawType = typeIndex >= 0 ? row[typeIndex] ?? "" : ""

        const date = parseCsvDate(rawDate)
        const name = rawName.trim()
        const memo = rawMemo.trim() || undefined
        const parsedAmount = parseMoneyToNumber(rawAmount)
        const typeHint = inferType(rawType)
        const isNegative = rawAmount.trim().startsWith("-")
        let amount = parsedAmount

        if (typeHint === "expense") amount = -Math.abs(parsedAmount)
        else if (typeHint === "income") amount = Math.abs(parsedAmount)
        else if (isNegative) amount = -Math.abs(parsedAmount)

        if (!date || !name || Number.isNaN(amount)) return null

        return {
          id: `csv-${index}`,
          date,
          amount,
          name,
          ...(memo ? { memo } : {}),
          source: "csv",
        } as ImportTransaction
      })
      .filter(isImportTransaction)
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    const extension = file.name.split(".").pop()?.toLowerCase()
    setFileName(file.name)
    setDescriptionOverrides({})

    if (extension === "csv") {
      const parsed = parseCsv(text)
      setCsvData(parsed)
      setCsvMap(detectMapping(parsed.headers))
      setFileType("csv")
      setTransactions([])
      return
    }

    const parsed = parseOfx(text)
    setFileType("ofx")
    setCsvData(null)
    setCsvMap({ date: "", amount: "", name: "", memo: "", type: "" })
    setTransactions(
      parsed.map((tx, index) => ({
        id: `ofx-${index}`,
        date: tx.date,
        amount: tx.amount,
        name: tx.name,
        memo: tx.memo,
        source: "ofx",
      }))
    )
  }

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

  const normalizeDescription = (tx: ImportTransaction) =>
    normalizeText(`${getTxDescription(tx)} ${tx.memo ?? ""}`)

  const hasKeyword = (normalized: string, keywords: string[]) =>
    keywords.some((keyword) => normalized.includes(keyword))

  const classifyTransaction = (tx: ImportTransaction) => {
    const normalized = normalizeDescription(tx)

    if (hasKeyword(normalized, transferOutKeywords)) return "transfer_out"
    if (hasKeyword(normalized, transferInKeywords)) return "transfer_in"
    if (hasKeyword(normalized, investmentIncomeKeywords)) return "investment_income"

    if (hasKeyword(normalized, marketKeywords)) {
      return tx.amount < 0 ? "market_out" : "market_income"
    }
    if (hasKeyword(normalized, investmentKeywords)) {
      return tx.amount < 0 ? "investment_out" : "investment_income"
    }

    return tx.amount >= 0 ? "income" : "expense"
  }

  const resolveExpensePaymentMethod = (tx: ImportTransaction, type: string) => {
    const normalized = normalizeDescription(tx)
    if (type === "transfer_out" && normalized.includes("pix")) return "pix"
    if (normalized.includes("pix")) return "pix"
    return expensePaymentMethod
  }

  const transactionRows = useMemo(() => {
    return transactions.map((tx) => {
      const type = autoDetectInvestments ? classifyTransaction(tx) : tx.amount >= 0 ? "income" : "expense"
      const transfer = type === "transfer_in" || type === "transfer_out"
      const skipped = ignoreTransfers && transfer

      return {
        id: tx.id,
        tx,
        transfer,
        skipped,
        type,
      }
    })
  }, [autoDetectInvestments, descriptionOverrides, ignoreTransfers, transactions])

  const filteredRows = useMemo(() => {
    const query = normalizeText(previewSearch.trim())
    const resolveDescription = (tx: ImportTransaction) => {
      const override = descriptionOverrides[tx.id]
      const cleaned = override?.trim()
      return cleaned ? cleaned : tx.name
    }

    const matchesType = (type: string) => {
      if (previewType === "all") return true
      if (previewType === "income") return type === "income"
      if (previewType === "expense") return type === "expense"
      if (previewType === "transfer") return type === "transfer_in" || type === "transfer_out"
      if (previewType === "investment") return type === "investment_out" || type === "investment_income"
      if (previewType === "market") return type === "market_out" || type === "market_income"
      return true
    }

    return transactionRows.filter((row) => {
      if (!matchesType(row.type)) return false
      if (previewStatus === "ignored" && !row.skipped) return false
      if (previewStatus === "active" && row.skipped) return false
      if (previewDateFrom && row.tx.date < previewDateFrom) return false
      if (previewDateTo && row.tx.date > previewDateTo) return false
      const absAmount = Math.abs(row.tx.amount)
      if (previewMinValue && absAmount < Number(previewMinValue)) return false
      if (previewMaxValue && absAmount > Number(previewMaxValue)) return false
      if (!query) return true
      const text = normalizeText(`${resolveDescription(row.tx)} ${row.tx.memo ?? ""}`)
      return text.includes(query)
    })
  }, [
    descriptionOverrides,
    previewDateFrom,
    previewDateTo,
    previewMaxValue,
    previewMinValue,
    previewSearch,
    previewStatus,
    previewType,
    transactionRows,
  ])

  const previewSummary = useMemo(() => {
    let income = 0
    let expense = 0
    let investment = 0
    let market = 0
    let transferIn = 0
    let transferOut = 0
    let investmentIncome = 0
    let skipped = 0

    for (const row of filteredRows) {
      if (row.skipped) {
        skipped += 1
        continue
      }
      const amount = Math.abs(row.tx.amount)
      if (row.type === "investment_out") investment += amount
      else if (row.type === "market_out") market += amount
      else if (row.type === "investment_income" || row.type === "market_income") {
        income += amount
        investmentIncome += amount
      } else if (row.type === "transfer_in") {
        income += amount
        transferIn += amount
      } else if (row.type === "transfer_out") {
        expense += amount
        transferOut += amount
      } else if (row.type === "income") income += amount
      else expense += amount
    }

    return {
      income,
      expense,
      investment,
      market,
      transferIn,
      transferOut,
      investmentIncome,
      skipped,
      total: income + expense + investment + market,
    }
  }, [filteredRows])

  const previewRows = useMemo(() => {
    if (showAll) return filteredRows
    return filteredRows.slice(0, 8)
  }, [filteredRows, showAll])

  const hasActiveFilters =
    previewSearch.trim() !== "" ||
    previewType !== "all" ||
    previewStatus !== "all" ||
    previewDateFrom !== "" ||
    previewDateTo !== "" ||
    previewMinValue !== "" ||
    previewMaxValue !== ""

  const getTypeLabel = (type: string, amount: number) => {
    if (type === "investment_out") return "Investimento"
    if (type === "market_out") return "Carteira"
    if (type === "investment_income" || type === "market_income") return "Receb. investimento"
    if (type === "transfer_in") return "Transf. recebida"
    if (type === "transfer_out") return "Transf. enviada"
    return amount >= 0 ? "Receita" : "Despesa"
  }


  useEffect(() => {
    if (!csvData || fileType !== "csv") return
    const built = buildTransactionsFromCsv(csvData, csvMap)
    setTransactions(built)
    setDescriptionOverrides({})
  }, [csvData, csvMap, fileType])

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

    for (const row of transactionRows) {
      if (row.skipped) continue
      const tx = row.tx
      const periodId = await ensurePeriod(user.id, tx.date)
      if (!periodId) continue
      const resolvedName = getTxDescription(tx)

      if (row.type === "investment_out" || row.type === "market_out") {
        await supabase.from("reserves_investments").insert({
          user_id: user.id,
          name: resolvedName,
          value: Math.abs(tx.amount),
          date: tx.date,
          type: row.type === "market_out" ? "market" : "investment",
        })
        continue
      }

      const isIncomeType =
        row.type === "income" ||
        row.type === "transfer_in" ||
        row.type === "investment_income" ||
        row.type === "market_income"

      if (isIncomeType) {
        await supabase.from("incomes").insert({
          user_id: user.id,
          period_id: periodId,
          name: resolvedName,
          value: tx.amount,
          date: tx.date,
          category_id: null,
        })
      } else {
        await supabase.from("expenses").insert({
          user_id: user.id,
          period_id: periodId,
          name: resolvedName,
          value: Math.abs(tx.amount),
          date: tx.date,
          category_id: null,
          payment_method: resolveExpensePaymentMethod(tx, row.type),
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
        <h1 className="text-2xl font-bold text-foreground">Importacao</h1>
        <p className="text-muted-foreground">
          Importe OFX ou CSV e revise antes de inserir.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-2">
            <Label>Arquivo OFX ou CSV</Label>
            <input
              type="file"
              accept=".ofx,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold"
            />
            {fileName && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{fileName}</span>
                <Badge variant="outline">{transactions.length} transacao(oes)</Badge>
                {fileType && <Badge variant="secondary">{fileType.toUpperCase()}</Badge>}
              </div>
            )}
          </div>

          {fileType === "csv" && csvData && csvData.headers.length > 0 && (
            <Collapsible open={showMapping} onOpenChange={setShowMapping}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  {showMapping ? "Ocultar mapeamento CSV" : "Configurar mapeamento CSV"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Mapeamento de colunas</p>
                <p className="text-xs text-muted-foreground">
                  Selecione data, valor e descricao. Os campos opcionais ajudam na classificacao.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <div className="grid gap-2">
                    <Label>Data</Label>
                    <Select value={csvMap.date || "none"} onValueChange={(v) => setCsvMap({ ...csvMap, date: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nao usar</SelectItem>
                        {csvData.headers.map((header) => (
                          <SelectItem key={`date-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor</Label>
                    <Select value={csvMap.amount || "none"} onValueChange={(v) => setCsvMap({ ...csvMap, amount: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nao usar</SelectItem>
                        {csvData.headers.map((header) => (
                          <SelectItem key={`amount-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Descricao</Label>
                    <Select value={csvMap.name || "none"} onValueChange={(v) => setCsvMap({ ...csvMap, name: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nao usar</SelectItem>
                        {csvData.headers.map((header) => (
                          <SelectItem key={`name-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Detalhe</Label>
                    <Select value={csvMap.memo || "none"} onValueChange={(v) => setCsvMap({ ...csvMap, memo: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nao usar</SelectItem>
                        {csvData.headers.map((header) => (
                          <SelectItem key={`memo-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select value={csvMap.type || "none"} onValueChange={(v) => setCsvMap({ ...csvMap, type: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nao usar</SelectItem>
                        {csvData.headers.map((header) => (
                          <SelectItem key={`type-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Ignorar transferencias</p>
                <p className="text-xs text-muted-foreground">
                  Oculta transferencias do preview e importacao
                </p>
              </div>
              <Switch checked={ignoreTransfers} onCheckedChange={setIgnoreTransfers} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Detectar investimentos</p>
                <p className="text-xs text-muted-foreground">
                  Classifica automaticamente no import
                </p>
              </div>
              <Switch checked={autoDetectInvestments} onCheckedChange={setAutoDetectInvestments} />
            </div>
          </div>

          <Button onClick={handleImport} disabled={loading}>
            {loading ? "Importando..." : "Importar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {previewRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma transacao carregada.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Preview</p>
                  <p className="text-xs text-muted-foreground">
                    Mostrando {previewRows.length} de {filteredRows.length}
                    {filteredRows.length !== transactionRows.length && (
                      <span> (total {transactionRows.length})</span>
                    )}
                  </p>
                </div>
                {filteredRows.length > 8 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAll((prev) => !prev)}
                  >
                    {showAll ? "Mostrar menos" : "Ver todas"}
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Receitas: {formatCurrency(previewSummary.income)}</span>
                <span>•</span>
                <span>Despesas: {formatCurrency(previewSummary.expense)}</span>
                <span>•</span>
                <span>Ignoradas: {previewSummary.skipped}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Buscar</Label>
                  <Input
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Descricao ou detalhe"
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select value={previewType} onValueChange={setPreviewType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Receitas</SelectItem>
                      <SelectItem value="expense">Despesas</SelectItem>
                      <SelectItem value="transfer">Transferencias</SelectItem>
                      <SelectItem value="investment">Investimentos</SelectItem>
                      <SelectItem value="market">Carteira</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={previewStatus} onValueChange={setPreviewStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativas</SelectItem>
                      <SelectItem value="ignored">Ignoradas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setPreviewSearch("")
                      setPreviewType("all")
                      setPreviewStatus("all")
                      setPreviewDateFrom("")
                      setPreviewDateTo("")
                      setPreviewMinValue("")
                      setPreviewMaxValue("")
                    }}
                    disabled={!hasActiveFilters}
                  >
                    Limpar filtros
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label>Data inicial</Label>
                  <Input
                    type="date"
                    value={previewDateFrom}
                    onChange={(e) => setPreviewDateFrom(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Data final</Label>
                  <Input
                    type="date"
                    value={previewDateTo}
                    onChange={(e) => setPreviewDateTo(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Valor minimo</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={previewMinValue}
                    onChange={(e) => setPreviewMinValue(e.target.value)}
                    placeholder="0,00"
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Valor maximo</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={previewMaxValue}
                    onChange={(e) => setPreviewMaxValue(e.target.value)}
                    placeholder="0,00"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row) => {
                      const { tx } = row
                      const isIncomeType =
                        row.type === "income" ||
                        row.type === "transfer_in" ||
                        row.type === "investment_income" ||
                        row.type === "market_income"
                      const isExpenseType = row.type === "expense" || row.type === "transfer_out"
                      return (
                        <TableRow key={row.id} className={row.skipped ? "opacity-60" : undefined}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(tx.date)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                value={descriptionOverrides[row.id] ?? tx.name}
                                onChange={(e) =>
                                  setDescriptionOverrides((prev) => ({
                                    ...prev,
                                    [row.id]: e.target.value,
                                  }))
                                }
                                onBlur={() => {
                                  setDescriptionOverrides((prev) => {
                                    const next = { ...prev }
                                    const current = (next[row.id] ?? "").trim()
                                    if (!current || current === tx.name) {
                                      delete next[row.id]
                                    } else {
                                      next[row.id] = current
                                    }
                                    return next
                                  })
                                }}
                                placeholder="Descricao da transacao"
                                className="h-9"
                              />
                              {tx.memo && (
                                <p className="text-xs text-muted-foreground/80">{tx.memo}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span
                              className={
                                isIncomeType
                                  ? "text-success"
                                  : isExpenseType
                                    ? "text-destructive"
                                    : "text-foreground"
                              }
                            >
                              {formatCurrency(Math.abs(tx.amount))}
                            </span>
                          </TableCell>
                          <TableCell>{getTypeLabel(row.type, tx.amount)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {row.skipped && <Badge variant="outline">Ignorada</Badge>}
                              {!row.skipped && <Badge variant="secondary">Ativa</Badge>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
