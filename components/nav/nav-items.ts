// Destinos do menu — os mesmos do app (nexfinance-mobile/src/components/nav/StaggeredMenu.tsx):
// cinco principais e dois grupos. A barra lateral (computador) e o menu em camadas (celular) usam esta lista.
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CalendarDays,
  History,
  Home,
  Landmark,
  Receipt,
  Repeat,
  Tags,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export type NavEntry = { label: string; href: string; icon: LucideIcon }

export const PRIMARY_NAV: NavEntry[] = [
  { label: "Início", href: "/dashboard", icon: Home },
  { label: "Despesas", href: "/dashboard/expenses", icon: TrendingDown },
  { label: "Receitas", href: "/dashboard/incomes", icon: TrendingUp },
  { label: "Investimentos", href: "/dashboard/reserves", icon: Landmark },
  { label: "Relatórios", href: "/dashboard/reports", icon: BarChart3 },
]

export const NAV_GROUPS: { title: string; entries: NavEntry[] }[] = [
  {
    title: "Planejamento",
    entries: [
      { label: "Contas a pagar", href: "/dashboard/bills", icon: Receipt },
      { label: "Contas fixas", href: "/dashboard/recurring", icon: Repeat },
      { label: "Metas", href: "/dashboard/goals", icon: Target },
      { label: "Orçamentos", href: "/dashboard/budgets", icon: Wallet },
      { label: "Agenda", href: "/dashboard/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Ferramentas",
    entries: [
      { label: "Movimentações", href: "/dashboard/transactions", icon: ArrowLeftRight },
      { label: "Categorias", href: "/dashboard/categories", icon: Tags },
      { label: "Importar extrato", href: "/dashboard/import", icon: Upload },
      { label: "Notificações", href: "/dashboard/notifications", icon: Bell },
      { label: "Auditoria", href: "/dashboard/audit", icon: History },
    ],
  },
]

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Abre o lançamento rápido (components/dashboard/quick-add.tsx escuta este evento). */
export function openQuickAdd() {
  window.dispatchEvent(new CustomEvent("open-quick-add"))
}
