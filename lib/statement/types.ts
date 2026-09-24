// Mesmo código do app (nexfinance-mobile/src/lib/statement/types.ts). Mantenha os dois iguais.
// Tipos comuns aos leitores de extrato (PDF, CSV, OFX).

export type StatementTx = {
  id: string
  date: string
  /** Positivo = entrou na conta; negativo = saiu. */
  amount: number
  name: string
  /** Texto original do extrato (usado na classificação e para conferência). */
  memo?: string
  source: "ofx" | "csv" | "pdf"
  /** O extrato não deixou claro o valor ou se entrou/saiu — a revisão pede confirmação. */
  uncertain?: boolean
  /**
   * Marcação vinda do leitor:
   * - card-payment: pagamento da fatura saindo da conta;
   * - card-credit: o mesmo pagamento visto de dentro da fatura do cartão (só abate o saldo);
   * - own-transfer: transferência entre contas do próprio titular.
   */
  hint?: "card-payment" | "card-credit" | "own-transfer"
  /** Forma de pagamento quando o extrato informa (compra no débito, Pix). */
  paymentMethod?: "pix" | "debit"
  /** Observação mostrada na revisão (ex.: "Entre suas contas · Caixa"). */
  note?: string
}

/** Conferência com os totais que o próprio extrato informa. */
export type StatementCheck = {
  expectedIn: number
  expectedOut: number
  parsedIn: number
  parsedOut: number
  ok: boolean
}

export type PdfStatement = {
  bank?: "nubank"
  holderName?: string
  transactions: StatementTx[]
  check?: StatementCheck
  warnings: string[]
}
