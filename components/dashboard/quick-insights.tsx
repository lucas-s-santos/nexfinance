"use client"

import { useMemo } from "react"
import { Sparkles, Trophy, Lightbulb, TrendingDown, Clock } from "lucide-react"
import { useFinancialAlerts, AlertLevel } from "@/hooks/use-financial-alerts"
import { motion } from "framer-motion"

interface QuickInsightsProps {
  expenses: any[]
  budgets: any[]
  bills: any[]
  goals: any[]
  reserves: any[]
  categories: any[]
}

const levelIcons: Record<AlertLevel, any> = {
  critical: Clock, // Substituindo AlertTriangle brutal por um Relógio
  warning: TrendingDown, 
  info: Lightbulb,
}

const levelStyles: Record<AlertLevel, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  info: "bg-primary/10 text-primary border-primary/20",
}

export function QuickInsights({
  expenses,
  budgets,
  bills,
  goals,
  reserves,
  categories,
}: QuickInsightsProps) {
  const alerts = useFinancialAlerts({
    expenses,
    budgets,
    bills,
    goals,
    reserves,
    categories,
  })

  // We filter out only the most crucial or interesting alerts to act as "Insights"
  const insights = useMemo(() => {
    return alerts.slice(0, 3) // show max 3 insights to keep it clean
  }, [alerts])

  if (insights.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel border-white/5 rounded-2xl p-4 bg-card/20 flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
          <p className="text-xs text-muted-foreground">Suas finanças estão rodando perfeitamente hoje.</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground tracking-wide">INSIGHTS RÁPIDOS</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((insight, idx) => {
          const Icon = levelIcons[insight.level]
          
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={insight.id}
              className={`glass-panel border rounded-2xl p-4 flex gap-4 ${levelStyles[insight.level]}`}
            >
              <div className="mt-0.5 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold leading-none">
                  {insight.title}
                </p>
                <p className="text-xs opacity-80 leading-snug">
                  {insight.description}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
