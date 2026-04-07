"use client"

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { parseOfx } from "@/lib/ofx"
import { parseCsv } from "@/lib/csv"
import { parseMoneyToNumber } from "@/lib/money"
import { formatCurrency, formatDate } from "@/lib/format"
import { useCategories } from "@/lib/use-financial-data"
import { ImportTransactionPayload, importBatchSchema } from "@/lib/validators"
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
import { motion, AnimatePresence } from "framer-motion"
import { UploadCloud, Check, X, LayoutList, LayoutPanelLeft, Undo2, AlertTriangle, ArrowRightLeft } from "lucide-react"

type ImportTransaction = {
  id: string
  date: string
  amount: number
  name: string
  memo?: string
  source: "ofx" | "csv" | "pdf"
  baseHint?: "income" | "expense" | "investment"
  /** Quantidade de parcelas detected (ex: "3/12" -> 12 parcelas) */
  installmentCount?: number
  /** Parcela atual (ex: parcela 3 de 12 -> installmentCurrent: 3) */
  installmentCurrent?: number
}

type CsvColumnMap = {
  date: string
  amount: string
  name: string
  memo: string
  type: string
}

type TxClassification = {
  type: "income" | "expense" | "investment"
  reason: string
}

export default function ImportPage() {
  const [transactions, setTransactions] = useState<ImportTransaction[]>([])
  const [fileName, setFileName] = useState("")
  const [fileType, setFileType] = useState<"ofx" | "csv" | "pdf" | null>(null)
  const [csvData, setCsvData] = useState<ReturnType<typeof parseCsv> | null>(null)
  const [csvMap, setCsvMap] = useState<CsvColumnMap>({
    date: "",
    amount: "",
    name: "",
    memo: "",
    type: "",
  })
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({})
  const [ignoredOverrides, setIgnoredOverrides] = useState<Record<string, boolean>>({})
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})
  const [typeOverrides, setTypeOverrides] = useState<Record<string, "income" | "expense" | "investment">>({})
  const [autoCategoriesApplied, setAutoCategoriesApplied] = useState(false)
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<"upload" | "reconciliation" | "review">("upload")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [loading, setLoading] = useState(false)
  const [installmentModal, setInstallmentModal] = useState<{
    tx: ImportTransaction
    count: number
    totalValue: number
  } | null>(null)
  const [expandedRules, setExpandedRules] = useState(false)
  const expensePaymentMethod = "debit"
  const [showMapping, setShowMapping] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [previewSearch, setPreviewSearch] = useState("")
  const [previewType, setPreviewType] = useState("all")
  const [previewStatus, setPreviewStatus] = useState("all")
  const [previewDateFrom, setPreviewDateFrom] = useState("")
  const [previewDateTo, setPreviewDateTo] = useState("")
  const [previewMinValue, setPreviewMinValue] = useState("")
  const [previewMaxValue, setPreviewMaxValue] = useState("")
  const [viewMode, setViewMode] = useState<"focus" | "table">("focus")
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
    detail?: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: categories } = useCategories()
  const incomeCategories = (categories ?? []).filter((cat) => cat.type === "income")
  const expenseCategories = (categories ?? []).filter((cat) => cat.type === "expense")
  const investmentCategories = (categories ?? []).filter((cat) => cat.type === "investment")

  // =====================================================
  // KEYWORD-BASED CLASSIFICATION
  // =====================================================

  const categoryRules = useMemo(() => [
    {
      baseType: "income",
      keywords: ["salario", "salário", "prolabore", "contracheque", "holerite"],
      names: ["Salario", "Salário"],
    },
    {
      baseType: "income",
      keywords: ["freelance", "servico", "serviço"],
      names: ["Freelance"],
    },
    {
      baseType: "expense",
      keywords: [
        "supermercado", "mercado", "padaria", "restaurante", "lanchonete",
        "sorveteria", "ifood", "alimentacao", "alimentação",
      ],
      names: ["Alimentacao", "Alimentação"],
    },
    {
      baseType: "expense",
      keywords: ["uber", "99", "gasolina", "combustivel", "combustível", "transporte"],
      names: ["Transporte"],
    },
    {
      baseType: "expense",
      keywords: ["aluguel", "condominio", "condomínio", "energia", "luz", "agua", "água", "internet"],
      names: ["Moradia"],
    },
    {
      baseType: "expense",
      keywords: ["farmacia", "farmácia", "medico", "médico", "hospital", "saude", "saúde"],
      names: ["Saude", "Saúde"],
    },
    {
      baseType: "expense",
      keywords: ["curso", "faculdade", "escola", "educacao", "educação"],
      names: ["Educacao", "Educação"],
    },
    {
      baseType: "expense",
      keywords: ["cinema", "netflix", "spotify", "streaming", "lazer"],
      names: ["Lazer"],
    },
    {
      baseType: "expense",
      keywords: ["shopping", "loja", "compra", "compras", "amazon", "mercado livre"],
      names: ["Compras"],
    },
  ], [])

  // =====================================================
  // HELPERS
  // =====================================================

  const getTxDescription = (tx: ImportTransaction) => {
    const override = descriptionOverrides[tx.id]
    const cleaned = override?.trim()
    return cleaned ? cleaned : tx.name
  }

  const detectMapping = (headers: string[]) => {
    const normalized = headers.map((h) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    const guess = (keys: string[]) =>
      headers[normalized.findIndex((h) => keys.some((k) => h.includes(k)))] ?? ""

    return {
      date: guess(["data", "date", "dt"]) || "",
      amount: guess(["valor", "amount", "value", "vlr"]) || "",
      name: guess(["descricao", "description", "historico", "nome", "name"]) || "",
      memo: guess(["memo", "obs", "detalhe", "details", "identificador"]) || "",
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

  const inferType = (value: string): "income" | "expense" | "investment" | null => {
    const text = value.toLowerCase()
    if (!text) return null
    if (text.includes("deb") || text.includes("desp") || text === "d") return "expense"
    if (text.includes("cred") || text.includes("rec") || text === "c") return "income"
    if (text.includes("invest") || text === "i") return "investment"
    return null
  }

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

  const buildCategoryMap = (items: Array<{ id: string; name: string }>) => {
    const map = new Map<string, string>()
    items.forEach((cat) => {
      map.set(normalizeText(cat.name), cat.id)
    })
    return map
  }

  const incomeCategoryMap = useMemo(
    () => buildCategoryMap(incomeCategories),
    [incomeCategories]
  )
  const expenseCategoryMap = useMemo(
    () => buildCategoryMap(expenseCategories),
    [expenseCategories]
  )
  const investmentCategoryMap = useMemo(
    () => buildCategoryMap(investmentCategories),
    [investmentCategories]
  )

  const findCategoryId = (names: string[], baseType: string) => {
    const map = baseType === "income"
      ? incomeCategoryMap
      : baseType === "investment"
        ? investmentCategoryMap
        : expenseCategoryMap
    for (const name of names) {
      const id = map.get(normalizeText(name))
      if (id) return id
    }
    return null
  }

  const normalizeDescription = (tx: ImportTransaction) =>
    normalizeText(`${getTxDescription(tx)} ${tx.memo ?? ""}`)

  const hasKeyword = (normalized: string, keywords: string[]) =>
    keywords.some((keyword) => normalized.includes(keyword))

  // =====================================================
  // CLASSIFICATION ENGINE
  // Keywords are carefully curated to separate revenue from
  // investments, avoiding false positives like "rendimento"
  // (which could be interest-yield OR investment return).
  // =====================================================

  /** Keywords that strongly indicate real investment actions */
  const investmentKeywords = useMemo(() => [
    "invest",
    "tesouro",
    "cdb",
    "lci",
    "lca",
    "bolsa",
    "renda fixa", "renda variavel", "rendavariavel",
    "fundo de investimento", "fundoimobiliario", "fundo imobiliario",
    "acao", "acoes",
    "fii", "fiis",
    "etf", "cripto", "bitcoin", "ethereum",
    "caixinha", "caixinhas nubank",
    "rdb",
    "aplicacao financeira", "aplicacao financeira",
    "resgate de investimento",
    "nu invest", "nuinvest",
  ], [])

  /** Keywords that look like passive returns that are INCOME not investments */
  const yieldIncomeKeywords = useMemo(() => [
    "rendimento de conta",
    "juros sobre capital",
    "juros saldo",
    "dividendos",
    "cashback",
    "bonus de indicacao",
    "rendimento automatico",
  ], [])

  const classifyTransaction = useCallback((tx: ImportTransaction): TxClassification => {
    // 0) Explicit user override wins
    if (typeOverrides[tx.id]) {
      return { type: typeOverrides[tx.id], reason: "Manual override" }
    }

    // 1) Explicit hint from source data
    if (tx.baseHint === "income") return { type: "income", reason: "Hint: income" }
    if (tx.baseHint === "expense") return { type: "expense", reason: "Hint: expense" }
    if (tx.baseHint === "investment") {
      // Double-check it's not a false positive from "rendimento" meaning yield
      if (tx.baseHint === "investment") {
        const normalized = normalizeDescription(tx)
        const isYieldAsIncome = yieldIncomeKeywords.some(kw =>
          normalized.includes(normalizeText(kw))
        )
        if (isYieldAsIncome) {
          return { type: "income", reason: "Yield income detected" }
        }
      }
      return { type: "investment", reason: "Hint: investment" }
    }

    // 2) Keyword-based classification
    const normalized = normalizeDescription(tx)

    // Check yield-as-income FIRST (more specific)
    const isYield = yieldIncomeKeywords.some(kw =>
      normalized.includes(normalizeText(kw))
    )
    if (isYield) {
      return { type: "income", reason: "Yield income keyword detected" }
    }

    // Then check investment keywords
    const isInvestment = investmentKeywords.some(kw =>
      normalized.includes(normalizeText(kw))
    )
    if (isInvestment) {
      return { type: "investment", reason: "Investment keyword detected" }
    }

    // 3) Fallback to amount sign
    if (tx.amount >= 0) {
      return { type: "income", reason: "Positive amount" }
    }

    return { type: "expense", reason: "Negative amount" }
  }, [typeOverrides, normalizeDescription, investmentKeywords, yieldIncomeKeywords])

  /** Alias for API payload type conversion */
  const resolveBaseType = (tx: ImportTransaction) => {
    return classifyTransaction(tx).type
  }

  const suggestCategoryId = (tx: ImportTransaction, baseType: string) => {
    const normalized = normalizeDescription(tx)
    const cleanRawName = tx.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()

    try {
      if (typeof window !== "undefined") {
        const memory = JSON.parse(localStorage.getItem("nexfinance_category_memory") || "{}")
        if (memory[cleanRawName]) return memory[cleanRawName]
      }
    } catch(e) {}

    for (const rule of categoryRules) {
      if (rule.baseType !== baseType) continue
      if (hasKeyword(normalized, rule.keywords)) {
        const match = findCategoryId(rule.names, baseType)
        if (match) return match
      }
    }

    return null
  }

  const resolveExpensePaymentMethod = (tx: ImportTransaction) => {
    const normalized = normalizeDescription(tx)
    if (normalized.includes("pix")) return "pix"
    return expensePaymentMethod
  }

  const parseInstallmentInfo = (name: string): { count?: number; current?: number } | null => {
    const match = name.match(/(\d+)\s*[\/\-]\s*(\d+)/i)
    if (match) {
      return { current: parseInt(match[1]), count: parseInt(match[2]) }
    }
    if (/parc/i.test(name)) {
      const countMatch = name.match(/(\d+)x/i)
      if (countMatch) return { count: parseInt(countMatch[1]) }
    }
    return null
  }

  const isRowSkipped = (tx: ImportTransaction) =>
    Boolean(ignoredOverrides[tx.id])

  // =====================================================
  // BUILD TRANSACTIONS
  // =====================================================

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

        const mappedIndices = new Set([dateIndex, amountIndex, nameIndex, memoIndex, typeIndex].filter(i => i >= 0))
        const extras: string[] = []
        if (memoIndex >= 0 && rawMemo) extras.push(rawMemo.trim())

        data.headers.forEach((h, i) => {
          if (!mappedIndices.has(i)) {
            const val = row[i]?.trim()
            if (val) extras.push(`${h}: ${val}`)
          }
        })
        const memo = extras.join(" | ") || undefined

        const parsedAmount = parseMoneyToNumber(rawAmount)
        const typeHint = inferType(rawType)
        const isNegative = rawAmount.trim().startsWith("-")
        let amount = parsedAmount

        if (typeHint === "expense") amount = -Math.abs(parsedAmount)
        else if (typeHint === "income") amount = Math.abs(parsedAmount)
        else if (isNegative) amount = -Math.abs(parsedAmount)
        else if (typeHint === "investment") amount = Math.abs(parsedAmount)

        if (!date || !name || Number.isNaN(amount)) return null

        const baseHint = typeHint ?? undefined
        const installment = parseInstallmentInfo(rawName)

        const tx: ImportTransaction = {
          id: `csv-${index}`,
          date,
          amount,
          name,
          ...(memo ? { memo } : {}),
          source: "csv",
          ...(baseHint ? { baseHint } : {}),
          ...(installment?.count ? { installmentCount: installment.count } : {}),
          ...(installment?.current ? { installmentCurrent: installment.current } : {}),
        }
        return tx
      })
      .filter(isImportTransaction)
  }

  // =====================================================
  // FILE HANDLER
  // =====================================================

  const handleFile = async (file: File) => {
    const text = await file.text()
    const extension = file.name.split(".").pop()?.toLowerCase()
    setFileName(file.name)
    setDescriptionOverrides({})
    setIgnoredOverrides({})
    setCategoryOverrides({})
    setTypeOverrides({})
    setAutoCategoriesApplied(false)
    setImportResult(null)

    if (extension === "csv") {
      const parsed = parseCsv(text)
      setCsvData(parsed)
      setCsvMap(detectMapping(parsed.headers))
      setFileType("csv")
      setTransactions([])
      return
    }

    if (extension === "pdf") {
      try {
        setLoading(true)
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData
        })

        if (!res.ok) {
          const err = await res.json()
          toast.error(err.error || "Erro ao processar PDF")
          setLoading(false)
          return
        }

        const data = await res.json()
        const { parsePdfTransactions } = await import("@/lib/pdf")
        const parsed = parsePdfTransactions(data.text)

        if (parsed.length === 0) {
          toast.warning("Nenhuma transacao identificada no PDF. Verifique se o formato e suportado.")
        }

        setFileType("pdf")
        setCsvData(null)
        setCsvMap({ date: "", amount: "", name: "", memo: "", type: "" })
        setTransactions(
          parsed.map((tx, index) => {
            const installment = parseInstallmentInfo(tx.name)
            return {
              id: `pdf-${index}`,
              date: tx.date,
              amount: tx.amount,
              name: tx.name,
              memo: tx.memo,
              source: "pdf" as const,
              baseHint: inferType(`${tx.name} ${tx.memo ?? ""}`) ?? undefined,
              ...(installment?.count ? { installmentCount: installment.count } : {}),
              ...(installment?.current ? { installmentCurrent: installment.current } : {}),
            }
          })
        )
        setStep("reconciliation")
        setCurrentIndex(0)
      } catch (error) {
        console.error("Erro inesperado ao processar PDF:", error)
        toast.error("Erro inesperado ao processar PDF")
      } finally {
        setLoading(false)
      }
      return
    }

    if (extension === "ofx") {
      if (!text.includes("</OFX>") && !text.includes("<OFX>")) {
        toast.error("Arquivo OFX invalido ou corrompido")
        return
      }

      const parsed = parseOfx(text)
      if (parsed.length === 0) {
        toast.warning("Nenhuma transacao encontrada no arquivo OFX.")
        return
      }

      setFileType("ofx")
      setCsvData(null)
      setCsvMap({ date: "", amount: "", name: "", memo: "", type: "" })
      setTransactions(
        parsed.map((tx, index) => {
          const installment = parseInstallmentInfo(tx.name)
          return {
            id: `ofx-${index}`,
            date: tx.date,
            amount: tx.amount,
            name: tx.name,
            memo: tx.memo,
            source: "ofx" as const,
            baseHint: inferType(`${tx.name} ${tx.memo ?? ""}`) ?? undefined,
            ...(installment?.count ? { installmentCount: installment.count } : {}),
            ...(installment?.current ? { installmentCurrent: installment.current } : {}),
          }
        })
      )
      setStep("reconciliation")
      setCurrentIndex(0)
    } else {
      toast.error("Formato de arquivo nao suportado. Use .OFX, .CSV ou .PDF")
    }
  }

  // =====================================================
  // CSV BUILD EFFECT
  // =====================================================

  useEffect(() => {
    if (!csvData || fileType !== "csv") return
    const built = buildTransactionsFromCsv(csvData, csvMap)
    setTransactions(built)
    if (built.length === 0) {
      toast.warning("Nenhuma transacao valida encontrada no CSV. Verifique o mapeamento de colunas.")
    }
    setDescriptionOverrides({})
    setIgnoredOverrides({})
    setCategoryOverrides({})
    setAutoCategoriesApplied(false)
  }, [csvData, csvMap, fileType])

  // =====================================================
  // AUTO-CATEGORIZE
  // =====================================================

  useEffect(() => {
    if (autoCategoriesApplied) return
    if (transactions.length === 0) return
    if (!categories || categories.length === 0) return

    setCategoryOverrides((prev) => {
      let changed = false
      const next = { ...prev }
      for (const tx of transactions) {
        if (next[tx.id]) continue
        const baseType = resolveBaseType(tx)
        const suggested = suggestCategoryId(tx, baseType)
        if (suggested) {
          next[tx.id] = suggested
          changed = true
        }
      }
      return changed ? next : prev
    })

    setAutoCategoriesApplied(true)
  }, [autoCategoriesApplied, categories, transactions, resolveBaseType, suggestCategoryId])

  // =====================================================
  // DUPLICATE DETECTION (improved fuzzy matching)
  // =====================================================

  useEffect(() => {
    if (transactions.length === 0) {
      setDuplicateIds(new Set())
      return
    }

    const checkDuplicates = async () => {
      setCheckingDuplicates(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setCheckingDuplicates(false)
        return
      }

      let minDate = transactions[0].date
      let maxDate = transactions[0].date
      for (const tx of transactions) {
        if (tx.date < minDate) minDate = tx.date
        if (tx.date > maxDate) maxDate = tx.date
      }

      // Expand date range by +/- 1 day for safety
      const minDateExp = new Date(minDate)
      minDateExp.setDate(minDateExp.getDate() - 1)
      const maxDateExp = new Date(maxDate)
      maxDateExp.setDate(maxDateExp.getDate() + 1)
      const minDateStr = minDateExp.toISOString().split("T")[0]
      const maxDateStr = maxDateExp.toISOString().split("T")[0]

      try {
        const [incomesRes, expensesRes, investmentsRes] = await Promise.all([
          supabase.from("incomes").select("date, value, name").eq("user_id", user.id).gte("date", minDateStr).lte("date", maxDateStr),
          supabase.from("expenses").select("date, value, name").eq("user_id", user.id).gte("date", minDateStr).lte("date", maxDateStr),
          supabase.from("reserves_investments").select("date, value, name").eq("user_id", user.id).gte("date", minDateStr).lte("date", maxDateStr),
        ])

        const getCleanName = (n: string) =>
          n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")

        // Strict key: exact date + exact value + first 5 chars
        const existingKeysStrict = new Set<string>()
        // Loose key: date +/- 1d + exact value + first 3 chars
        const existingKeysLoose = new Set<string>()

        const processRows = (rows: any[] | null) => {
          if (!rows) return
          for (const row of rows) {
            const val = Math.abs(row.value)
            const cleanName = getCleanName(row.name)
            const strictKey = `${row.date}-${val}-${cleanName.substring(0, 5)}`
            const looseKey = `${row.date}-${val}-${cleanName.substring(0, 3)}`
            existingKeysStrict.add(strictKey)
            existingKeysLoose.add(looseKey)
          }
        }

        processRows(incomesRes.data)
        processRows(expensesRes.data)
        processRows(investmentsRes.data)

        const newDups = new Set<string>()
        const looseDups = new Set<string>() // warn but don't block

        for (const tx of transactions) {
          const val = Math.abs(tx.amount)
          const cleanName = getCleanName(tx.name)
          const strictKey = `${tx.date}-${val}-${cleanName.substring(0, 5)}`

          if (existingKeysStrict.has(strictKey)) {
            newDups.add(tx.id)
          } else {
            // Fuzzy check: same value + similar name +/- 1 day
            for (const existing of existingKeysLoose) {
              const [exDate, exVal, exName] = existing.split("-")
              if (
                exVal === String(val) &&
                cleanName.substring(0, 4) === exName.substring(0, 4) &&
                Math.abs(new Date(tx.date).getTime() - new Date(exDate).getTime()) <= 2 * 86400000
              ) {
                looseDups.add(tx.id)
                break
              }
            }
          }
        }

        setDuplicateIds(newDups)
        // Merge loose into dups for visual warning but don't auto-ignore
        setDuplicateIds(new Set([...newDups, ...looseDups]))
      } catch (error) {
        console.error("Erro ao verificar duplicatas:", error)
      } finally {
        setCheckingDuplicates(false)
      }
    }

    checkDuplicates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  // =====================================================
  // DERIVED DATA
  // =====================================================

  const transactionRows = useMemo(() => {
    return transactions.map((tx) => {
      const skipped = isRowSkipped(tx)
      const classification = classifyTransaction(tx)

      return {
        id: tx.id,
        tx,
        skipped,
        baseType: classification.type,
      }
    })
  }, [classifyTransaction, ignoredOverrides, transactions])

  const toggleIgnored = (id: string) => {
    setIgnoredOverrides((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const filteredRows = useMemo(() => {
    const query = normalizeText(previewSearch.trim())
    const resolveDescription = (tx: ImportTransaction) => {
      const override = descriptionOverrides[tx.id]
      const cleaned = override?.trim()
      return cleaned ? cleaned : tx.name
    }

    const matchesType = (baseType: string) => {
      if (previewType === "all") return true
      if (previewType === "income") return baseType === "income"
      if (previewType === "expense") return baseType === "expense"
      if (previewType === "investment") return baseType === "investment"
      return true
    }

    return transactionRows.filter((row) => {
      if (!matchesType(row.baseType)) return false
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
    let skipped = 0

    for (const row of filteredRows) {
      if (row.skipped) {
        skipped += 1
        continue
      }
      const amount = Math.abs(row.tx.amount)
      if (row.baseType === "income") income += amount
      else if (row.baseType === "investment") investment += amount
      else expense += amount
    }

    return {
      income,
      expense,
      investment,
      skipped,
      total: income + expense + investment,
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

  const getTypeLabel = (baseType: string, amount: number) => {
    if (baseType === "investment") return "Investimento"
    return amount >= 0 ? "Receita" : "Despesa"
  }

  const activeTx = filteredRows[currentIndex]

  // =====================================================
  // KEYBOARD SHORTCUTS
  // =====================================================

  useEffect(() => {
    if (step !== "reconciliation" || viewMode !== "focus" || !activeTx) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault()
        setIgnoredOverrides((prev) => ({ ...prev, [activeTx.id]: false }))
        setCurrentIndex((prev) => prev + 1)
      } else if (e.key === "ArrowLeft" || e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        setIgnoredOverrides((prev) => ({ ...prev, [activeTx.id]: true }))
        setCurrentIndex((prev) => prev + 1)
      } else if (e.key >= "1" && e.key <= "9") {
        const num = parseInt(e.key) - 1
        const classification = classifyTransaction(activeTx.tx)
        const cats = classification.type === "income"
          ? incomeCategories
          : classification.type === "investment"
            ? investmentCategories
            : expenseCategories
        if (cats && cats[num]) {
          e.preventDefault()
          setIgnoredOverrides((prev) => ({ ...prev, [activeTx.id]: false }))
          setCategoryOverrides((prev) => ({ ...prev, [activeTx.id]: cats[num].id }))
          setCurrentIndex((prev) => prev + 1)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [step, activeTx, incomeCategories, expenseCategories, investmentCategories, viewMode, classifyTransaction])

  // Navigate to review when end of queue
  useEffect(() => {
    if (step === "reconciliation" && filteredRows.length > 0 && currentIndex >= filteredRows.length) {
      setStep("review")
    }
  }, [currentIndex, filteredRows.length, step])

  // =====================================================
  // IMPORT (via API route with batch validation)
  // =====================================================

  const handleImport = async () => {
    const activeRows = transactionRows.filter((row) => !isRowSkipped(row.tx))
    if (activeRows.length === 0) {
      toast.error("Nenhuma transacao ativa para importar")
      return
    }

    setLoading(true)
    setImportResult(null)

    try {
      // Build validated payload array
      const payload: ImportTransactionPayload[] = activeRows.map((row) => {
        const tx = row.tx
        const type = row.baseType
        const value = Math.abs(tx.amount)

        const base: any = {
          type,
          name: getTxDescription(tx) || tx.name,
          value,
          date: tx.date,
          category_id: categoryOverrides[tx.id] || undefined,
        }

        if (type === "expense") {
          base.payment_method = resolveExpensePaymentMethod(tx)
          base.is_essential = false
        }

        return base
      })

      // Client-side pre-validation to catch obvious issues before hitting the API
      const batchPayload = {
        fileName,
        source: fileType || undefined,
        transactions: payload,
      }

      const clientValidation = importBatchSchema.safeParse(batchPayload)
      if (!clientValidation.success) {
        const issues = clientValidation.error.issues
        toast.error(`Dados invalidos: ${issues.slice(0, 3).map(i => i.message).join(", ")}`)
        setLoading(false)
        return
      }

      // Save category memory
      if (typeof window !== "undefined") {
        const memory = JSON.parse(localStorage.getItem("nexfinance_category_memory") || "{}")
        for (const row of activeRows) {
          const catId = categoryOverrides[row.tx.id]
          if (catId) {
            const cleanRawName = row.tx.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
            memory[cleanRawName] = catId
          }
        }
        localStorage.setItem("nexfinance_category_memory", JSON.stringify(memory))
      }

      // Send to API
      const response = await fetch("/api/import-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchPayload),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || "Erro ao importar transacoes")
        if (result.details) {
          console.error("Detalhes do erro:", result.details)
        }
        setLoading(false)
        return
      }

      const { summary, results: importResults } = result

      setImportResult({
        success: summary.success,
        failed: summary.failed,
        detail: importResults
          ?.filter((r: any) => r.status === "error")
          ?.map((r: any) => `Item ${r.index + 1}: ${r.error || "Erro desconhecido"}`),
      })

      if (summary.success > 0) {
        toast.success(`${summary.success} transacao(oes) importada(s) com sucesso!`)
      }

      if (summary.failed > 0) {
        toast.warning(`${summary.failed} transacao(oes) falharam`)
      }

      // Clear form after successful import
      if (summary.failed === 0) {
        setTransactions([])
        setFileName("")
        setFileType(null)
        setStep("upload")
      }
    } catch (error: any) {
      console.error("Erro na importacao:", error)
      toast.error("Erro de conexao ao importar transacoes")
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // INSTALLMENT HANDLING
  // =====================================================

  const handleInstallmentSplit = async (tx: ImportTransaction, installmentCount: number) => {
    const totalValue = Math.abs(tx.amount)
    const valuePerParcel = totalValue / installmentCount

    const newTransactions: ImportTransaction[] = []
    const baseDate = new Date(tx.date)

    for (let i = 1; i <= installmentCount; i++) {
      const parcelDate = new Date(baseDate)
      parcelDate.setMonth(parcelDate.getMonth() + (i - 1))
      const dateStr = `${parcelDate.getFullYear()}-${String(parcelDate.getMonth() + 1).padStart(2, "0")}-${String(parcelDate.getDate()).padStart(2, "0")}`

      newTransactions.push({
        ...tx,
        id: `${tx.id}-parcela-${i}`,
        name: `${tx.name} (${i}/${installmentCount})`,
        amount: -(i === installmentCount ? totalValue - valuePerParcel * (installmentCount - 1) : valuePerParcel),
        date: dateStr,
        baseHint: "expense" as const,
        installmentCount,
        installmentCurrent: i,
      })
    }

    // Replace original transaction with split items
    setTransactions((prev) => {
      const idx = prev.findIndex((t) => t.id === tx.id)
      if (idx === -1) return prev
      const next = [...prev]
      next.splice(idx, 1, ...newTransactions)
      return next
    })

    setInstallmentModal(null)
    toast.info(`Parcela dividida em ${installmentCount}x de ${formatCurrency(valuePerParcel)}`)
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importação Inteligente</h1>
        <p className="text-muted-foreground">
          Importe OFX, PDF ou CSV de forma fluida e focada.
        </p>
      </div>

      {step === "upload" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-8">
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if(f) handleFile(f) }}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Arraste seu extrato aqui</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Suporta .OFX, .PDF e .CSV
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx,.csv,.pdf"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
                <Button variant="secondary" className="pointer-events-none">Selecionar Arquivo</Button>
              </div>

              {fileType === "csv" && csvData && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-muted/30 rounded-xl p-6 border border-border">
                    <h3 className="font-semibold mb-2">Configure as Colunas do CSV</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="grid gap-2"><Label>Data</Label><Select value={csvMap.date||"none"} onValueChange={(v)=>setCsvMap({...csvMap,date:v==="none"?"":v})}><SelectTrigger><SelectValue placeholder="Escolher"/></SelectTrigger><SelectContent><SelectItem value="none">Ignorar</SelectItem>{csvData.headers.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="grid gap-2"><Label>Valor</Label><Select value={csvMap.amount||"none"} onValueChange={(v)=>setCsvMap({...csvMap,amount:v==="none"?"":v})}><SelectTrigger><SelectValue placeholder="Escolher"/></SelectTrigger><SelectContent><SelectItem value="none">Ignorar</SelectItem>{csvData.headers.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="grid gap-2"><Label>Descricao</Label><Select value={csvMap.name||"none"} onValueChange={(v)=>setCsvMap({...csvMap,name:v==="none"?"":v})}><SelectTrigger><SelectValue placeholder="Escolher"/></SelectTrigger><SelectContent><SelectItem value="none">Ignorar</SelectItem>{csvData.headers.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <Button onClick={() => { setStep("reconciliation"); setCurrentIndex(0) }} className="w-full">
                       Iniciar Reconciliação
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === "reconciliation" && filteredRows.length > 0 && (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
          <div className="w-full flex items-center justify-between bg-card text-card-foreground border rounded-xl overflow-hidden shadow-sm p-2">
            <div className="flex items-center gap-2 pl-2">
              <div className="flex bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setViewMode("focus")}
                  className={`flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "focus" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutPanelLeft className="w-4 h-4 mr-2" />
                  Foco
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "table" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutList className="w-4 h-4 mr-2" />
                  Tabela
                </button>
              </div>
            </div>

            <div className="text-sm font-medium text-muted-foreground hidden sm:block">
              Analisando {viewMode === "focus" ? currentIndex + 1 : filteredRows.length} de {filteredRows.length}
            </div>

            <Button variant="default" size="sm" onClick={() => setStep("review")}>
              Concluir Etapa
            </Button>
          </div>

          {viewMode === "table" ? (
            <Card className="overflow-hidden border-border/50 shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead className="w-[200px]">Descrição Editável</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria Rápida</TableHead>
                      <TableHead className="w-[140px] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id} className={ignoredOverrides[row.id] ? "opacity-50" : ""}>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {formatDate(row.tx.date)}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-sm focus-visible:ring-1"
                            value={descriptionOverrides[row.id] ?? row.tx.name}
                            onChange={(e) => setDescriptionOverrides(prev => ({ ...prev, [row.id]: e.target.value }))}
                            onBlur={() => {
                              const current = (descriptionOverrides[row.id] ?? "").trim()
                              if (!current || current === row.tx.name) {
                                setDescriptionOverrides(prev => { const n = {...prev}; delete n[row.id]; return n; })
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className={`text-right font-bold whitespace-nowrap ${row.baseType === 'income' ? 'text-success' : row.baseType === 'investment' ? 'text-primary' : 'text-destructive'}`}>
                          {formatCurrency(Math.abs(row.tx.amount))}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={typeOverrides[row.id] || row.baseType}
                            onValueChange={(val: any) => {
                              setTypeOverrides(prev => ({ ...prev, [row.id]: val }))
                              setIgnoredOverrides(prev => ({ ...prev, [row.id]: false }))
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">Receita</SelectItem>
                              <SelectItem value="expense">Despesa</SelectItem>
                              <SelectItem value="investment">Investimento</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={categoryOverrides[row.id] || "unmapped"}
                            onValueChange={(val) => {
                              if (val === "unmapped") {
                                setCategoryOverrides(prev => { const n = {...prev}; delete n[row.id]; return n; })
                              } else {
                                setCategoryOverrides(prev => ({...prev, [row.id]: val}))
                                setIgnoredOverrides(prev => ({...prev, [row.id]: false}))
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unmapped">Nenhuma</SelectItem>
                              {(row.baseType === "income" ? incomeCategories : expenseCategories).map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={ignoredOverrides[row.id] ? "outline" : "default"}
                            size="sm"
                            className="h-8 w-full text-xs"
                            onClick={() => setIgnoredOverrides(prev => ({...prev, [row.id]: !prev[row.id]}))}
                          >
                            {ignoredOverrides[row.id] ? "❌ Ignorado" : "✅ Ativo"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : activeTx && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="hidden md:flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 rounded-xl">
                <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pb-2 mb-2 font-semibold text-sm border-b">
                  Fila de Importação
                </div>
                {filteredRows.map((row, idx) => {
                  const isPast = idx < currentIndex
                  const isActive = idx === currentIndex
                  const isIgnored = ignoredOverrides[row.id]

                  return (
                    <div
                      key={row.id}
                      className={`flex flex-col p-3 rounded-lg border text-sm transition-all cursor-pointer ${isActive ? 'bg-primary/5 border-primary shadow-sm scale-[1.02]' : isPast ? 'bg-muted/30 border-transparent opacity-60' : 'bg-card border-border/50 hover:bg-muted/50'}`}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium truncate pr-2" title={row.tx.name}>
                          {descriptionOverrides[row.id] ?? row.tx.name}
                        </span>
                        {isPast && (
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${isIgnored ? 'text-destructive border-destructive/20 bg-destructive/10' : 'text-success border-success/20 bg-success/10'}`}>
                            {isIgnored ? "Ignorado" : "OK"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{formatDate(row.tx.date)}</span>
                        <span className={`font-semibold ${row.baseType === 'income' ? 'text-success' : row.baseType === 'investment' ? 'text-primary' : 'text-destructive'}`}>
                          {formatCurrency(Math.abs(row.tx.amount))}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="md:col-span-2 flex flex-col items-center">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={activeTx.id}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: ignoredOverrides[activeTx.id] ? -100 : 100 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <Card className="overflow-hidden border-2 border-primary/10 shadow-lg">
                      <div className={`h-2 w-full ${activeTx.baseType === 'income' ? 'bg-success' : activeTx.baseType === 'investment' ? 'bg-primary' : 'bg-destructive'}`} />
                      <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                        {duplicateIds.has(activeTx.id) && (
                          <Badge variant="destructive" className="mb-2"><AlertTriangle className="w-3 h-3 mr-1" /> Possível Duplicata Detectada</Badge>
                        )}
                        {activeTx.tx.installmentCount && !activeTx.tx.installmentCurrent && (
                          <Badge className="mb-2 bg-yellow-500/20 text-yellow-600 border border-yellow-500/50">
                            <ArrowRightLeft className="w-3 h-3 mr-1" /> Compra Parcelada - {activeTx.tx.installmentCount}x
                          </Badge>
                        )}

                        <div className="space-y-1 w-full">
                          <p className="text-sm font-medium text-muted-foreground">{formatDate(activeTx.tx.date)}</p>
                          <Input
                            className="text-2xl font-bold text-center border-none shadow-none focus-visible:ring-0 focus-visible:outline-none h-auto py-2 px-0 bg-transparent"
                            value={descriptionOverrides[activeTx.id] ?? activeTx.tx.name}
                            onChange={(e) => setDescriptionOverrides(prev => ({ ...prev, [activeTx.id]: e.target.value }))}
                            onBlur={() => {
                              const current = (descriptionOverrides[activeTx.id] ?? "").trim()
                              if (!current || current === activeTx.tx.name) {
                                setDescriptionOverrides(prev => { const n = {...prev}; delete n[activeTx.id]; return n; })
                              }
                            }}
                          />
                          {activeTx.tx.memo && (
                            <p className="text-sm text-muted-foreground">{activeTx.tx.memo}</p>
                          )}
                        </div>

                        <div className={`text-5xl font-black ${activeTx.baseType === 'income' ? 'text-success' : activeTx.baseType === 'investment' ? 'text-primary' : 'text-destructive'}`}>
                          {formatCurrency(Math.abs(activeTx.tx.amount))}
                        </div>

                        {/* Type override selector */}
                        <div className="w-full">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-left">
                            Tipo
                          </p>
                          <div className="flex gap-2 justify-center">
                            {(["income", "expense", "investment"] as const).map((t) => {
                              const current = typeOverrides[activeTx.id] || activeTx.baseType
                              const isActive = current === t
                              const color = t === "income" ? "bg-success" : t === "investment" ? "bg-primary" : "bg-destructive"
                              return (
                                <button
                                  key={t}
                                  onClick={() => setTypeOverrides(prev => ({ ...prev, [activeTx.id]: t }))}
                                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive ? `${color} text-white` : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                                >
                                  {t === "income" ? "Receita" : t === "expense" ? "Despesa" : "Investimento"}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-4 pt-2">
                          <Button
                            variant="outline"
                            size="lg"
                            className="h-16 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 text-lg"
                            onClick={() => {
                              setIgnoredOverrides(prev => ({...prev, [activeTx.id]: true}))
                              setCurrentIndex(prev => prev + 1)
                            }}
                          >
                            <X className="w-6 h-6 mr-2" /> <span className="hidden sm:inline">Ignorar</span> (←)
                          </Button>
                          <Button
                            variant="default"
                            size="lg"
                            className="h-16 text-lg"
                            onClick={() => {
                              setIgnoredOverrides(prev => ({...prev, [activeTx.id]: false}))
                              setCurrentIndex(prev => prev + 1)
                            }}
                          >
                            <Check className="w-6 h-6 mr-2" /> <span className="hidden sm:inline">Aprovar</span> (→)
                          </Button>
                        </div>

                        {/* Installment split button */}
                        {activeTx.tx.installmentCount && !activeTx.tx.installmentCurrent && (
                          <div className="w-full pt-2">
                            <Button
                              variant="secondary"
                              className="w-full"
                              onClick={() => setInstallmentModal({
                                tx: activeTx.tx,
                                count: activeTx.tx.installmentCount || 12,
                                totalValue: Math.abs(activeTx.tx.amount),
                              })}
                            >
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              Dividir em Parcelas
                            </Button>
                          </div>
                        )}

                        <div className="w-full pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-left">
                            Categorias Rápidas (Teclado 1-9)
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {(activeTx.baseType === "income" ? incomeCategories : expenseCategories).slice(0, 9).map((cat, idx) => (
                              <Button
                                key={cat.id}
                                variant={categoryOverrides[activeTx.id] === cat.id ? "default" : "secondary"}
                                size="sm"
                                className="rounded-full"
                                onClick={() => {
                                  setCategoryOverrides(prev => ({...prev, [activeTx.id]: cat.id}))
                                  if (categoryOverrides[activeTx.id] === cat.id) {
                                    setIgnoredOverrides(prev => ({...prev, [activeTx.id]: false}))
                                    setCurrentIndex(prev => prev + 1)
                                  }
                                }}
                              >
                                <span className="opacity-50 mr-2 text-xs">[{idx + 1}]</span>
                                {cat.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Installment Modal */}
      {installmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setInstallmentModal(null)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold">Dividir Parcelas</h3>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(installmentModal.totalValue)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Numero de parcelas</Label>
                <Input
                  type="number"
                  min={2}
                  max={48}
                  value={installmentModal.count}
                  onChange={(e) => setInstallmentModal(prev => prev ? {
                    ...prev,
                    count: Math.max(2, Math.min(48, parseInt(e.target.value) || 2))
                  } : null)}
                />
                <p className="text-xs text-muted-foreground">
                  {installmentModal.count}x de {formatCurrency(installmentModal.totalValue / installmentModal.count)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setInstallmentModal(null)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleInstallmentSplit(installmentModal.tx, installmentModal.count)}
                >
                  Dividir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "review" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <Card>
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Revisão Concluída</h2>
              <p className="text-muted-foreground mb-8">
                Você analisou {filteredRows.length} transações.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
                <div className="bg-muted/50 p-4 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">Aprovadas</p>
                  <p className="text-2xl font-bold">{filteredRows.filter(r => !r.skipped).length}</p>
                </div>
                <div className="bg-success/10 p-4 rounded-xl">
                  <p className="text-sm text-success mb-1">Receitas</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(previewSummary.income)}</p>
                </div>
                <div className="bg-destructive/10 p-4 rounded-xl">
                  <p className="text-sm text-destructive mb-1">Despesas</p>
                  <p className="text-xl font-bold text-destructive">{formatCurrency(previewSummary.expense)}</p>
                </div>
                <div className="bg-primary/10 p-4 rounded-xl">
                  <p className="text-sm text-primary mb-1">Investimentos</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(previewSummary.investment)}</p>
                </div>
              </div>

              {importResult && (
                <div className="w-full mb-6">
                  {importResult.failed === 0 ? (
                    <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                      <p className="text-success font-semibold">Todas as {importResult.success} transações importadas com sucesso!</p>
                    </div>
                  ) : (
                    <Collapsible open={expandedRules} onOpenChange={setExpandedRules}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{importResult.success} sucesso, {importResult.failed} falhas</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-4 bg-muted/30 rounded-b-xl space-y-1">
                        {importResult.detail?.map((msg, idx) => (
                          <p key={idx} className="text-sm text-destructive">{msg}</p>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}

              <div className="flex gap-4 w-full max-w-sm">
                <Button variant="outline" className="flex-1" onClick={() => { setStep("reconciliation"); setCurrentIndex(0); }}>
                  Revisar Novamente
                </Button>
                <Button className="flex-1" size="lg" onClick={handleImport} disabled={loading || checkingDuplicates}>
                  {loading ? "Salvando..." : importResult ? "Importar Novamente" : "Salvar no Banco"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

    </div>
  )
}
