// Mesmo código do app (nexfinance-mobile/src/lib/statement/nubank.ts). Mantenha os dois iguais.
// Leitor do extrato de conta do Nubank, a partir do texto que o pdf-parse (servidor web)
// extrai do PDF. Particularidades desse texto:
//  - a data vem numa linha própria ("04 ABR 2026") e cada dia tem blocos
//    "Total de entradas+ 1.980,00" / "Total de saídas- 1.196,33";
//  - as colunas vêm grudadas, inclusive o valor: "Compra no débitoLOJA 0215,99" pode ser
//    loja "LOJA 02" + 15,99 ou "LOJA 0" + 215,99. Para decidir, cada valor ambíguo vira uma
//    lista de candidatos e a combinação escolhida é a que fecha com o total do bloco;
//  - descrições longas quebram em várias linhas e o valor vem sozinho na última.
// No fim, as entradas e saídas somadas são conferidas com o resumo do topo do extrato.
import { normalizeText, type Direction } from "./text"
import type { PdfStatement, StatementTx } from "./types"

const MONTHS: Record<string, number> = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 }

const DATE_LINE = /^(\d{2}) (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez) (\d{4})$/
const SECTION_LINE = /^total de (entradas|saidas)\s*[+\-−]?\s*(\d[\d.]*,\d{2})$/
const AMOUNT_ONLY = /^(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})$/
const TRAILING_AMOUNT = /(\d[\d.]*),(\d{2})$/

// Cabeçalho/rodapé repetidos em toda página (comparados já normalizados).
const NOISE = [
  /cpfagencia/,
  /^\d{5,}-\d$/, // nº de conta solto (cabeçalho ou continuação de dados bancários)
  /^a \d{2} de [a-z]+ de \d{4}/,
  /^valores em r\$/,
  /^movimentacoes$/,
  /^saldo (inicial|final)/,
  /^rendimento liquido/,
  /^r\$ /,
  /^tem alguma duvida/,
  /atendimento 24h/,
  /^caso a solucao/,
  /ouvidoria/,
  /^extrato gerado/,
  /^\d+ de \d+$/,
  /^o saldo liquido/,
  /^nao nos responsabilizamos/,
  /^asseguramos/,
  /^nu (financeira|pagamentos) s\.a/,
  /^cnpj:/,
]

type TypeKind = "pix-out" | "pix-in" | "debit" | "card-bill" | "other"

// Tipos de lançamento que abrem uma nova linha no extrato (prefixos normalizados, do mais
// específico para o mais genérico). Só frases próprias de início de lançamento: palavras
// soltas como "pagamento" também começam linhas de continuação ("PAGAMENTOS - IP (0260)…").
const TYPES: { prefix: string; kind: TypeKind }[] = [
  { prefix: "transferencia enviada pelo pix", kind: "pix-out" },
  { prefix: "transferencia recebida pelo pix via", kind: "pix-in" },
  { prefix: "transferencia recebida pelo pix", kind: "pix-in" },
  { prefix: "transferencia recebida", kind: "pix-in" },
  { prefix: "transferencia enviada", kind: "pix-out" },
  { prefix: "compra no debito", kind: "debit" },
  { prefix: "pagamento de fatura", kind: "card-bill" },
  ...[
    "transferencia de saldo nuinvest",
    "compra de fii",
    "compra de criptomoedas",
    "compra no credito",
    "pagamento de boleto",
    "pagamento efetuado",
    "aplicacao em investimento",
    "aplicacao cdb",
    "aplicacao rdb",
    "aplicacao",
    "resgate rdb",
    "resgate",
    "credito em conta",
    "devolucao",
    "irrf sobre resgate",
    "irrf",
    "estorno",
    "reembolso",
    "deposito",
    "saque",
    "tarifa",
    "rendimento",
    "juros",
    "iof",
    "recarga",
    "portabilidade",
    "cashback",
  ].map((prefix) => ({ prefix, kind: "other" as TypeKind })),
]

// Normalização que preserva o tamanho do texto (para recortar o original pela posição).
function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function matchType(raw: string): { kind: TypeKind; label: string; rest: string } | null {
  const folded = fold(raw)
  const t = TYPES.find((type) => folded.startsWith(type.prefix))
  if (!t) return null
  return { kind: t.kind, label: raw.slice(0, t.prefix.length).trim(), rest: raw.slice(t.prefix.length).trim() }
}

const LOWER_WORDS = new Set(["de", "da", "do", "das", "dos", "e"])

