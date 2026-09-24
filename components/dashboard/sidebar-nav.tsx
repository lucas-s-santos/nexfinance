"use client"

// Navegação do site, igual ao app: no computador, barra lateral fixa; no celular, barra no topo com o
// botão "Menu" (menu em camadas) e o "+" flutuante de lançamento rápido.
import { useCallback, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, LogOut, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Wordmark } from "@/components/brand/brand"
import { NAV_GROUPS, PRIMARY_NAV, isActivePath, openQuickAdd, type NavEntry } from "@/components/nav/nav-items"
import { PeriodPicker } from "@/components/nav/period-picker"
import { StaggeredMenu } from "@/components/nav/staggered-menu"
import { useAccount } from "@/components/nav/use-account"
import { cn } from "@/lib/utils"

function SidebarLink({ entry, active, badge = 0 }: { entry: NavEntry; active: boolean; badge?: number }) {
  return (
    <Link
      href={entry.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        active ? "bg-primary/10 font-semibold text-primary" : "font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <entry.icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate">{entry.label}</span>
      {badge > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}

// Ícone do menu: duas barras de larguras diferentes (mais leve que o "hambúrguer" de três), como no app.
function MenuGlyph() {
  return (
    <span className="flex flex-col items-end gap-[5px]" aria-hidden>
      <span className="h-0.5 w-[18px] rounded-full bg-foreground" />
      <span className="h-0.5 w-[11px] rounded-full bg-foreground" />
    </span>
  )
}

export function SidebarNav() {
  const pathname = usePathname()
  const { name, email, unread, signOut } = useAccount()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <>
      {/* Computador: barra lateral fixa */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Link href="/dashboard" aria-label="NexFinance — Início">
            <Wordmark size={30} />
          </Link>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <PeriodPicker />
          <Button onClick={openQuickAdd} className="w-full">
            <Plus />
            Novo lançamento
          </Button>
        </div>

        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="flex flex-col gap-0.5">
            {PRIMARY_NAV.map((entry) => (
              <li key={entry.href}>
                <SidebarLink entry={entry} active={isActivePath(pathname, entry.href)} />
              </li>
            ))}
          </ul>
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{group.title}</p>
              <ul className="flex flex-col gap-0.5">
                {group.entries.map((entry) => (
                  <li key={entry.href}>
                    <SidebarLink
                      entry={entry}
                      active={isActivePath(pathname, entry.href)}
                      badge={entry.href === "/dashboard/notifications" ? unread : 0}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            href="/dashboard/profile"
            aria-current={isActivePath(pathname, "/dashboard/profile") ? "page" : undefined}
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
              {name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">{email}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Celular: barra no topo */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link href="/dashboard" aria-label="NexFinance — Início">
          <Wordmark size={28} />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          className="flex h-10 items-center gap-2.5 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Menu
          <MenuGlyph />
          {unread > 0 ? <span className="h-2 w-2 rounded-full bg-destructive" aria-label={`${unread} avisos não lidos`} /> : null}
        </button>
      </header>

      {/* Celular: "+" flutuante — lançar um gasto é a ação mais frequente, então fica no alcance do polegar. */}
      <button
        type="button"
        onClick={openQuickAdd}
        aria-label="Novo lançamento"
        className="fixed right-5 z-40 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-brand-gradient text-white shadow-[0_10px_24px_rgba(29,79,196,0.4)] transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 lg:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
      >
        <Plus className="h-7 w-7" strokeWidth={2.4} />
      </button>

      <StaggeredMenu open={menuOpen} onClose={closeMenu} />
    </>
  )
}
