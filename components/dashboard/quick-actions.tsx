"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, TrendingUp, Bell } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  const actions = [
    {
      icon: Plus,
      label: "Adicionar Despesa",
      href: "/dashboard/expenses",
      color: "from-destructive/20 to-destructive/5",
      iconColor: "text-destructive",
    },
    {
      icon: TrendingUp,
      label: "Adicionar Receita",
      href: "/dashboard/incomes",
      color: "from-success/20 to-success/5",
      iconColor: "text-success",
    },
    {
      icon: FileText,
      label: "Ver Relatórios",
      href: "/dashboard/reports",
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
    },
    {
      icon: Bell,
      label: "Notificações",
      href: "/dashboard/notifications",
      color: "from-yellow-500/20 to-yellow-500/5",
      iconColor: "text-yellow-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => (
        <Link key={action.label} href={action.href}>
          <Card className="glass-panel border-0 h-full cursor-pointer group hover:shadow-lg transition-all hover:scale-105">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <div className={`p-4 rounded-xl bg-gradient-to-br ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className={`h-6 w-6 ${action.iconColor}`} />
              </div>
              <p className="text-sm font-medium text-center text-foreground group-hover:text-primary transition-colors">
                {action.label}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
