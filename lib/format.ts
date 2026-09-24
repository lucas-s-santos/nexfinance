export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return date
  const localDate = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat("pt-BR").format(localDate)
}

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

export const PAYMENT_METHODS: Record<string, string> = {
  credit: "Cartão de crédito",
  debit: "Cartão de débito",
  voucher: "Vale-refeição",
  pix: "Pix",
  cash: "Dinheiro",
}

export const RESERVE_TYPES: Record<string, string> = {
  emergency: "Reserva de emergência",
  investment: "Investimento",
  market: "Carteira (FII/Cripto)",
  goal: "Meta",
}
