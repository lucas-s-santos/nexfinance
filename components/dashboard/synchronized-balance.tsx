"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccountBalance } from "@/lib/use-account-balance"
import { formatCurrency } from "@/lib/format"
import { AlertCircle, CheckCircle2, TrendingUp, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SynchronizedBalanceProps {
  accountName: string
  accountLabel?: string
  systemBalance: number
  showValues: boolean
}

export function SynchronizedBalance({
  accountName,
  accountLabel,
  systemBalance,
  showValues,
}: SynchronizedBalanceProps) {
  const { balance, updateBalance } = useAccountBalance(accountName)
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const renderValue = (value: number) =>
    showValues ? formatCurrency(value) : "R$ ••••"

  const bankBalance = balance?.current_balance ?? 0
  const difference = systemBalance - bankBalance
  const isDifferent = Math.abs(difference) > 0.01
  const isSystemAhead = difference > 0
  const displayLabel = accountLabel ?? (accountName === "nubank" ? "Nubank" : accountName.charAt(0).toUpperCase() + accountName.slice(1))

  const handleUpdateBalance = async () => {
    if (!inputValue || isNaN(Number(inputValue))) {
      setMessage({ type: "error", text: "Digite um valor válido" })
      return
    }

    setIsSaving(true)
    try {
      const newBalance = Number.parseFloat(inputValue)
      await updateBalance(newBalance)
      setMessage({ type: "success", text: "Saldo atualizado com sucesso!" })
      setInputValue("")
      setTimeout(() => {
        setIsOpen(false)
        setMessage(null)
      }, 2000)
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao atualizar saldo" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className={cn(
      "glass-panel border-0 relative overflow-hidden",
      isDifferent && isSystemAhead ? "border-l-4 border-warning" : "border-l-4 border-success"
    )}>
      <div className="absolute inset-0 bg-gradient-to-br opacity-5 pointer-events-none" />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Sincronização {displayLabel}
            </CardTitle>
            <CardDescription>
              Sistema vs Banco
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {!isDifferent ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs text-success font-semibold">Sincronizado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-xs text-warning font-semibold">Diferença</span>
              </div>
            )}
            
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Atualizar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atualizar Saldo do {displayLabel}</DialogTitle>
                  <DialogDescription>
                    Insira o saldo atual da sua conta no aplicativo do {displayLabel}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {message && (
                    <Alert variant={message.type === "success" ? "default" : "destructive"}>
                      <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label>Novo Saldo</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateBalance()
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleUpdateBalance}
                    disabled={isSaving || !inputValue}
                    className="w-full"
                  >
                    {isSaving ? "Atualizando..." : "Atualizar Saldo"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Saldo do Sistema */}
        <div className="space-y-2 p-4 rounded-lg bg-slate-800/50">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Saldo do Sistema (calculado)
          </p>
          <p className="text-2xl font-bold text-primary">
            {renderValue(systemBalance)}
          </p>
          <p className="text-xs text-muted-foreground">
            Receitas - Despesas
          </p>
        </div>

        {/* Saldo do Banco */}
        <div className="space-y-2 p-4 rounded-lg bg-slate-800/50">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
            <Zap className="h-3.5 w-3.5" />
            Saldo Real ({displayLabel})
          </p>
          <p className="text-2xl font-bold text-blue-400">
            {renderValue(bankBalance)}
          </p>
          <p className="text-xs text-muted-foreground">
            Último saldo registrado
          </p>
        </div>

        {/* Diferença e Status */}
        {isDifferent && (
          <div className={cn(
            "space-y-2 p-4 rounded-lg border-2",
            isSystemAhead
              ? "bg-warning/5 border-warning/30"
              : "bg-destructive/5 border-destructive/30"
          )}>
            <p className="text-xs text-muted-foreground font-medium">Diferença</p>
            <p className={cn(
              "text-lg font-bold",
              isSystemAhead ? "text-warning" : "text-destructive"
            )}>
              {isSystemAhead ? "+" : ""}{renderValue(Math.abs(difference))}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSystemAhead
                ? "Sistema registra mais do que o banco. Verifique se há transações não sincronizadas."
                : "Banco tem mais do que o sistema. Pode haver depósitos diretos não registrados."}
            </p>
          </div>
        )}

        {!isDifferent && (
          <div className="space-y-2 p-4 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm font-semibold text-success flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Sistema sincronizado com o banco
            </p>
            <p className="text-xs text-muted-foreground">
              Seus registros correspondem ao saldo real da {displayLabel}. Ótimo!
            </p>
          </div>
        )}

        <div className="pt-2 border-t text-center">
          <p className="text-xs text-muted-foreground">
            💡 Dica: Sempre que importar transações do OFX/CSV, atualize o saldo do banco para uma sincronização perfeita
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
