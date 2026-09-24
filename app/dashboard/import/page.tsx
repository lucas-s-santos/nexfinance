"use client"

// Importação de extratos: mesmo fluxo e mesmas regras do app (nexfinance-mobile/src/app/(app)/import.tsx).
// O PDF vira texto na rota /api/parse-pdf; a leitura das movimentações (lib/statement) roda aqui.
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import { toast } from "sonner"
import { ArrowLeftRight, CheckCircle2, ChevronDown, CircleCheck, RotateCcw, TriangleAlert, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImportHistory } from "@/components/import/import-history"
import { useCategories } from "@/lib/use-financial-data"
import { parseOfx } from "@/lib/ofx"
import { parseCsv } from "@/lib/csv"
import { detectDuplicates, importTransactions } from "@/lib/import-engine"
import { buildTransactionsFromCsv, detectCsvMapping, hasUsableCsvMapping, parsePdfStatement } from "@/lib/statement/parsers"
import { classifyTransaction, DEFAULT_CLASSIFY_OPTIONS, suggestCategoryId, type ClassifyOptions, type TxKind } from "@/lib/statement/rules"
import { normalizeText } from "@/lib/statement/text"
import { dropDuplicateStatements } from "@/lib/statement/merge"
import type { StatementCheck, StatementTx } from "@/lib/statement/types"
import { formatCurrency, formatDate, MONTHS } from "@/lib/format"
import { cn } from "@/lib/utils"

const MEMORY_KEY = "nexfinance_category_memory"
const PREFS_KEY = "nexfinance_import_prefs"

type Source = "ofx" | "csv" | "pdf"
type Category = { id: string; name: string; type: string }

// localStorage some em aba anônima ou com os dados do site apagados: sem ele, só não lembra.
function readStored<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

async function extractPdfText(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file, file.name)
  const res = await fetch("/api/parse-pdf", { method: "POST", body: formData })
  const data = await res.json().catch(() => ({}) as any)
  if (!res.ok) throw new Error(data.error || "Não foi possível ler o PDF.")
  return data.text as string
}

function detectSource(name: string): Source | null {
  const lower = name.toLowerCase()
  if (lower.endsWith(".ofx")) return "ofx"
  if (lower.endsWith(".csv")) return "csv"
  if (lower.endsWith(".pdf")) return "pdf"
  return null
}

async function readStatement(file: File, source: Source): Promise<{ transactions: StatementTx[]; check?: StatementCheck; warnings: string[] }> {
  if (source === "pdf") return parsePdfStatement(await extractPdfText(file))
  const content = await file.text()
  if (source === "ofx") {
    return { transactions: parseOfx(content).map((tx, i) => ({ ...tx, id: `ofx-${i}`, source: "ofx" as const })), warnings: [] }
  }
  const csvData = parseCsv(content)
  const map = detectCsvMapping(csvData.headers)
  if (!hasUsableCsvMapping(map)) throw new Error("não encontramos as colunas de data, descrição e valor")
  return { transactions: buildTransactionsFromCsv(csvData, map), warnings: [] }
}

const KIND_COLOR: Record<TxKind, string> = { income: "text-success", expense: "text-destructive", investment: "text-primary" }

// O rótulo do investimento depende da direção: saiu da conta = aplicação; voltou = resgate.
function kindOptions(amount: number): { value: TxKind; label: string }[] {
  return amount >= 0
    ? [
        { value: "income", label: "Receita" },
        { value: "investment", label: "Resgate de investimento" },
      ]
    : [
        { value: "expense", label: "Despesa" },
        { value: "investment", label: "Aplicação em investimento" },
      ]
}

function kindLabel(kind: TxKind, amount: number): string {
  if (kind === "investment") return amount >= 0 ? "Resgate" : "Aplicação"
  return kind === "income" ? "Receita" : "Despesa"
}

type ParsedFile = { name: string; source: Source; check?: StatementCheck; warnings: string[]; count: number; period?: string }
type ReviewTx = StatementTx & { fileIndex: number }

