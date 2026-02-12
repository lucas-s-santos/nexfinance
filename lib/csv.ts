export type CsvData = {
  headers: string[]
  rows: string[][]
}

function detectDelimiter(line: string): string {
  const comma = (line.match(/,/g) ?? []).length
  const semicolon = (line.match(/;/g) ?? []).length
  return semicolon > comma ? ";" : ","
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

export function parseCsv(content: string): CsvData {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map((h) => h.trim())
  const rows = lines.slice(1).map((line) => splitCsvLine(line, delimiter))

  return { headers, rows }
}
