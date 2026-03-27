"use client"

import { formatCurrency, MONTHS } from "@/lib/format"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Banknote,
  PiggyBank,
  Target,
  Calendar,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface HeroStatsProps {
  totalIncome: number
  totalExpenses: number
  remaining: number
  showValues: boolean
  month: number
  year: number
  creditUsage: number
  debitUsage: number
  investmentUsage: number
  reservedTotal: number
  healthScore?: number
}

export function HeroStats({
  totalIncome,
  totalExpenses,
  remaining,
  showValues,
  month,
  year,
  creditUsage,
  debitUsage,
  investmentUsage,
  reservedTotal,
  healthScore = 50,
}: HeroStatsProps) {
  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  const displayBalance = remaining

  const expensePercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  const savingsPercentage = totalIncome > 0 ? (displayBalance / totalIncome) * 100 : 0
  const isPositive = displayBalance >= 0
  const expenseColor = expensePercentage <= 50 ? "text-success" : expensePercentage <= 75 ? "text-warning" : "text-destructive"
  const scoreColor = healthScore >= 80 ? "text-success" : healthScore >= 50 ? "text-blue-500" : "text-destructive"
  const scoreLabel = healthScore >= 80 ? "Excelente" : healthScore >= 50 ? "Bom" : "Atenção"

  return (
    <div className="space-y-6">
      {/* Header com período */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-4 sm:mb-8"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-blue-500 to-teal-400 bg-clip-text text-transparent">
            Resumo Geral
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm sm:text-base">
            <Calendar className="h-4 w-4" />
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
      </motion.div>

      {/* Main Hero Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-blue-500/20 to-teal-400/20 rounded-[2rem] blur-2xl opacity-50 dark:opacity-40" />
        <Card className="relative glass-panel border border-border/50 bg-gradient-to-br from-background/90 via-background/60 to-muted/40 overflow-hidden shadow-xl rounded-[2rem]">
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center lg:items-start">
              {/* Saldo Principal */}
              <div className="flex flex-col items-center lg:items-start space-y-3 lg:pr-6 lg:border-r border-border/50 pb-4 lg:pb-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Saldo Atual</p>
                <div className="relative">
                  <div className={cn("absolute inset-0 blur-2xl rounded-full scale-150 opacity-50", isPositive ? "bg-success/20" : "bg-destructive/20")} />
                  <p className={cn(
                    "relative text-5xl sm:text-6xl font-black tracking-tighter drop-shadow-sm",
                    isPositive ? "text-success" : "text-destructive"
                  )}>
                    {renderValue(displayBalance)}
                  </p>
                </div>
                {reservedTotal > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center lg:text-left">
                    Inclui <span className="font-semibold">{renderValue(reservedTotal)}</span> em cofres.
                  </p>
                )}
                
                <div className="w-full max-w-sm space-y-2 pt-4">
                  <div className="flex justify-between text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Comprometimento</span>
                    <span className={expenseColor}>{expensePercentage.toFixed(1)}% utilizado</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(expensePercentage, 100)}%` }}
                      transition={{ duration: 1, delay: 0.5, type: "spring" }}
                      className={cn(
                        "h-full rounded-full transition-colors",
                        expensePercentage <= 50 ? "bg-success" : expensePercentage <= 75 ? "bg-warning" : "bg-destructive"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Entradas x Saídas */}
              <div className="space-y-4 w-full">
                <div className="flex w-full gap-3 sm:gap-4">
                  <div className="flex-1 flex flex-col items-center lg:items-start justify-center space-y-1 p-4 sm:p-5 rounded-[2rem] bg-success/5 border border-success/10 hover:bg-success/10 transition-colors shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Receitas</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-success tracking-tight">
                      {renderValue(totalIncome)}
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col items-center lg:items-start justify-center space-y-1 p-4 sm:p-5 rounded-[2rem] bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-colors shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Despesas</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-destructive tracking-tight">
                      {renderValue(totalExpenses)}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs font-medium mb-2">
                    <span className="text-muted-foreground">Distribuição</span>
                    <span className="text-muted-foreground">{(100 - savingsPercentage).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(expensePercentage, 100)}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                      className="h-full bg-destructive"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(100 - expensePercentage, 0)}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                      className="h-full bg-success"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="space-y-3 sm:space-y-4 h-full flex flex-col justify-center">
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Poder de Poupança</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {savingsPercentage > 0 ? `${savingsPercentage.toFixed(1)}%` : "0%"}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full">
                    <PiggyBank className="h-5 w-5" />
                  </div>
                </div>
                <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Saúde Financeira</p>
                    <div className="flex items-center gap-2">
                       <p className={cn("text-xl sm:text-2xl font-bold", scoreColor)}>
                         {healthScore}/100
                       </p>
                       <span className="text-xs hidden sm:inline-block font-medium text-muted-foreground">({scoreLabel})</span>
                    </div>
                  </div>
                  <div className="p-3 bg-primary/10 text-primary rounded-full relative">
                    <Target className="h-5 w-5" />
                    {/* Pulsing effect if score is very high */}
                    {healthScore >= 90 && (
                      <span className="absolute top-0 right-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secondary Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
      >
        <div className="group relative">
          <Card className="glass-panel border-0 relative cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden">
            <div className="absolute right-0 top-0 w-16 h-16 bg-primary/5 rounded-bl-full transition-transform group-hover:scale-110" />
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-3 relative z-10">
                <div className="p-2 w-fit rounded-lg bg-primary/10">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Cartão Crédito</p>
                  <p className="text-lg font-bold text-foreground">
                    {renderValue(creditUsage)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <Card className="glass-panel border-0 relative cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden">
            <div className="absolute right-0 top-0 w-16 h-16 bg-success/5 rounded-bl-full transition-transform group-hover:scale-110" />
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-3 relative z-10">
                <div className="p-2 w-fit rounded-lg bg-success/10">
                  <Banknote className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Débito / Pix</p>
                  <p className="text-lg font-bold text-foreground">
                    {renderValue(debitUsage)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <Card className="glass-panel border-0 relative cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden">
            <div className="absolute right-0 top-0 w-16 h-16 bg-amber-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-3 relative z-10">
                <div className="p-2 w-fit rounded-lg bg-amber-500/10">
                  <Wallet className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Investimentos</p>
                  <p className="text-lg font-bold text-foreground">
                    {renderValue(investmentUsage)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <Card className="glass-panel border-0 relative cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden">
            <div className="absolute right-0 top-0 w-16 h-16 bg-teal-500/5 rounded-bl-full transition-transform group-hover:scale-110" />
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-3 relative z-10">
                <div className="p-2 w-fit rounded-lg bg-teal-500/10">
                  <Target className="h-4 w-4 text-teal-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Metas Atingidas</p>
                  <p className="text-lg font-bold text-foreground">
                    {savingsPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}
