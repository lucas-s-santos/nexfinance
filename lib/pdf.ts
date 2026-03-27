export type PdfTransaction = {
  date: string
  amount: number
  name: string
  memo?: string
}

export function parsePdfTransactions(text: string): PdfTransaction[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  const transactions: PdfTransaction[] = []
  const currentYear = new Date().getFullYear()

  // RegExp para identificar linhas contendo dados no formato de extrato
  // Ex: "12/09/2023 Compra no Ifood R$ 45,90"
  // Ex: "12 SET Transferencia -1.000,00"
  const singleLineRegex = /^(\d{2}\/\d{2}(?:\/\d{4})?|\d{4}-\d{2}-\d{2}|\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*)\s+(.+?)\s+(?:R\$?\s*)?(-?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})/i

  // Para PDFs onde a data, descricao e valor vem em linhas espalhadas (Ex Nubank multi-linha)
  const dateRegex = /^(\d{2}\/\d{2}(?:\/\d{4})?|\d{4}-\d{2}-\d{2}|\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*)$/i
  const amountRegex = /^(?:R\$?\s*)?(-?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})$/i

  let pendingDate = ""
  let pendingName = ""

  const parseDateStr = (rawDate: string) => {
    if (rawDate.includes("-")) {
      return rawDate
    } else if (rawDate.includes("/")) {
      const parts = rawDate.split("/")
      const day = parts[0]
      const month = parts[1]
      const year = parts[2] || currentYear
      return `${year}-${month}-${day}`
    } else {
      const months: Record<string, string> = { jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06", jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12" }
      const parts = rawDate.split(/\s+/)
      const day = parts[0].padStart(2, '0')
      const monthStr = parts[1].toLowerCase().substring(0, 3)
      const month = months[monthStr] || "01"
      return `${currentYear}-${month}-${day}`
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 1) Tentar formato em uma unica linha (mais confiavel)
    const singleMatch = line.match(singleLineRegex)
    if (singleMatch) {
      const rawDate = singleMatch[1]
      const rawName = singleMatch[2]
      const rawAmount = singleMatch[3]

      const dateStr = parseDateStr(rawDate)
      const amount = parseFloat(rawAmount.replace(/\./g, "").replace(",", "."))

      transactions.push({
        date: dateStr,
        name: rawName.trim(),
        amount
      })
      
      // Reseta qualquer estado multi-linha
      pendingDate = ""
      pendingName = ""
      continue
    }

    // 2) Tentar ler formato multi-linha (comum no extrato do Nubank via pdf.js)
    if (dateRegex.test(line)) {
      pendingDate = parseDateStr(line)
      pendingName = ""
    } else if (pendingDate && amountRegex.test(line)) {
      const amountMatch = line.match(amountRegex)
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/\./g, "").replace(",", "."))
        transactions.push({
          date: pendingDate,
          name: pendingName.trim() || "Transação sem nome",
          amount
        })
        pendingDate = ""
        pendingName = ""
      }
    } else if (pendingDate) {
      pendingName += (pendingName ? " " : "") + line
    }
  }

  return transactions
}
