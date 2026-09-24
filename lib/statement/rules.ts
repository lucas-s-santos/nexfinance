// Mesmo código do app (nexfinance-mobile/src/lib/statement/rules.ts). Mantenha os dois iguais.
// Regras de classificação de lançamentos de extrato.
//
// Dois conceitos separados:
//  - direção: o dinheiro ENTROU (+) ou SAIU (−) da conta — vem do sinal do valor;
//  - tipo: receita, despesa ou investimento.
// Investimento usa a direção: saiu da conta = aplicação; entrou = resgate.
import { countTerms, hasTerm, normalizeText, type Direction } from "./text"

export type TxKind = "income" | "expense" | "investment"

/** Como tratar casos que dependem de como a pessoa usa as contas (escolhido na importação). */
export type ClassifyOptions = {
  /** Pagamento da fatura do cartão: despesa (quem não importa a fatura) ou ignorar (quem importa). */
  cardBill: "expense" | "skip"
  /** Transferência entre contas do próprio titular: contar como receita/despesa ou ignorar. */
  ownTransfers: "count" | "skip"
}

export const DEFAULT_CLASSIFY_OPTIONS: ClassifyOptions = { cardBill: "expense", ownTransfers: "count" }

export type Classification = {
  kind: TxKind
  /** Quando preenchido, a linha vem desmarcada na revisão e o motivo aparece para o usuário. */
  skipReason?: string
}

/** Linhas de saldo/totais do extrato — não são transações. */
export function isBalanceLine(normalized: string): boolean {
  return (
    hasTerm(normalized, ["saldo", "s a l d o"]) ||
    /^(total de|total) (entradas|saidas|creditos|debitos)/.test(normalized)
  )
}

// Pagar a fatura só move dinheiro da conta para o cartão: as compras já entram
// uma a uma pelo cartão, então importar o pagamento contaria o gasto duas vezes.
const CARD_BILL_TERMS = [
  "pagamento de fatura",
  "pagamento fatura",
  "pagto fatura",
  "pgto fatura",
  "pag fatura",
  "fatura do cartao",
  "fatura cartao",
  "pagamento cartao de credito",
  "pagamento de cartao de credito",
  "pagamento cartao credito",
  "pagto cartao credito",
  "pagto cartao de credito",
  "pgto cartao credito",
]

const OWN_TRANSFER_TERMS = ["mesma titularidade", "entre contas", "contas proprias", "conta propria", "transferencia propria"]

// Impostos sobre aplicações (IRRF, IOF) são despesa — mesmo que o texto fale em "resgate".
const TAX_TERMS = ["irrf", "iof", "imposto*", "darf"]

// Rendimentos pagos na conta: são receita quando entram (juros de cheque especial saindo são despesa).
const YIELD_TERMS = ["rendimento*", "juros", "dividendo*", "jcp", "juros sobre capital", "cashback", "provento*", "bonificacao"]

const INVESTMENT_TERMS = [
  "invest*",
  // "aplic*" pegaria "aplicativo"; "aplic" sozinho cobre abreviações como "APLIC.POUPANCA"
  "aplicacao*",
  "aplicacoes",
  "aplicado",
  "aplic",
  "resg*",
  "tesouro",
  "cdb",
  "lci",
  "lca",
  "rdb",
  "debenture*",
  "fii",
  "fiis",
  "etf",
  "acoes",
  "b3",
  "corretora",
  "cripto*",
  "bitcoin",
  "btc",
  "ethereum",
  "caixinha*",
  "dinheiro guardado",
  "dinheiro resgatado",
  "poupanca",
  "renda fixa",
  "renda variavel",
  "nu invest",
  "nuinvest",
  "rende facil",
  "previdencia privada",
]

const OUT_TERMS = [
  "enviad*",
  "pagamento*",
  "pagto",
  "pgto",
  "pag",
  "compra*",
  "debito*",
  "saque*",
  "tarifa*",
  "boleto*",
  "iof",
  "anuidade",
  "aplicacao*",
  "aplic",
  "transferencia enviada",
]

const IN_TERMS = [
  "recebid*",
  "deposito*",
  "salario*",
  "estorno*",
  "reembolso*",
  "devolucao",
  "resg*",
  "rendimento*",
  "provento*",
  "credito em conta",
]

/** Direção pelas palavras da descrição, para extratos que não marcam sinal. */
export function directionFromText(description: string): Direction | null {
  const text = normalizeText(description)
  const out = countTerms(text, OUT_TERMS)
  const inn = countTerms(text, IN_TERMS)
  if (out === inn) return null
  return out > inn ? "out" : "in"
}