// "MARIA DA SILVA SOUZA" → "Maria da Silva Souza". Só mexe em texto todo em maiúsculas;
// palavras com dígito ou pontuação (MXRF11, S.A., IFOOD.COM) ficam como estão.
function prettyCase(s: string): string {
  if (/[a-zà-ÿ]/.test(s)) return s
  return s
    .split(" ")
    .map((word, i) => {
      if (/[\d.*/&]/.test(word)) return word
      const lower = word.toLowerCase()
      if (i > 0 && LOWER_WORDS.has(lower)) return lower
      return lower.replace(/[a-zà-ÿ]/, (c) => c.toUpperCase())
    })
    .join(" ")
}

// Empresas que aparecem com a razão social inteira no extrato.
const ALIASES: [RegExp, string][] = [
  [/ifood/, "iFood"],
  [/shpp brasil|shopee/, "Shopee"],
  [/^99 tecnologia/, "99"],
  [/bytedance/, "TikTok"],
  [/kiwify/, "Kiwify"],
  [/mercado ?livre/, "Mercado Livre"],
  [/^uber/, "Uber"],
]

// Contraparte sem CPF mascarado, CNPJ, dados bancários e prefixo de maquininha ("MP *", "CPG*").
function cleanCounterpart(s: string): string {
  let out = s.split(/\s+-\s+(?:•|\d{2}\.\d{3}\.\d{3}|\d{3}\.\d{3}\.\d{3})/)[0]
  out = out.replace(/\s*\(Transfer[êe]ncia.*$/i, "")
  out = out.replace(/^\d{2}\.\d{3}\.\d{3}\s+/, "") // CNPJ de MEI antes do nome
  out = out.replace(/[\s-]+$/, "").trim()
  const withoutAcquirer = out.replace(/^[A-Za-z0-9.]{1,12}(?:\s[A-Za-z])?\s?\*\s?/, "")
  if (withoutAcquirer.length >= 2) out = withoutAcquirer
  const alias = ALIASES.find(([re]) => re.test(normalizeText(out)))
  return alias ? alias[1] : prettyCase(out)
}

const BANKS: [RegExp, string][] = [
  [/sicredi/, "Sicredi"],
  [/caixa/, "Caixa"],
  [/itau/, "Itaú"],
  [/bradesco/, "Bradesco"],
  [/santander/, "Santander"],
  [/banco inter\b|\binter \(0077\)/, "Inter"],
  [/\bc6\b/, "C6"],
  [/nu pagamentos/, "Nubank"],
  [/mercado pago/, "Mercado Pago"],
  [/picpay/, "PicPay"],
  [/pagseguro/, "PagSeguro"],
  [/sicoob/, "Sicoob"],
  [/banco do brasil|bco do brasil/, "Banco do Brasil"],
]

function bankOf(raw: string): string | undefined {
  const n = normalizeText(raw)
  return BANKS.find(([re]) => re.test(n))?.[1]
}

type Candidate = { cents: number; text: string }

// Valores possíveis para um número grudado no fim do texto. Valor sem separador de milhar
// tem no máximo 3 dígitos e não começa com zero (o extrato sempre escreve 1.000,00).
export function amountCandidates(line: string): Candidate[] {
  const m = line.match(TRAILING_AMOUNT)
  if (!m || m.index === undefined) return []
  const intStr = m[1]
  const decimals = m[2]
  const out: Candidate[] = []
  for (let i = 0; i < intStr.length; i++) {
    const part = intStr.slice(i)
    if (!/^\d/.test(part)) continue
    if (i > 0 && intStr[i - 1] === ".") continue
    const valid = part.includes(".") ? /^\d{1,3}(\.\d{3})+$/.test(part) : part.length <= 3 && (part === "0" || !part.startsWith("0"))
    if (!valid) continue
    const cents = Number(part.replace(/\./g, "")) * 100 + Number(decimals)
    if (cents === 0) continue
    out.push({ cents, text: line.slice(0, m.index + i).trim() })
  }
  return out // do maior (mais dígitos) para o menor
}

type Item = {
  date: string
  lines: string[]
  candidates: Candidate[]
  chosen: number
  uncertain: boolean
  /** Linhas que sobraram depois do valor (dados bancários após quebra de página) — só para achar o banco. */
  trailing: string[]
}
type Section = { date: string; direction: Direction; totalCents: number; items: Item[] }

// Quão natural fica o nome da loja com esse corte: terminar em letra ("…SENH") é o mais comum;
// número separado por espaço ("AMARELINHO 2", "LJ 390") é plausível; letra grudada em dígito
// ("SENH2") quase nunca acontece.
function plausibility(text: string): number {
  if (/[^\d\s]$/.test(text)) return 2
  if (/\s\d+$/.test(text)) return 1
  return 0
}

// Escolhe o candidato de cada item para que a soma feche com o total do bloco.
function solveSection(section: Section, warnings: string[]) {
  const fixed = section.items.filter((it) => it.candidates.length === 1)
  const amb = section.items.filter((it) => it.candidates.length > 1)
  const target = section.totalCents - fixed.reduce((s, it) => s + it.candidates[0].cents, 0)

  if (amb.length === 0) {
    if (target !== 0) {
      warnings.push(`${section.date}: os valores do bloco não fecham com o total do extrato`)
      for (const it of section.items) it.uncertain = true
    }
    return
  }

  const solutions: number[][] = []
  const pick: number[] = []
  let visited = 0
  const search = (i: number, remaining: number) => {
    if (solutions.length >= 50 || ++visited > 200_000) return
    if (i === amb.length) {
      if (remaining === 0) solutions.push([...pick])
      return
    }
    amb[i].candidates.forEach((c, ci) => {
      if (c.cents > remaining) return
      pick.push(ci)
      search(i + 1, remaining - c.cents)
      pick.pop()
    })
  }
  search(0, target)

  if (solutions.length === 0) {
    // Nada fecha: fica com o candidato mais longo e pede conferência.
    warnings.push(`${section.date}: não foi possível confirmar alguns valores pelo total do dia`)
    for (const it of amb) {
      it.chosen = 0
      it.uncertain = true
    }
    return
  }

  // Mais de uma combinação fecha o total: vence a de nomes mais plausíveis, e os itens que
  // mudam entre as combinações ficam marcados para conferir.
  const score = (sol: number[]) => sol.reduce((sum, ci, i) => sum + plausibility(amb[i].candidates[ci].text), 0)
  const best = solutions.reduce((a, b) => (score(b) > score(a) ? b : a))
  best.forEach((ci, i) => {
    amb[i].chosen = ci
    if (solutions.some((sol) => sol[i] !== ci)) amb[i].uncertain = true
  })
}

function parseMoney(s: string): number {
  return Math.round(Number(s.replace(/\./g, "").replace(",", ".")) * 100)
}

// Totais do resumo no topo: "+0,00" (rendimento), "+2.225,01" (entradas), "-2.198,31" (saídas).
function readSummary(lines: string[]): { inCents: number; outCents: number } | undefined {
  const end = lines.findIndex((l) => normalizeText(l) === "movimentacoes")
  const head = lines.slice(0, end > 0 ? end : 40)
  const signed = head.map((l) => l.trim()).filter((l) => /^[+-]\s?\d[\d.]*,\d{2}$/.test(l))
  const outIdx = signed.findIndex((l) => l.startsWith("-"))
  if (outIdx < 1) return undefined
  return { inCents: parseMoney(signed[outIdx - 1].replace(/^[+\s]+/, "")), outCents: parseMoney(signed[outIdx].replace(/^[-\s]+/, "")) }
}

export function isNubankStatement(text: string): boolean {
  const n = normalizeText(text.slice(0, 4000))
  return (n.includes("nubank") || n.includes("nu pagamentos") || n.includes("cpfagencia")) && /total de (entradas|saidas)/.test(normalizeText(text))
}

export function parseNubankStatement(text: string): PdfStatement {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim().length > 0)
  const holderName = lines[0] && /^[A-Za-zÀ-ÿ' ]+$/.test(lines[0].trim()) && lines[0].trim().includes(" ") ? lines[0].trim() : undefined
  const holderKey = holderName ? normalizeText(holderName) : null
  const warnings: string[] = []

  const sections: Section[] = []
  let date = ""
  let section: Section | null = null
  let buffer: string[] = []

  // Descarta o texto acumulado; se ele veio logo depois de um lançamento, guarda como "sobra" dele.
  const flushBuffer = () => {
    const last = section?.items[section.items.length - 1]
    if (last && buffer.length > 0) last.trailing.push(...buffer)
    buffer = []
  }

  // No fim do documento a sobra é o rodapé legal ("…Financiamento e Investimento"), não dado bancário.
  const closeSection = (keepTrailing = true) => {
    if (keepTrailing) flushBuffer()
    buffer = []
    if (section) solveSection(section, warnings)
    section = null
  }

  const addItem = (itemLines: string[], candidates: Candidate[]) => {
    if (!section || candidates.length === 0) return
    section.items.push({ date: section.date, lines: itemLines, candidates, chosen: 0, uncertain: false, trailing: [] })
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const n = normalizeText(line)

    const d = n.match(DATE_LINE)
    if (d) {
      closeSection()
      date = `${d[3]}-${String(MONTHS[d[2]]).padStart(2, "0")}-${d[1]}`
      continue
    }
    const s = n.match(SECTION_LINE)
    if (s) {
      closeSection()
      if (date) {
        section = { date, direction: s[1] === "entradas" ? "in" : "out", totalCents: parseMoney(s[2]), items: [] }
        sections.push(section)
      }
      continue
    }
    if (!section) continue
    if ((holderKey && n === holderKey) || NOISE.some((re) => re.test(n))) continue

    if (AMOUNT_ONLY.test(line)) {
      // Valor sozinho: fecha a descrição acumulada nas linhas anteriores.
      if (buffer.length > 0) addItem(buffer, [{ cents: parseMoney(line), text: buffer.join(" ") }])
      buffer = []
      continue
    }

    const startsItem = matchType(line) !== null
    if (TRAILING_AMOUNT.test(line)) {
      // Texto + valor grudado. Se não abre um lançamento, é a última linha da descrição acumulada.
      const itemLines = startsItem || buffer.length === 0 ? [line] : [...buffer, line]
      const prefix = itemLines.slice(0, -1).join(" ")
      const candidates = amountCandidates(line).map((c) => ({ cents: c.cents, text: prefix ? `${prefix} ${c.text}` : c.text }))
      addItem(itemLines, candidates)
      buffer = []
      continue
    }

    // Texto sem valor: abre um lançamento ou continua a descrição. Continuações depois de um
    // lançamento já fechado (dados bancários após quebra de página) viram "sobra" dele.
    if (startsItem) {
      flushBuffer()
      buffer = [line]
    } else {
      buffer.push(line)
    }
  }
  closeSection(false)

  const transactions: StatementTx[] = []
  let parsedIn = 0
  let parsedOut = 0
  for (const sec of sections) {
    for (const item of sec.items) {
      const candidate = item.candidates[item.chosen]
      const cents = candidate.cents
      if (sec.direction === "in") parsedIn += cents
      else parsedOut += cents
      transactions.push(buildTx(candidate.text, cents, sec.direction, item, transactions.length, holderKey))
    }
  }

  const summary = readSummary(lines)
  const check = summary
    ? {
        expectedIn: summary.inCents / 100,
        expectedOut: summary.outCents / 100,
        parsedIn: parsedIn / 100,
        parsedOut: parsedOut / 100,
        ok: summary.inCents === parsedIn && summary.outCents === parsedOut,
      }
    : undefined
  if (check && !check.ok) warnings.push("A soma das movimentações não bate com o resumo do extrato")

  return { bank: "nubank", holderName, transactions, check, warnings }
}

function buildTx(text: string, cents: number, direction: Direction, item: Item, index: number, holderKey: string | null): StatementTx {
  const raw = text.replace(/\s+/g, " ").trim()
  const type = matchType(raw)
  const counterpart = type ? cleanCounterpart(type.rest) : ""
  const isOwn = Boolean(holderKey && counterpart && normalizeText(counterpart) === holderKey)
  const bank = isOwn ? bankOf(`${type?.rest ?? ""} ${item.trailing.join(" ")}`) : undefined

  let name = raw
  let paymentMethod: StatementTx["paymentMethod"]
  let hint: StatementTx["hint"]
  let note: string | undefined

  if (type) {
    switch (type.kind) {
      case "pix-out":
        paymentMethod = "pix"
        name = isOwn ? `Transferência para sua conta${bank ? ` ${bank}` : ""}` : `Pix para ${counterpart || "destinatário"}`
        break
      case "pix-in":
        name = isOwn ? `Transferência da sua conta${bank ? ` ${bank}` : ""}` : `Pix de ${counterpart || "remetente"}`
        break
      case "debit":
        paymentMethod = "debit"
        name = counterpart || "Compra no débito"
        break
      case "card-bill":
        hint = "card-payment"
        name = "Fatura do cartão"
        break
      default:
        name = counterpart ? `${type.label} ${counterpart}` : type.label
    }
  }
  if (isOwn) {
    hint = "own-transfer"
    note = `Entre suas contas${bank ? ` · ${bank}` : ""}`
  }

  return {
    id: `pdf-${index}`,
    date: item.date,
    amount: direction === "in" ? cents / 100 : -cents / 100,
    name,
    memo: type ? `${type.label} ${type.rest}`.trim() : raw,
    source: "pdf",
    uncertain: item.uncertain || undefined,
    hint,
    paymentMethod,
    note,
  }
}
