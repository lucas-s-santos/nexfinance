"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { usePeriod } from "@/lib/period-context"
import { MONTHS } from "@/lib/format"
import {
  LayoutDashboard,
  Tags,
  Target,
  TrendingUp,
  TrendingDown,
  Receipt,
  Landmark,
  Repeat,
  FileText,
  FileUp,
  Bell,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/categories", label: "Categorias", icon: Tags },
  { href: "/dashboard/budgets", label: "Orcamentos", icon: Target },
  { href: "/dashboard/incomes", label: "Receitas", icon: TrendingUp },
  { href: "/dashboard/expenses", label: "Despesas", icon: TrendingDown },
  { href: "/dashboard/bills", label: "Contas a Pagar", icon: Receipt },
  { href: "/dashboard/recurring", label: "Recorrentes", icon: Repeat },
  { href: "/dashboard/reserves", label: "Reservas", icon: Landmark },
  { href: "/dashboard/goals", label: "Metas", icon: Target },
  { href: "/dashboard/import", label: "Importacao", icon: FileUp },
  { href: "/dashboard/reports", label: "Relatorios", icon: FileText },
  { href: "/dashboard/notifications", label: "Notificacoes", icon: Bell },
  { href: "/dashboard/audit", label: "Auditoria", icon: History },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { month, year, setMonth, setYear } = usePeriod()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_10px_30px_rgba(0,0,0,0.35)] lg:hidden"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={() => {}}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-6">
          <img
            src="/logo01.jpg"
            alt="NexFinance"
            className="h-9 w-auto rounded-md"
          />
          <p className="text-base font-semibold text-sidebar-foreground">
            NexFinance
          </p>
        </div>

        {/* Period selector */}
        <div className="border-b border-sidebar-border px-4 py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
            Periodo
          </p>
          <div className="flex items-center gap-2">
            {isMounted ? (
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
              >
                <SelectTrigger className="h-8 flex-1 border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground text-xs">
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
              <div className="h-8 flex-1 rounded-md border border-sidebar-border bg-sidebar-accent" />
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setYear(year - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Previous year"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[3rem] text-center text-sm font-medium">
                {year}
              </span>
              <button
                type="button"
                onClick={() => setYear(year + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Next year"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary/20 text-sidebar-foreground ring-1 ring-sidebar-primary/50"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border px-3 py-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  )
}
