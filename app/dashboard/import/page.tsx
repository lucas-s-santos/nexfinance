"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { parseOfx } from "@/lib/ofx"
import { parseCsv } from "@/lib/csv"
import { parseMoneyToNumber } from "@/lib/money"
import { formatCurrency, formatDate } from "@/lib/format"
import { useCategories } from "@/lib/use-financial-data"
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
import { UploadCloud, Check, X } from "lucide-react"

type ImportTransaction = {
  id: string
  date: string
  amount: number
  name: string
  memo?: string
  source: "ofx" | "csv" | "pdf"
  baseHint?: "income" | "expense" | "investment"
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
  const [autoCategoriesApplied, setAutoCategoriesApplied] = useState(false)
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<"upload" | "reconciliation" | "review">("upload")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [loading, setLoading] = useState(false)
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

  const { data: categories } = useCategories()
  const incomeCategories = (categories ?? []).filter((cat) => cat.type === "income")
  const expenseCategories = (categories ?? []).filter((cat) => cat.type === "expense")

  const categoryRules = [
    {
      baseType: "income",
      keywords: ["salario", "salário"],
      names: ["Salario", "Salário"],
    },
    {
      baseType: "income",
      keywords: ["freelance"],
      names: ["Freelance"],
    },
    {
      baseType: "expense",
      keywords: [
        "supermercado",
        "mercado",
        "padaria",
        "restaurante",
        "lanchonete",
        "sorveteria",
        "ifood",
        "alimentacao",
        "alimentação",
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
  ]

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

  const inferType = (value: string) => {
    const text = value.toLowerCase()
    if (!text) return null
    if (text.includes("deb") || text.includes("desp") || text === "d") return "expense"
    if (text.includes("cred") || text.includes("rec") || text === "c") return "income"
    if (text.includes("invest") || text === "i") return "investment"
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
        
        // Preserve unmapped information in memo
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

        if (!date || !name || Number.isNaN(amount)) return null

        const baseHint = typeHint ?? undefined

        return {
          id: `csv-${index}`,
          date,
          amount,
          name,
          ...(memo ? { memo } : {}),
          source: "csv",
          ...(baseHint ? { baseHint } : {}),
        } as ImportTransaction
      })
      .filter(isImportTransaction)
  }

  const handleFile = async (file: File) => {
    const text = await file.text()
    const extension = file.name.split(".").pop()?.toLowerCase()
    setFileName(file.name)
    setDescriptionOverrides({})
    setIgnoredOverrides({})
    setCategoryOverrides({})
    setAutoCategoriesApplied(false)

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
          toast.warning("Nenhuma transação identificada no PDF. Verifique se o formato é suportado.")
        }
        
        setFileType("pdf")
        setCsvData(null)
        setCsvMap({ date: "", amount: "", name: "", memo: "", type: "" })
        setTransactions(
          parsed.map((tx, index) => ({
             id: `pdf-${index}`,
             date: tx.date,
             amount: tx.amount,
             name: tx.name,
             memo: tx.memo,
             source: "pdf",
             baseHint: inferType(`${tx.name} ${tx.memo ?? ""}`) ?? undefined
          }))
        )
        setStep("reconciliation")
        setCurrentIndex(0)
      } catch (error) {
        toast.error("Erro inesperado ao processar PDF")
      } finally {
        setLoading(false)
      }
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
        baseHint: inferType(`${tx.name} ${tx.memo ?? ""}`) ?? undefined,
      }))
    )
    setStep("reconciliation")
    setCurrentIndex(0)
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

  const findCategoryId = (names: string[], baseType: string) => {
    const map = baseType === "income" ? incomeCategoryMap : expenseCategoryMap
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

  const investmentKeywords = [
    "invest",
    "tesouro",
    "cdb",
    "lci",
    "lca",
    "bolsa",
    "renda fixa",
    "renda variavel",
    "rendavariavel",
    "acoes",
    "fiis",
    "fundo imobiliario",
    "fundoimobiliario",
  ]

  const suggestCategoryId = (tx: ImportTransaction, baseType: "income" | "expense") => {
    const normalized = normalizeDescription(tx)

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

  const resolveBaseType = (tx: ImportTransaction) => {
    const hint = tx.baseHint
    if (hint === "investment") return "investment"

    const normalized = normalizeDescription(tx)
    if (hasKeyword(normalized, investmentKeywords)) return "investment"

    if (hint === "income") return "income"
    if (hint === "expense") return "expense"
    return tx.amount >= 0 ? "income" : "expense"
  }

  const isRowSkipped = (tx: ImportTransaction) =>
    Boolean(ignoredOverrides[tx.id])

  const transactionRows = useMemo(() => {
    return transactions.map((tx) => {
      const skipped = isRowSkipped(tx)
      const baseType = resolveBaseType(tx)

      return {
        id: tx.id,
        tx,
        skipped,
        baseType,
      }
    })
  }, [ignoredOverrides, transactions])

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


  useEffect(() => {
    if (!csvData || fileType !== "csv") return
    const built = buildTransactionsFromCsv(csvData, csvMap)
    setTransactions(built)
    setDescriptionOverrides({})
    setIgnoredOverrides({})
    setCategoryOverrides({})
    setAutoCategoriesApplied(false)
  }, [csvData, csvMap, fileType])

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
  }, [autoCategoriesApplied, categories, transactions])

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

      try {
        const [incomesRes, expensesRes, investmentsRes] = await Promise.all([
          supabase.from("incomes").select("date, value").eq("user_id", user.id).gte("date", minDate).lte("date", maxDate),
          supabase.from("expenses").select("date, value").eq("user_id", user.id).gte("date", minDate).lte("date", maxDate),
          supabase.from("reserves_investments").select("date, value").eq("user_id", user.id).gte("date", minDate).lte("date", maxDate),
        ])

        const existingKeys = new Set<string>()

        const processRows = (rows: any[] | null) => {
          if (!rows) return
          for (const row of rows) {
            existingKeys.add(`${row.date}-${Math.abs(row.value)}`)
          }
        }

        processRows(incomesRes.data)
        processRows(expensesRes.data)
        processRows(investmentsRes.data)

        const newDups = new Set<string>()
        let hasChanges = false
        const nextIgnored = { ...ignoredOverrides }

        for (const tx of transactions) {
          const key = `${tx.date}-${Math.abs(tx.amount)}`
          if (existingKeys.has(key)) {
            newDups.add(tx.id)
            if (!nextIgnored[tx.id]) {
              nextIgnored[tx.id] = true
              hasChanges = true
            }
          }
        }

        setDuplicateIds(newDups)
        if (hasChanges) {
          setIgnoredOverrides(nextIgnored)
        }
      } catch (error) {
        console.error("Erro ao verificar duplicatas:", error)
      } finally {
        setCheckingDuplicates(false)
      }
    }

    checkDuplicates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  const ensurePeriod = async (userId: string, date: string) => {
    try {
      const [year, month] = date.split("-")
      const supabase = createClient()
      
      // Busca período existente
      const { data: existing } = await supabase
        .from("financial_periods")
        .select("id")
        .eq("user_id", userId)
        .eq("month", Number(month))
        .eq("year", Number(year))

      // Se encontrou, retorna o ID
      if (existing && existing.length > 0) {
        return existing[0].id
      }

      // Se não encontrou, cria novo
      const { data: newPeriod, error: insertError } = await supabase
        .from("financial_periods")
        .insert({
          user_id: userId,
          month: Number(month),
          year: Number(year),
        })
        .select("id")

      if (insertError) {
        console.error("Erro ao inserir periodo:", insertError.message)
        return null
      }

      return newPeriod?.[0]?.id ?? null
    } catch (error) {
      console.error("Erro ao processar periodo:", error)
      return null
    }
  }

  const handleImport = async () => {
    if (transactions.length === 0) {
      toast.error("Nenhuma transacao encontrada")
      return
    }

    const activeRows = transactions
      .map((tx) => {
        const baseType = resolveBaseType(tx)
        const skipped = isRowSkipped(tx)
        return {
          id: tx.id,
          tx,
          baseType,
          skipped,
        }
      })
      .filter((row) => !row.skipped)
    if (activeRows.length === 0) {
      toast.error("Nenhuma transacao ativa para importar")
      return
    }

    console.log("Iniciando importacao de", activeRows.length, "transacoes")
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      console.error("Usuario nao autenticado")
      toast.error("Usuario nao autenticado")
      setLoading(false)
      return
    }

    console.log("Usuario autenticado:", user.id)

    let imported = 0
    let failed = 0

    for (const row of activeRows) {
      try {
        const tx = row.tx
        console.log("Processando transacao:", tx.date, tx.name, tx.amount)
        
        const periodId = await ensurePeriod(user.id, tx.date)
        if (!periodId) {
          console.error("Erro ao criar periodo para", tx.date, "- Transacao skipped:", tx.name)
          failed++
          continue
        }
        console.log("Periodo criado/encontrado:", periodId)
        
        const resolvedName = getTxDescription(tx)
        const categoryId = categoryOverrides[tx.id] || null

        const isIncomeType = row.baseType === "income"
        const isInvestmentType = row.baseType === "investment"

        if (isIncomeType) {
          console.log("Inserindo receita")
          const { error } = await supabase.from("incomes").insert({
            user_id: user.id,
            period_id: periodId,
            name: resolvedName,
            value: Math.abs(tx.amount),
            date: tx.date,
            category_id: categoryId,
          })
          if (error) {
            console.error("Erro ao importar receita:", error)
            failed++
          } else {
            console.log("Receita importada")
            imported++
          }
        } else if (isInvestmentType) {
          console.log("Inserindo investimento")
          const { error } = await supabase.from("reserves_investments").insert({
            user_id: user.id,
            name: resolvedName,
            value: Math.abs(tx.amount),
            date: tx.date,
            type: "investment",
          })
          if (error) {
            console.error("Erro ao importar investimento:", error)
            failed++
          } else {
            console.log("Investimento importado")
            imported++
          }
        } else {
          console.log("Inserindo despesa")
          const { error } = await supabase.from("expenses").insert({
            user_id: user.id,
            period_id: periodId,
            name: resolvedName,
            value: Math.abs(tx.amount),
            date: tx.date,
            category_id: categoryId,
            payment_method: resolveExpensePaymentMethod(tx),
            is_essential: false,
          })
          if (error) {
            console.error("Erro ao importar despesa:", error)
            failed++
          } else {
            console.log("Despesa importada")
            imported++
          }
        }
      } catch (error) {
        console.error("Erro ao processar transacao:", error)
        failed++
      }
    }

    setLoading(false)
    console.log("Importacao finalizada:", imported, "sucesso,", failed, "falhas")
    
    if (imported > 0) {
      toast.success(`${imported} transacao(oes) importada(s) com sucesso!`)
      if (failed > 0) {
        toast.warning(`${failed} transacao(oes) falharam. Verifique o console (F12).`)
      }
    } else {
      toast.error("Nenhuma transacao foi importada. Abra o console (F12) para detalhes.")
    }
  }

  const activeTx = filteredRows[currentIndex]

  useEffect(() => {
    if (step !== "reconciliation" || !activeTx) return

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
        const cats = activeTx.baseType === "income" ? incomeCategories : expenseCategories
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
  }, [step, activeTx, incomeCategories, expenseCategories])

  useEffect(() => {
    if (step === "reconciliation" && filteredRows.length > 0 && currentIndex >= filteredRows.length) {
      setStep("review")
    }
  }, [currentIndex, filteredRows.length, step])

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
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Arraste seu extrato aqui</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Suporta .OFX, .PDF e .CSV
                </p>
                <input
                  id="file-upload"
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

      {step === "reconciliation" && activeTx && (
        <div className="flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 text-sm font-medium text-muted-foreground">
            <span>Analisando {currentIndex + 1} de {filteredRows.length}</span>
            <Button variant="ghost" size="sm" onClick={() => setStep("review")}>
              Pular para Resumo
            </Button>
          </div>

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
                    <Badge variant="destructive" className="mb-2">⚠️ Possível Duplicata Detectada</Badge>
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

                  <div className="w-full grid grid-cols-2 gap-4 pt-6">
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

                  <div className="w-full pt-6 border-t border-border/50">
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

                <div className="flex gap-4 w-full max-w-sm">
                  <Button variant="outline" className="flex-1" onClick={() => { setStep("reconciliation"); setCurrentIndex(0); }}>
                    Revisar Novamente
                  </Button>
                  <Button className="flex-1" size="lg" onClick={handleImport} disabled={loading || checkingDuplicates}>
                    {loading ? "Salvando..." : "Salvar no Banco"}
                  </Button>
                </div>
             </CardContent>
           </Card>
        </motion.div>
      )}

    </div>
  )
}
