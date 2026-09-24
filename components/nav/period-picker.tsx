"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePeriod } from "@/lib/period-context"
import { MONTHS } from "@/lib/format"

/** Mês e ano que as telas mostram (vale para o site inteiro). */
export function PeriodPicker() {
  const { month, year, setMonth, setYear } = usePeriod()
  // O Select do Radix só depois de montar: o mês salvo vem do navegador e mudaria na hidratação.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Período</span>
      <div className="flex items-center gap-2">
        {mounted ? (
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="h-10 flex-1 text-sm" aria-label="Mês">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="h-10 flex-1 rounded-xl border border-input bg-card" />
        )}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setYear(year - 1)}
            className="flex h-10 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[2.75rem] text-center font-display text-sm font-semibold tabular-nums">{year}</span>
          <button
            type="button"
            onClick={() => setYear(year + 1)}
            className="flex h-10 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Próximo ano"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
