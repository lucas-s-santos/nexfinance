"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAccountBalance } from "@/lib/use-account-balance"
import { formatCurrency } from "@/lib/format"
import { AlertCircle, CheckCircle2, Wallet } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UpdateBalanceDialogProps {
  accountName: string
  accountLabel: string
}

export function UpdateBalanceDialog({ accountName, accountLabel }: UpdateBalanceDialogProps) {
  const { balance, isLoading, updateBalance } = useAccountBalance(accountName)
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

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
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao atualizar saldo",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Card className="glass-panel border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-500" />
            {accountLabel}
          </CardTitle>
          <CardDescription>
            Saldo sincronizado com o banco
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
                <p className="text-3xl font-bold text-blue-500">
                  {balance ? formatCurrency(balance.current_balance) : "R$ 0,00"}
                </p>
                {balance && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Atualizado em {new Date(balance.last_updated).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>

              <Button
                onClick={() => {
                  setIsOpen(true)
                  setMessage(null)
                }}
                className="w-full"
                variant="outline"
              >
                Atualizar Saldo
              </Button>

              {isOpen && (
                <div className="space-y-4 border-t pt-4">
                  <Alert variant="default" className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                      Digite o saldo atual do seu {accountLabel}. Você pode conferir isso na sua conta do banco ou appda Nubank.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="balance-input">Novo Saldo</Label>
                    <Input
                      id="balance-input"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  {message && (
                    <Alert variant={message.type === "success" ? "default" : "destructive"}>
                      {message.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateBalance}
                      disabled={isSaving || !inputValue}
                      className="flex-1"
                    >
                      {isSaving ? "Salvando..." : "Confirmar"}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsOpen(false)
                        setInputValue("")
                        setMessage(null)
                      }}
                      variant="outline"
                      className="flex-1"
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
