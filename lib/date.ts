export function isFutureDate(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return false
  const selected = new Date(year, month - 1, day)
  const today = new Date()
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return selected > normalizedToday
}
