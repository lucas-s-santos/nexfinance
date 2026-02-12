"use client"

import { useEffect, useMemo, useState } from "react"
import { useCategories } from "@/lib/use-financial-data"
import { createClient } from "@/lib/supabase/client"
import { parseOfx } from "@/lib/ofx"
import { parseCsv } from "@/lib/csv"
import { parseMoneyToNumber } from "@/lib/money"
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
  const { data: categories } = useCategories()
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
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [incomeCategory, setIncomeCategory] = useState("")
  const [expenseCategory, setExpenseCategory] = useState("")
  const [ignoreTransfers, setIgnoreTransfers] = useState(false)
  const [autoDetectInvestments, setAutoDetectInvestments] = useState(true)
  const [expensePaymentMethod] = useState("debit")
  const [showMapping, setShowMapping] = useState(false)
  const [showAll, setShowAll] = useState(false)

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

  const incomeCategories = (categories ?? []).filter(
    (cat) => cat.type === "income"
  )
  const expenseCategories = (categories ?? []).filter(
    (cat) => cat.type === "expense"
  )

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

  const normalizeDescription = (tx: ImportTransaction) =>
    `${tx.name} ${tx.memo ?? ""}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

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
  }, [autoDetectInvestments, ignoreTransfers, transactions])

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    let investment = 0
    let market = 0
    let transferIn = 0
    let transferOut = 0
    let investmentIncome = 0
    let skipped = 0

    for (const row of transactionRows) {
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
  }, [transactionRows])

  const previewRows = useMemo(() => {
    if (showAll) return transactionRows
    return transactionRows.slice(0, 8)
  }, [showAll, transactionRows])

  useEffect(() => {
    if (!csvData || fileType !== "csv") return
    const built = buildTransactionsFromCsv(csvData, csvMap)
    setTransactions(built)
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

      if (row.type === "investment_out" || row.type === "market_out") {
        await supabase.from("reserves_investments").insert({
          user_id: user.id,
          name: tx.name,
          value: Math.abs(tx.amount),
          date: tx.date,
          type: row.type === "market_out" ? "market" : "investment",
        })
        continue
      }

      const overrideCategory = categoryOverrides[row.id]
      const isIncomeType =
        row.type === "income" ||
        row.type === "transfer_in" ||
        row.type === "investment_income" ||
        row.type === "market_income"
      const fallbackCategory = isIncomeType ? incomeCategory : expenseCategory
      const resolvedCategory = overrideCategory || fallbackCategory
      const category_id = resolvedCategory && resolvedCategory !== "none" ? resolvedCategory : null

      if (isIncomeType) {
        await supabase.from("incomes").insert({
          user_id: user.id,
          period_id: periodId,
          name: tx.name,
          value: tx.amount,
          date: tx.date,
          category_id,
        })
      } else {
        await supabase.from("expenses").insert({
          user_id: user.id,
          period_id: periodId,
          name: tx.name,
          value: Math.abs(tx.amount),
          date: tx.date,
          category_id,
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
            />
            {fileName && (
              <p className="text-xs text-muted-foreground">
                {fileName} • {transactions.length} transacao(oes)
              </p>
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
                <p className="text-sm font-semibold text-foreground">
                  Mapeamento de colunas
                </p>
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
        <CardContent className="p-0">
          {previewRows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Nenhuma transacao carregada.
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Preview</p>
                  <p className="text-xs text-muted-foreground">
                    Mostrando {previewRows.length} de {transactionRows.length}
                  </p>
                </div>
                {transactionRows.length > 8 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAll((prev) => !prev)}
                  >
                    {showAll ? "Mostrar menos" : "Ver todas"}
                  </Button>
                )}
              </div>
              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Receitas {formatCurrency(summary.income)}</Badge>
                  <Badge variant="secondary">Despesas {formatCurrency(summary.expense)}</Badge>
                  <Badge variant="secondary">Transferencias +{formatCurrency(summary.transferIn)}</Badge>
                  <Badge variant="secondary">Transferencias -{formatCurrency(summary.transferOut)}</Badge>
                  <Badge variant="secondary">Investimentos {formatCurrency(summary.investment)}</Badge>
                  <Badge variant="secondary">Carteira {formatCurrency(summary.market)}</Badge>
                  <Badge variant="secondary">Receb. invest. {formatCurrency(summary.investmentIncome)}</Badge>
                  <Badge variant="outline">Ignoradas {summary.skipped}</Badge>
                </div>
              </div>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
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
                  const categoryList = isIncomeType ? incomeCategories : expenseCategories
                  const categoryValue =
                    categoryOverrides[row.id] ||
                    (isIncomeType ? incomeCategory : expenseCategory) ||
                    "none"

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">
                          {tx.name}
                        </p>
                        {tx.memo && (
                          <p className="text-xs text-muted-foreground/80">{tx.memo}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrency(Math.abs(tx.amount))}
                      </TableCell>
                      <TableCell>
                        {row.type === "investment_out"
                          ? "Investimento"
                          : row.type === "market_out"
                            ? "Carteira"
                            : row.type === "investment_income" || row.type === "market_income"
                              ? "Receb. investimento"
                              : row.type === "transfer_in"
                                ? "Transf. recebida"
                                : row.type === "transfer_out"
                                  ? "Transf. enviada"
                                  : tx.amount >= 0
                                    ? "Receita"
                                    : "Despesa"}
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <Select
                          value={categoryValue}
                          onValueChange={(value) =>
                            setCategoryOverrides((prev) => ({
                              ...prev,
                              [row.id]: value,
                            }))
                          }
                          disabled={row.type === "investment_out" || row.type === "market_out"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sem categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem categoria</SelectItem>
                            {categoryList.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {row.skipped && <Badge variant="outline">Ignorada</Badge>}
                          {row.type === "income" && <Badge variant="secondary">Receita</Badge>}
                          {row.type === "expense" && <Badge variant="secondary">Despesa</Badge>}
                          {row.type === "transfer_in" && <Badge variant="secondary">Transf. recebida</Badge>}
                          {row.type === "transfer_out" && <Badge variant="secondary">Transf. enviada</Badge>}
                          {row.type === "investment_out" && <Badge variant="secondary">Investimento</Badge>}
                          {row.type === "market_out" && <Badge variant="secondary">Carteira</Badge>}
                          {(row.type === "investment_income" || row.type === "market_income") && (
                            <Badge variant="secondary">Receb. investimento</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
