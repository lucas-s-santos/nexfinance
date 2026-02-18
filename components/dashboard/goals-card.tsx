"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Goal {
  id: string
  name: string
  target_value: number | string
  current_value: number | string
  deadline: string | null
}

interface GoalsCardProps {
  goals: Goal[]
  showValues: boolean
}

export function GoalsCard({ goals, showValues }: GoalsCardProps) {
  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  const sortedGoals = [...(goals || [])].sort((a, b) => {
    const progressA = (Number(a.current_value) / Number(a.target_value)) * 100
    const progressB = (Number(b.current_value) / Number(b.target_value)) * 100
    return progressB - progressA
  })

  const activeGoals = sortedGoals.filter(g => Number(g.current_value) < Number(g.target_value))
  const completedGoals = sortedGoals.filter(g => Number(g.current_value) >= Number(g.target_value))

  return (
    <Card className="glass-panel border-0 col-span-full lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-pink-500" />
            Minhas Metas
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {activeGoals.length} em progresso, {completedGoals.length} concluída{completedGoals.length !== 1 ? "s" : ""}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedGoals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma meta cadastrada</p>
          </div>
        ) : (
          <>
            {activeGoals.map((goal) => {
              const progress = (Number(goal.current_value) / Number(goal.target_value)) * 100
              const daysLeft = goal.deadline
                ? Math.ceil(
                    (new Date(goal.deadline).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null

              return (
                <div
                  key={goal.id}
                  className="space-y-3 p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{goal.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {renderValue(Number(goal.current_value))} de {renderValue(Number(goal.target_value))}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-pink-500">{progress.toFixed(0)}%</span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>

                  {daysLeft !== null && (
                    <div className="flex items-center gap-2 text-xs">
                      <AlertCircle className={cn(
                        "h-3 w-3",
                        daysLeft <= 7 ? "text-destructive" : daysLeft <= 30 ? "text-warning" : "text-muted-foreground"
                      )} />
                      <span className={daysLeft <= 7 ? "text-destructive" : "text-muted-foreground"}>
                        {daysLeft > 0 ? `${daysLeft} dias restantes` : "Prazo vencido"}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}

            {completedGoals.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Objetivos Concluídos</p>
                {completedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">{renderValue(Number(goal.target_value))}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-success">100%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
