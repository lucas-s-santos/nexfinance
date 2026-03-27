import { NextResponse } from "next/server"
import { execFileSync } from "child_process"
import path from "path"
import os from "os"
import fs from "fs"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Salva o buffer em um arquivo temporário
    const tmpPath = path.join(os.tmpdir(), `pdf-upload-${Date.now()}.pdf`)
    fs.writeFileSync(tmpPath, buffer)

    // Chama o script Node puro
    const scriptPath = path.join(process.cwd(), "scripts", "pdf-worker.js")
    
    let text = ""
    try {
       text = execFileSync("node", [scriptPath, tmpPath], { encoding: "utf-8", maxBuffer: 1024 * 1024 * 10 })
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
