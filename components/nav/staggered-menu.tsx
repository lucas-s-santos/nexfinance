"use client"

// Menu de tela cheia com entrada em camadas — o mesmo do app (nexfinance-mobile/src/components/nav/
// StaggeredMenu.tsx), aqui com transições CSS. Cada peça (camadas coloridas, painel, itens) ocupa uma
// janela de um progresso 0→1; fechar percorre o progresso de volta, então a sequência se inverte.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, LogOut, X } from "lucide-react"

import { Wordmark } from "@/components/brand/brand"
import { NAV_GROUPS, PRIMARY_NAV, isActivePath } from "@/components/nav/nav-items"
import { PeriodPicker } from "@/components/nav/period-picker"
import { useAccount } from "@/components/nav/use-account"
import { cn } from "@/lib/utils"

const OPEN_MS = 900
const CLOSE_MS = 480
const EASE_OUT = "cubic-bezier(0.33, 1, 0.68, 1)"
const EASE_IN = "cubic-bezier(0.32, 0, 0.67, 0)"

type Win = readonly [number, number]
const W = {
  backdrop: [0, 0.35] as Win,
  layerA: [0, 0.42] as Win,
  layerB: [0.07, 0.5] as Win,
  panel: [0.14, 0.58] as Win,
  period: [0.26, 0.64] as Win,
  groups: [0.55, 0.92] as Win,
  footer: [0.62, 1] as Win,
}
const itemWindow = (i: number): Win => [0.32 + i * 0.07, 0.7 + i * 0.07]

// Abrindo, a janela [início, fim] do progresso vira atraso e duração; fechando, o progresso volta de 1
// a 0, então quem entrou por último sai primeiro.
function timing([start, end]: Win, shown: boolean, reduce: boolean): CSSProperties {
  if (reduce) return { transitionDuration: shown ? "180ms" : "150ms", transitionDelay: "0ms" }
  const total = shown ? OPEN_MS : CLOSE_MS
  return {
    transitionDuration: `${Math.round((end - start) * total)}ms`,
    transitionDelay: `${Math.round((shown ? start : 1 - end) * total)}ms`,
    transitionTimingFunction: shown ? EASE_OUT : EASE_IN,
  }
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduce(query.matches)
    const onChange = () => setReduce(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return reduce
}

// Revela o conteúdo subindo de trás de uma máscara, com uma leve rotação (o "stagger").
function Reveal({ win, shown, reduce, children, distance = 44, tilt = 5 }: { win: Win; shown: boolean; reduce: boolean; children: ReactNode; distance?: number; tilt?: number }) {
  const hidden = reduce ? "none" : `translateY(${distance}px) rotate(${tilt}deg)`
  return (
    // shrink-0: numa coluna flex com rolagem, um bloco com overflow-hidden encolheria (cortando o
    // conteúdo) em vez de a coluna rolar.
    <div className="shrink-0 overflow-hidden">
      <div
        className="origin-bottom-left transition-[transform,opacity]"
        style={{ ...timing(win, shown, reduce), opacity: shown ? 1 : 0, transform: shown ? "none" : hidden }}
      >
        {children}
      </div>
    </div>
  )
}

export function StaggeredMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const reduce = usePrefersReducedMotion()
  const { name, email, unread, signOut } = useAccount()
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Monta, espera um quadro (para o navegador ver o estado inicial) e só então anima a entrada.
  // Fechando, desmonta ao fim da animação — se não tiver sido reaberto nesse meio-tempo.
  useEffect(() => {
    if (open) {
      setMounted(true)
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(frame)
    }
    setShown(false)
    const timer = window.setTimeout(() => setMounted(false), reduce ? 150 : CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [open, reduce])

  // Esc fecha; a página por trás não rola enquanto o menu está aberto; o foco vai para "Fechar".
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  // Trocou de página (link do menu, voltar do navegador): fecha.
  const lastPath = useRef(pathname)
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname
      onClose()
    }
  }, [pathname, onClose])

  if (!mounted) return null

  const slide = (win: Win): CSSProperties => ({
    ...timing(win, shown, reduce),
    transform: reduce ? "none" : shown ? "translateX(0)" : "translateX(calc(100% + 40px))",
    opacity: reduce ? (shown ? 1 : 0) : 1,
  })

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden lg:hidden">
      <button
        type="button"
        aria-label="Fechar menu"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(4,10,24,0.5)] transition-opacity"
        style={{ ...timing(W.backdrop, shown, reduce), opacity: shown ? 1 : 0 }}
      />
      <div className="absolute inset-y-0 right-0 w-full max-w-[440px] bg-[#0FA3A3] transition-[transform,opacity]" style={slide(W.layerA)} />
      <div className="absolute inset-y-0 right-0 w-full max-w-[440px] bg-[#1D4FC4] transition-[transform,opacity]" style={slide(W.layerB)} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-card transition-[transform,opacity]"
        style={slide(W.panel)}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-3">
          <Wordmark size={28} />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 items-center gap-2 rounded-full border border-border px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Fechar
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-5 pb-8 pt-3">
          <nav aria-label="Principal" className="flex flex-col gap-1">
            {PRIMARY_NAV.map((entry, i) => {
              const active = isActivePath(pathname, entry.href)
              return (
                <Reveal key={entry.href} win={itemWindow(i)} shown={shown} reduce={reduce}>
                  <Link
                    href={entry.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-3 py-1 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span className="w-7 font-display text-xs font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <span className={cn("font-display text-[32px] font-bold leading-[42px] tracking-[-0.02em]", active ? "text-primary" : "text-foreground")}>
                      {entry.label}
                    </span>
                    {active ? <span className="ml-1 h-2 w-2 rounded-full bg-primary" /> : null}
                  </Link>
                </Reveal>
              )
            })}
          </nav>

          <Reveal win={W.period} shown={shown} reduce={reduce} distance={18} tilt={0}>
            <PeriodPicker />
          </Reveal>

          <Reveal win={W.groups} shown={shown} reduce={reduce} distance={18} tilt={0}>
            <div className="flex flex-col gap-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{group.title}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {group.entries.map((entry) => {
                      const active = isActivePath(pathname, entry.href)
                      const badge = entry.href === "/dashboard/notifications" ? unread : 0
                      return (
                        <Link
                          key={entry.href}
                          href={entry.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-2xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                            active ? "bg-primary/10 text-primary" : "bg-secondary text-foreground hover:bg-border"
                          )}
                        >
                          <entry.icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                          <span className="flex-1 truncate">{entry.label}</span>
                          {badge > 0 ? (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
                              {badge}
                            </span>
                          ) : null}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal win={W.footer} shown={shown} reduce={reduce} distance={14} tilt={0}>
            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <Link href="/dashboard/profile" onClick={onClose} className="flex items-center gap-3 transition-opacity hover:opacity-80">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-display text-base font-semibold text-primary-foreground">
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-foreground">{name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{email}</span>
                </span>
                <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  signOut()
                }}
                className="flex items-center gap-2 self-start py-1 text-sm font-semibold text-destructive transition-opacity hover:opacity-70"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