export function classifyTransaction(
  tx: { name: string; memo?: string; amount: number; hint?: "card-payment" | "card-credit" | "own-transfer" },
  options: ClassifyOptions = DEFAULT_CLASSIFY_OPTIONS
): Classification {
  const text = normalizeText(`${tx.name} ${tx.memo ?? ""}`)
  const direction: Direction = tx.amount >= 0 ? "in" : "out"
  const byDirection: TxKind = direction === "in" ? "income" : "expense"

  // Dentro da fatura do cartão o pagamento só abate o saldo: nunca é receita.
  if (tx.hint === "card-credit") return { kind: byDirection, skipReason: "Pagamento da fatura — dentro do cartão ele só abate o saldo" }
  if (tx.hint === "card-payment" || hasTerm(text, CARD_BILL_TERMS)) {
    return options.cardBill === "skip" ? { kind: byDirection, skipReason: "Pagamento de fatura — as compras já contam pelo cartão" } : { kind: byDirection }
  }
  if (tx.hint === "own-transfer" || hasTerm(text, OWN_TRANSFER_TERMS)) {
    return options.ownTransfers === "skip" ? { kind: byDirection, skipReason: "Transferência entre suas contas" } : { kind: byDirection }
  }
  if (hasTerm(text, TAX_TERMS)) return { kind: "expense" }
  if (hasTerm(text, YIELD_TERMS) && !hasTerm(text, ["resg*", "aplicacao*", "aplic"])) return { kind: byDirection }
  if (hasTerm(text, INVESTMENT_TERMS)) return { kind: "investment" }
  return { kind: byDirection }
}

/**
 * Valor gravado em reserves_investments a partir do valor do extrato (visão da conta):
 * saiu da conta (−) → aplicação positiva; entrou (+) → resgate negativo.
 */
export function investmentValueFromStatement(amount: number): number {
  return -amount
}

// ===== Sugestão de categoria =====

// Ordem importa: a primeira regra que casar vence (regras específicas antes das genéricas).
const CATEGORY_RULES: { kind: TxKind; terms: string[]; names: string[] }[] = [
  { kind: "income", terms: ["salario*", "prolabore", "pro labore", "contracheque", "holerite", "folha de pagamento"], names: ["Salário", "Salario"] },
  { kind: "income", terms: ["freela*", "servico*", "honorario*"], names: ["Freelance"] },
  { kind: "expense", terms: ["fatura do cartao", "fatura cartao", "pagamento de fatura"], names: ["Cartão de crédito", "Cartão de Crédito", "Cartão"] },
  { kind: "expense", terms: ["irrf", "iof", "imposto*", "darf", "ipva", "estado de minas gerais"], names: ["Impostos", "Taxas", "Impostos e taxas"] },
  { kind: "expense", terms: ["mercado livre", "mercadolivre", "amazon", "shopee", "shpp", "aliexpress", "magazine luiza", "magalu", "pernambucanas"], names: ["Compras"] },
  {
    kind: "expense",
    terms: [
      "supermercado*",
      "mercado",
      "mercearia",
      "atacad*",
      "assai",
      "padaria",
      "restaurante*",
      "lanchonete",
      "lanches",
      "sorvet*",
      "gelat*",
      "pizzaria",
      "sushi",
      "burger*",
      "churros",
      "acai*",
      "pastelaria",
      "cantina",
      "caldo*",
      "botequim",
      "cervejaria",
      "adega",
      "ifood",
      "rappi",
      "alimentacao",
      "acougue",
      "hortifruti",
    ],
    names: ["Alimentação", "Alimentacao"],
  },
  { kind: "expense", terms: ["uber*", "99app", "99 app", "99pop", "99 pop", "99 taxi", "99 tecnologia", "transportadora", "gasolina", "combustive*", "posto*", "estacionamento", "pedagio", "transporte", "metro", "onibus"], names: ["Transporte"] },
  { kind: "expense", terms: ["aluguel", "condominio", "energia", "luz", "agua", "saneamento", "internet", "gas", "iptu"], names: ["Moradia"] },
  { kind: "expense", terms: ["farmacia", "drogaria", "drogasil", "raia", "medic*", "hospital", "clinica", "laboratorio", "saude", "plano de saude", "odonto*"], names: ["Saúde", "Saude"] },
  { kind: "expense", terms: ["curso*", "faculdade", "escola", "universidade", "educacao", "mensalidade escolar", "livraria", "fies", "papelaria"], names: ["Educação", "Educacao"] },
  { kind: "expense", terms: ["cinema", "cine", "netflix", "spotify", "streaming", "disney", "prime video", "hbo", "hbo max", "youtube premium", "lazer", "show", "ingresso*", "tickets", "easytick"], names: ["Lazer"] },
  { kind: "expense", terms: ["shopping", "loja*", "compra*"], names: ["Compras"] },
]

export function suggestCategoryId(
  tx: { name: string; memo?: string },
  kind: TxKind,
  categories: { id: string; name: string; type: string }[]
): string | null {
  const text = normalizeText(`${tx.name} ${tx.memo ?? ""}`)
  for (const rule of CATEGORY_RULES) {
    if (rule.kind !== kind || !hasTerm(text, rule.terms)) continue
    for (const name of rule.names) {
      const match = categories.find((c) => c.type === kind && normalizeText(c.name) === normalizeText(name))
      if (match) return match.id
    }
  }
  return null
}

export function resolvePaymentMethod(tx: { name: string; memo?: string }): "pix" | "debit" {
  return hasTerm(normalizeText(`${tx.name} ${tx.memo ?? ""}`), ["pix"]) ? "pix" : "debit"
}
