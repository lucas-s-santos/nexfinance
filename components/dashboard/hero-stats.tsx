"use client"

import { formatCurrency, MONTHS } from "@/lib/format"
import { useAccountBalance } from "@/lib/use-account-balance"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Banknote,
  PiggyBank,
  Target,
  Zap,
  AlertCircle,
  Calendar,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

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
  accountName?: string
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
  accountName = "nubank",
}: HeroStatsProps) {
  const { balance: bankBalance } = useAccountBalance(accountName)
  
  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  // Usar saldo do banco se disponível, senão usar o saldo calculado
  const displayBalance = bankBalance?.current_balance ?? remaining
  const hasSyncIssue = Math.abs(displayBalance - remaining) > 0.01

  const expensePercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  const savingsPercentage = totalIncome > 0 ? (displayBalance / totalIncome) * 100 : 0
  const savingsGoalPercentage = Math.max(0, Math.min(savingsPercentage, 100))

  const isPositive = displayBalance >= 0
  const healthColor = expensePercentage <= 50 ? "text-success" : expensePercentage <= 75 ? "text-warning" : "text-destructive"
  const healthBg = expensePercentage <= 50 ? "bg-success/10" : expensePercentage <= 75 ? "bg-warning/10" : "bg-destructive/10"

  return (
    <div className="space-y-6">
      {/* Header com período */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            NexFinance
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            {MONTHS[month - 1]} de {year}
          </p>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-purple-500/30 to-pink-500/30 rounded-2xl blur-xl opacity-50" />
        <Card className="relative glass-panel border-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/80 overflow-hidden">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Balance */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className={cn("h-5 w-5", isPositive ? "text-success" : "text-destructive")} />
                  <p className="text-sm text-muted-foreground">Saldo Restante</p>
                  {bankBalance && (
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      hasSyncIssue ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                    )}>
                      {hasSyncIssue ? "Desincronizado" : "Sincronizado"}
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-4xl font-bold",
                  isPositive ? "text-success" : "text-destructive"
                )}>
                  {renderValue(displayBalance)}
                </p>
                {hasSyncIssue && (
                  <Alert variant="destructive" className="p-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Saldo do sistema e do Nubank diferem em {renderValue(Math.abs(displayBalance - remaining))}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Situação financeira</span>
                    <span className={healthColor}>{expensePercentage.toFixed(1)}% gasto</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        expensePercentage <= 50 ? "bg-success" : expensePercentage <= 75 ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${Math.min(expensePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Income vs Expenses */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <p className="text-xs text-muted-foreground">Receitas</p>
                    </div>
                    <p className="text-xl font-bold text-success">
                      {renderValue(totalIncome)}
                    </p>
                  </div>
                  <div className="space-y-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <p className="text-xs text-muted-foreground">Despesas</p>
                    </div>
                    <p className="text-xl font-bold text-destructive">
                      {renderValue(totalExpenses)}
                    </p>
                  </div>
                </div>

                {/* Donut Chart Percentages */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Distribuição orçamentária</span>
                    <span className="text-muted-foreground">{(100 - savingsPercentage).toFixed(1)}% gasto</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-8 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-destructive to-orange-500 flex items-center justify-center text-xs font-semibold text-white"
                        style={{ width: "100%" }}
                      >
                        {expensePercentage > 10 && `${expensePercentage.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="space-y-3">
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Disponível</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {savingsPercentage > 0 ? `${savingsPercentage.toFixed(1)}%` : "0%"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Saúde Financeira</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {expensePercentage <= 50 ? "Excelente" : expensePercentage <= 75 ? "Bom" : "Crítico"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          <Card className="glass-panel border-0 relative cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Cartão Crédito</p>
                  <p className="text-xl font-bold text-primary">
                    {renderValue(creditUsage)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          <Card className="glass-panel border-0 relative cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Cartão Débito</p>
                  <p className="text-xl font-bold text-emerald-500">
                    {renderValue(debitUsage)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Banknote className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          <Card className="glass-panel border-0 relative cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Investimentos</p>
                  <p className="text-xl font-bold text-amber-500">
                    {renderValue(investmentUsage)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <PiggyBank className="h-4 w-4 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-pink-500/5 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          <Card className="glass-panel border-0 relative cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Economia Este Mês</p>
                  <p className="text-xl font-bold text-pink-500">
                    {savingsPercentage.toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-pink-500/10">
                  <Target className="h-4 w-4 text-pink-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
