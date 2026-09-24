"use client"

// Lista as importações já feitas, com "Desfazer" (apaga exatamente o que cada uma gravou).
// Mesmo comportamento do app (nexfinance-mobile/src/components/import/ImportHistory.tsx).
import { useCallback, useEffect, useState } from "react"
import { FileText } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { listImportBatches, undoImportBatch, type ImportBatch } from "@/lib/import-engine"

function formatImportedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)
}

interface ImportHistoryProps {
  /** Chamado depois de desfazer, para as telas recarregarem os dados. */
  onChanged?: () => void
}

export function ImportHistory({ onChanged }: ImportHistoryProps) {
  const [batches, setBatches] = useState<ImportBatch[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null) // id do lote ou "all"
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setBatches(await listImportBatches())
      setError(null)
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível carregar o histórico.")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function undo(targets: ImportBatch[]) {
    setBusy(true)
    try {
      let removed = 0
      for (const batch of targets) removed += await undoImportBatch(batch)
      toast.success(`${removed} ${removed === 1 ? "movimentação removida" : "movimentações removidas"}`)
      onChanged?.()
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível desfazer. Tente de novo.")
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  if (error) return <p className="text-center text-xs text-muted-foreground">{error}</p>
  if (!batches || batches.length === 0) return null

  const total = batches.reduce((sum, b) => sum + (b.success_count ?? 0), 0)

  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <div className="flex items-center justify-between gap-3 pb-1">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground">Importações anteriores</h2>
            <p className="text-xs text-muted-foreground">Desfazer apaga exatamente o que aquela importação gravou.</p>
          </div>
          {batches.length > 1 && confirming !== "all" ? (
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirming("all")}>
              Desfazer todas
            </Button>
          ) : null}
        </div>

        {confirming === "all" ? (
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm text-foreground">
              Apagar tudo o que veio das {batches.length} importações ({total} movimentações)? Lançamentos feitos à mão continuam.
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
                Cancelar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => undo(batches)} disabled={busy}>
                {busy ? "Desfazendo…" : "Desfazer todas"}
              </Button>
            </div>
          </div>
        ) : null}

        {batches.map((batch) => (
          <div key={batch.id} className="flex flex-col gap-2 border-t border-border py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{batch.file_name ?? "Arquivo sem nome"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatImportedAt(batch.imported_at)} · {batch.success_count} {batch.success_count === 1 ? "movimentação" : "movimentações"}
                </p>
              </div>
              {confirming === batch.id ? null : (
                <Button size="sm" variant="outline" onClick={() => setConfirming(batch.id)} disabled={busy}>
                  Desfazer
                </Button>
              )}
            </div>
            {confirming === batch.id ? (
              <div className="flex items-center justify-end gap-2">
                <p className="flex-1 text-xs text-muted-foreground">Apagar as {batch.success_count} movimentações deste arquivo?</p>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
                  Cancelar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => undo([batch])} disabled={busy}>
                  {busy ? "Desfazendo…" : "Desfazer"}
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