type RowState = {
  include: boolean
  kind: TxKind
  categoryId: string | null
  /** Valor com sinal (visão da conta) — dá para inverter quando o extrato for ambíguo. */
  amount: number
  skipReason?: string
  /** Marcada/desmarcada à mão: trocar as regras não mexe mais nesta linha. */
  touched?: boolean
}

function classifyRow(tx: StatementTx, amount: number, categories: Category[], memory: Record<string, string>, options: ClassifyOptions): RowState {
  const { kind, skipReason } = classifyTransaction({ ...tx, amount }, options)
  const remembered = kind === "investment" ? undefined : memory[normalizeText(tx.name)]
  const categoryId = kind === "investment" ? null : (remembered ?? suggestCategoryId(tx, kind, categories))
  return { include: !skipReason, kind, categoryId, amount, skipReason }
}

function periodOf(txs: StatementTx[]): string | undefined {
  if (txs.length === 0) return undefined
  const [y, m] = txs[0].date.split("-").map(Number)
  const sameMonth = txs.every((t) => t.date.startsWith(txs[0].date.slice(0, 7)))
  return sameMonth ? `${MONTHS[m - 1]} de ${y}` : undefined
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export default function ImportPage() {
  const router = useRouter()
  const { data: categoriesData } = useCategories()
  const categories = (categoriesData ?? []) as Category[]
  const inputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<"pick" | "review" | "result">("pick")
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [notices, setNotices] = useState<string[]>([])

  const [options, setOptions] = useState<ClassifyOptions>(DEFAULT_CLASSIFY_OPTIONS)
  const [memory, setMemory] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [txs, setTxs] = useState<ReviewTx[]>([])
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [duplicates, setDuplicates] = useState<Set<string>>(new Set())
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number; files: number } | null>(null)

  useEffect(() => {
    const saved = readStored<Partial<ClassifyOptions>>(PREFS_KEY)
    if (saved) setOptions({ ...DEFAULT_CLASSIFY_OPTIONS, ...saved })
  }, [])

  function reset() {
    setPhase("pick")
    setErrors([])
    setNotices([])
    setFiles([])
    setTxs([])
    setRows({})
    setDuplicates(new Set())
    setExpandedId(null)
    setResult(null)
  }

  async function handleFiles(picked: File[]) {
    if (picked.length === 0) return
    setErrors([])
    setLoading(true)
    const mem = readStored<Record<string, string>>(MEMORY_KEY) ?? {}
    const loaded: { name: string; source: Source; transactions: StatementTx[]; check?: StatementCheck; warnings: string[] }[] = []
    const problems: string[] = []

    for (const file of picked) {
      const source = detectSource(file.name)
      if (!source) {
        problems.push(`${file.name}: formato não suportado (use .pdf, .csv ou .ofx).`)
        continue
      }
      try {
        const { transactions, check, warnings } = await readStatement(file, source)
        if (transactions.length === 0) {
          problems.push(`${file.name}: nenhuma movimentação encontrada.`)
          continue
        }
        loaded.push({ name: file.name, source, transactions, check, warnings })
      } catch (e: any) {
        problems.push(`${file.name}: ${e?.message ?? "não foi possível ler o arquivo."}`)
      }
    }

    // O mesmo extrato em dois formatos (ex.: PDF e OFX do mesmo mês) entra uma vez só.
    const { kept, skipped } = dropDuplicateStatements(loaded)
    const parsedFiles: ParsedFile[] = []
    const all: ReviewTx[] = []
    kept.forEach((st, index) => {
      parsedFiles.push({ name: st.name, source: st.source, check: st.check, warnings: st.warnings, count: st.transactions.length, period: periodOf(st.transactions) })
      for (const tx of st.transactions) all.push({ ...tx, id: `${index}-${tx.id}`, fileIndex: index })
    })
    setNotices(skipped.map(({ statement, coveredBy }) => `${statement.name} não foi usado: é o mesmo extrato de ${coveredBy.name}.`))

    setErrors(problems)
    setLoading(false)
    if (all.length === 0) return

    const initial: Record<string, RowState> = {}
    for (const tx of all) initial[tx.id] = classifyRow(tx, tx.amount, categories, mem, options)
    setMemory(mem)
    setFiles(parsedFiles)
    setTxs(all)
    setRows(initial)
    setPhase("review")

    // Movimentações que já estão no banco vêm desmarcadas.
    setCheckingDuplicates(true)
    detectDuplicates(all)
      .then((found) => {
        setDuplicates(found)
        setRows((prev) => {
          const next = { ...prev }
          for (const id of found) if (next[id]) next[id] = { ...next[id], include: false }
          return next
        })
      })
      .catch(() => {})
      .finally(() => setCheckingDuplicates(false))
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    if (!loading) handleFiles(Array.from(e.dataTransfer.files))
  }

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  // Trocar uma regra reclassifica as linhas que ainda não foram mexidas à mão.
  function changeOptions(patch: Partial<ClassifyOptions>) {
    const next = { ...options, ...patch }
    setOptions(next)
    writeStored(PREFS_KEY, next)
    setRows((prev) => {
      const out: Record<string, RowState> = {}
      for (const tx of txs) {
        const current = prev[tx.id]
        if (!current) continue
        const fresh = classifyRow(tx, current.amount, categories, memory, next)
        const keepCategory = fresh.kind === current.kind ? current.categoryId : fresh.categoryId
        const include = current.touched ? current.include : fresh.include && !duplicates.has(tx.id)
        out[tx.id] = { ...fresh, categoryId: keepCategory, include, touched: current.touched }
      }
      return out
    })
  }

  // Entrou ↔ saiu: reclassifica do zero com o novo sinal (receita vira despesa, aplicação vira resgate).
  function flipDirection(tx: ReviewTx) {
    setRows((prev) => {
      const current = prev[tx.id]
      const next = classifyRow(tx, -current.amount, categories, {}, options)
      return { ...prev, [tx.id]: { ...next, include: current.include, touched: current.touched } }
    })
  }

  const selection = useMemo(() => {
    const totals = { count: 0, income: 0, expense: 0, applied: 0, redeemed: 0 }
    for (const tx of txs) {
      const row = rows[tx.id]
      if (!row?.include) continue
      totals.count += 1
      if (row.kind === "income") totals.income += row.amount
      else if (row.kind === "expense") totals.expense += -row.amount
      else if (row.amount < 0) totals.applied += -row.amount
      else totals.redeemed += row.amount
    }
    return totals
  }, [txs, rows])

  const hasCardBills = txs.some((t) => t.hint === "card-payment")
  const hasOwnTransfers = txs.some((t) => t.hint === "own-transfer")
  const uncertainCount = txs.filter((t) => t.uncertain).length

  async function doImport() {
    const active = txs.filter((t) => rows[t.id]?.include)
    if (active.length === 0) return

    setImporting(true)
    try {
      let success = 0
      let failed = 0
      let importedFiles = 0
      for (const [index, file] of files.entries()) {
        const payload = active
          .filter((tx) => tx.fileIndex === index)
          .map((tx) => ({
            name: tx.name,
            amount: rows[tx.id].amount,
            date: tx.date,
            kind: rows[tx.id].kind,
            category_id: rows[tx.id].kind === "investment" ? null : rows[tx.id].categoryId,
            paymentMethod: tx.paymentMethod,
          }))
        if (payload.length === 0) continue
        const outcome = await importTransactions(payload, file.name, file.source)
        success += outcome.success
        failed += outcome.failed
        importedFiles += 1
      }

      // Lembra a categoria escolhida para cada nome — a próxima importação já vem preenchida.
      const nextMemory = { ...memory }
      for (const tx of active) {
        const row = rows[tx.id]
        if (row.categoryId && row.kind !== "investment") nextMemory[normalizeText(tx.name)] = row.categoryId
      }
      writeStored(MEMORY_KEY, nextMemory)

      mutate(() => true) // recarrega receitas, despesas, investimentos e resumos
      setResult({ success, failed, files: importedFiles })
      setPhase("result")
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível importar. Tente de novo.")
    } finally {
      setImporting(false)
    }
  }

  function renderFileHeader(file: ParsedFile, index: number) {
    const check = file.check
    return (
      <div className={cn("flex flex-col gap-1.5 pb-2", index > 0 ? "pt-5" : "pt-1")}>
        <h3 className="truncate text-base font-semibold text-foreground">{file.period ?? file.name}</h3>
        {check ? (
          <div className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-xs", check.ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
            {check.ok ? <CircleCheck className="mt-px h-4 w-4 shrink-0" /> : <TriangleAlert className="mt-px h-4 w-4 shrink-0" />}
            <span>
              {check.ok
                ? `Confere com o extrato: entradas ${formatCurrency(check.expectedIn)} · saídas ${formatCurrency(check.expectedOut)}`
                : `Não confere com o extrato (entradas ${formatCurrency(check.parsedIn)} de ${formatCurrency(check.expectedIn)} · saídas ${formatCurrency(check.parsedOut)} de ${formatCurrency(check.expectedOut)}). Revise antes de importar.`}
            </span>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {plural(file.count, "movimentação", "movimentações")} · {file.name}
        </p>
      </div>
    )
  }

  function renderTx(tx: ReviewTx) {
    const row = rows[tx.id]
    if (!row) return null
    const isDup = duplicates.has(tx.id)
    const expanded = expandedId === tx.id
    const entered = row.amount >= 0
    const catOptions = row.kind === "investment" ? [] : categories.filter((c) => c.type === row.kind)
    const warning = isDup ? "Já está no NexFinance" : row.skipReason ?? (tx.uncertain ? "Confira o valor ou se entrou/saiu" : null)

    return (
      <Card key={tx.id} className={cn("mb-2 transition-opacity", !row.include && "opacity-50")}>
        <div className="flex items-center gap-3 p-3">
          <Switch checked={row.include} onCheckedChange={(v) => updateRow(tx.id, { include: v, touched: true })} aria-label={`Importar ${tx.name}`} />
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={() => setExpandedId(expanded ? null : tx.id)}
            aria-expanded={expanded}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{tx.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatDate(tx.date)} · {kindLabel(row.kind, row.amount)}
                {tx.note ? ` · ${tx.note}` : ""}
              </p>
              {warning ? <p className="text-[11px] font-semibold text-warning">{warning}</p> : null}
            </div>
            <span className={cn("shrink-0 text-sm font-semibold tabular-nums", KIND_COLOR[row.kind])}>
              {entered ? "+" : "−"} {formatCurrency(Math.abs(row.amount))}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
          </button>
        </div>

        {expanded ? (
          <div className="flex flex-col gap-3 border-t border-border p-3">
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => flipDirection(tx)}>
              <ArrowLeftRight className="mr-2 h-3.5 w-3.5" />
              {entered ? "Entrou na conta — marcar como saída" : "Saiu da conta — marcar como entrada"}
            </Button>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Tipo</span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="flex-wrap justify-start"
                value={row.kind}
                onValueChange={(v) => v && updateRow(tx.id, { kind: v as TxKind, categoryId: null })}
              >
                {kindOptions(row.amount).map((o) => (
                  <ToggleGroupItem key={o.value} value={o.value}>
                    {o.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {catOptions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Categoria</span>
                <Select value={row.categoryId ?? ""} onValueChange={(v) => updateRow(tx.id, { categoryId: v })}>
                  <SelectTrigger className="h-9 max-w-xs">
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {catOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar extrato</h1>
        <p className="text-muted-foreground">Extratos do banco em PDF, CSV ou OFX.</p>
      </div>

      {phase === "pick" ? (
        <>
          <Card
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn("border-dashed transition-colors", dragging && "border-primary bg-primary/5")}
          >
            <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Importe seus extratos</h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Envie ou arraste um ou vários arquivos .pdf, .csv ou .ofx. Separamos o que entrou, o que saiu e o que foi para investimentos, e
                conferimos com os totais do banco. Você revisa tudo antes de salvar.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.csv,.ofx"
                multiple
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? [])
                  e.target.value = ""
                  handleFiles(picked)
                }}
              />
              <Button onClick={() => inputRef.current?.click()} disabled={loading}>
                {loading ? "Lendo arquivos…" : "Selecionar arquivos"}
              </Button>
            </CardContent>
          </Card>

          {errors.length > 0 ? (
            <div className="flex flex-col gap-1 rounded-xl border border-warning/30 bg-warning/10 p-3">
              {errors.map((e) => (
                <p key={e} className="text-xs text-warning">
                  {e}
                </p>
              ))}
            </div>
          ) : null}

          <ImportHistory onChanged={() => mutate(() => true)} />
        </>
      ) : null}

      {phase === "review" ? (
        <>
          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <h2 className="text-base font-semibold text-foreground">
                {plural(txs.length, "movimentação", "movimentações")} em {plural(files.length, "arquivo", "arquivos")}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Receitas <strong className="font-semibold text-success">{formatCurrency(selection.income)}</strong>
                </span>
                <span>
                  Despesas <strong className="font-semibold text-destructive">{formatCurrency(selection.expense)}</strong>
                </span>
                <span>
                  Aplicações <strong className="font-semibold text-primary">{formatCurrency(selection.applied)}</strong>
                </span>
                <span>
                  Resgates <strong className="font-semibold text-primary">{formatCurrency(selection.redeemed)}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {checkingDuplicates ? (
                  <span className="text-xs text-muted-foreground">Procurando o que já está no NexFinance…</span>
                ) : duplicates.size > 0 ? (
                  <span className="flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                    <TriangleAlert className="h-3 w-3" />
                    {duplicates.size} já {duplicates.size === 1 ? "está" : "estão"} no NexFinance
                  </span>
                ) : null}
                {uncertainCount > 0 ? (
                  <span className="flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                    <ArrowLeftRight className="h-3 w-3" />
                    {uncertainCount} para conferir
                  </span>
                ) : null}
                {notices.map((n) => (
                  <p key={n} className="w-full text-xs text-muted-foreground">
                    {n}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {hasCardBills || hasOwnTransfers ? (
            <Card>
              <CardContent className="flex flex-col gap-4 p-5">
                <h2 className="text-base font-semibold text-foreground">Como tratar</h2>
                {hasCardBills ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-muted-foreground">Pagamento da fatura do cartão</span>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      value={options.cardBill}
                      onValueChange={(v) => v && changeOptions({ cardBill: v as ClassifyOptions["cardBill"] })}
                      aria-label="Pagamento da fatura do cartão"
                    >
                      <ToggleGroupItem value="expense">Despesa</ToggleGroupItem>
                      <ToggleGroupItem value="skip">Ignorar</ToggleGroupItem>
                    </ToggleGroup>
                    <p className="text-xs text-muted-foreground">Ignore só se você também importa a fatura do cartão, com cada compra.</p>
                  </div>
                ) : null}
                {hasOwnTransfers ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-muted-foreground">Transferências entre suas contas</span>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      value={options.ownTransfers}
                      onValueChange={(v) => v && changeOptions({ ownTransfers: v as ClassifyOptions["ownTransfers"] })}
                      aria-label="Transferências entre suas contas"
                    >
                      <ToggleGroupItem value="count">Contar</ToggleGroupItem>
                      <ToggleGroupItem value="skip">Ignorar</ToggleGroupItem>
                    </ToggleGroup>
                    <p className="text-xs text-muted-foreground">Contar: o que chega de outra conta sua é receita e o que vai para ela é despesa.</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <div>
            {files.map((file, index) => (
              <section key={`${file.name}-${index}`}>
                {files.length > 1 || file.check ? renderFileHeader(file, index) : null}
                {txs.filter((tx) => tx.fileIndex === index).map(renderTx)}
              </section>
            ))}
          </div>

          <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-2xl lg:border">
            <div className="flex gap-3">
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={reset} aria-label="Recomeçar importação">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button className="h-11 flex-1" onClick={doImport} disabled={importing || selection.count === 0}>
                {importing ? "Importando…" : `Importar ${plural(selection.count, "movimentação", "movimentações")}`}
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {phase === "result" && result ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Importação concluída</h2>
            <p className="text-muted-foreground">
              {result.success} {result.success === 1 ? "movimentação salva" : "movimentações salvas"}
              {result.files > 1 ? ` de ${result.files} arquivos` : ""}
              {result.failed > 0 ? `, ${result.failed} com erro` : ""}.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={reset}>
                Importar outros arquivos
              </Button>
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                Ir para o início
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
