export function parseMoneyToNumber(value: string): number {
  if (!value) return 0

  const cleaned = value
    .trim()
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "")

  if (!cleaned) return 0

  let normalized = cleaned

  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(/,/g, ".")
  } else {
    normalized = cleaned.replace(/,/g, "")
  }

  const parts = normalized.split(".")
  if (parts.length > 2) {
    normalized = `${parts.slice(0, -1).join("")}.${parts[parts.length - 1]}`
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function formatMoneyInput(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
