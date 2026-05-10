"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Plus, FileText, TrendingUp, Bell } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export function QuickActions() {
  const actions = [
    {
      icon: Plus,
      label: "Nova Despesa",
      href: "/dashboard/expenses",
      color: "from-destructive/20 to-destructive/5",
      iconColor: "text-destructive",
    },
    {
      icon: TrendingUp,
      label: "Nova Receita",
      href: "/dashboard/incomes",
      color: "from-success/20 to-success/5",
      iconColor: "text-success",
    },
    {
      icon: FileText,
      label: "Relatórios",
      href: "/dashboard/reports",
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
    },
    {
      icon: Bell,
      label: "Avisos",
      href: "/dashboard/notifications",
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-500",
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
    >
      {actions.map((action) => (
        <motion.div key={action.label} variants={item}>
          <Link href={action.href} className="block h-full outline-none group relative">
            {/* Animated hover gradient border */}
            <div className={`absolute -inset-0.5 bg-gradient-to-br ${action.color} rounded-2xl opacity-0 group-hover:opacity-50 blur transition duration-500`} />
            
            <Card className="glass-panel border-white/5 h-full relative cursor-pointer hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 bg-card/40 backdrop-blur-xl rounded-2xl overflow-hidden z-10">
              <div className={`absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl ${action.color} opacity-20 rounded-bl-[100px] transition-transform duration-500 group-hover:scale-150`} />
              
              <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center h-full gap-3 relative z-20">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform duration-300 shadow-lg ring-1 ring-white/10`}>
                  <action.icon className={`h-6 w-6 ${action.iconColor} drop-shadow-sm`} />
                </div>
                <p className="text-xs sm:text-sm font-bold text-center text-foreground/80 group-hover:text-foreground transition-colors tracking-wide">
                  {action.label}
                </p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
