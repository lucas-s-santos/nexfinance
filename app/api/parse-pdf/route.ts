import { NextResponse } from "next/server"
import { execFileSync } from "child_process"
import { randomUUID } from "crypto"
import path from "path"
import os from "os"
import fs from "fs"
import { createClient } from "@/lib/supabase/server"

// Extrato em PDF tem poucas páginas: o limite de tamanho e o tempo máximo impedem
// que alguém trave o servidor com um arquivo enorme ou feito para demorar.
const MAX_BYTES = 10 * 1024 * 1024
const MAX_SECONDS = 30

export async function POST(req: Request) {
  // Só quem está logado usa o servidor para ler PDF.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "O PDF passa de 10 MB" }, { status: 413 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "O PDF passa de 10 MB" }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!buffer.subarray(0, 1024).includes("%PDF-")) {
      return NextResponse.json({ error: "O arquivo nao e um PDF" }, { status: 400 })
    }

    // Salva o buffer em um arquivo temporário (nome aleatório: envios ao mesmo tempo não se misturam)
    const tmpPath = path.join(os.tmpdir(), `pdf-upload-${randomUUID()}.pdf`)
    fs.writeFileSync(tmpPath, buffer)

    // Chama o script Node puro
    const scriptPath = path.join(process.cwd(), "scripts", "pdf-worker.js")

    let text = ""
    try {
       text = execFileSync("node", [scriptPath, tmpPath], { encoding: "utf-8", maxBuffer: 1024 * 1024 * 10, timeout: MAX_SECONDS * 1000 })
    } finally {
       if (fs.existsSync(tmpPath)) {
         fs.unlinkSync(tmpPath)
       }
    }

    return NextResponse.json({ text })
  } catch (error: any) {
    console.error("Erro ao analisar o PDF via child process:", error)
    return NextResponse.json({ error: "Erro ao converter o PDF em texto." }, { status: 500 })
  }
}
