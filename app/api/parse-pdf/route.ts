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

// O app (celular e a versão web dele, em outro endereço) chama esta rota com o token
// da sessão no cabeçalho Authorization; o site chama com o cookie de login. Sem cookie
// na conta do CORS, liberar qualquer origem não abre nada: sem token válido, não passa.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS })

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

async function currentUser(req: Request) {
  const supabase = await createClient()
  const header = req.headers.get("authorization") ?? ""
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : ""
  const { data } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser()
  return data.user
}

export async function POST(req: Request) {
  // Só quem está logado usa o servidor para ler PDF.
  if (!(await currentUser(req))) {
    return json({ error: "Nao autorizado" }, 401)
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) {
    return json({ error: "O PDF passa de 10 MB" }, 413)
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return json({ error: "Nenhum arquivo enviado" }, 400)
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "O PDF passa de 10 MB" }, 413)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!buffer.subarray(0, 1024).includes("%PDF-")) {
      return json({ error: "O arquivo nao e um PDF" }, 400)
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

    return json({ text })
  } catch (error: any) {
    console.error("Erro ao analisar o PDF via child process:", error)
    return json({ error: "Erro ao converter o PDF em texto." }, 500)
  }
}
