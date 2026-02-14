export type OfxTransaction = {
  date: string
  amount: number
  name: string
  memo?: string
}

function parseOfxDate(raw: string): string {
  const clean = raw.trim().slice(0, 8)
  const year = clean.slice(0, 4)
  const month = clean.slice(4, 6)
  const day = clean.slice(6, 8)
  if (!year || !month || !day) return ""
  return `${year}-${month}-${day}`
}

function extractValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"))
  return match?.[1]?.trim() ?? ""
}

function parseOfxAmount(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, "")
  if (!cleaned) return Number.NaN
  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(/\./g, "").replace(/,/g, ".")
    return Number.parseFloat(normalized)
  }
  return Number.parseFloat(cleaned)
}

export function parseOfx(content: string): OfxTransaction[] {
  const blocks = content.split(/<STMTTRN>/i).slice(1)
  return blocks
    .map((block) => {
      const date = parseOfxDate(extractValue(block, "DTPOSTED"))
      const amount = parseOfxAmount(extractValue(block, "TRNAMT"))
      const name = extractValue(block, "NAME") || extractValue(block, "MEMO")
      const memo = extractValue(block, "MEMO")
      if (!date || Number.isNaN(amount) || !name) return null
      return { date, amount, name, memo }
    })
    .filter((t): t is OfxTransaction => Boolean(t))
}
