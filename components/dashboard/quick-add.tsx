"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePeriod } from "@/lib/period-context"
import { useCategories } from "@/lib/use-financial-data"
import { useKeyboardShortcuts, CommonShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useLocalCache, useOnlineStatus } from "@/hooks/use-cache"
import { expenseSchema, incomeSchema } from "@/lib/validators"
import ErrorHandler from "@/lib/error-handler"
import { useSmartCategory } from "@/hooks/use-smart-category"
import { FileUpload } from "@/components/ui/file-upload"
import { uploadReceipt } from "@/lib/upload-receipt"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoneyInput } from "@/components/ui/money-input"
import { Plus, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { parseMoneyToNumber } from "@/lib/money"
import { useIsMobile } from "@/hooks/use-mobile"
import { mutate } from "swr"

export function QuickAdd() {
  const { periodId } = usePeriod()
  const { data: categories } = useCategories()
  const isMobile = useIsMobile()
  const isOnline = useOnlineStatus()
  const pendingCache = useLocalCache<any[]>("pending_transactions", 1000 * 60 * 60) // 1 hour

  const [open, setOpen] = useState(false)
  const [type, setType] = useState("expense")
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState("debit")
  const [categoryId, setCategoryId] = useState("")
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filteredCategories = (categories ?? []).filter(
    (cat) => cat.type === type
  )

  // Smart Categorization based on input
  useSmartCategory(name, filteredCategories, categoryId, setCategoryId)

  // Setup keyboard shortcuts
  useKeyboardShortcuts([
    CommonShortcuts.addExpense(() => {
      setType("expense")
      setOpen(true)
    }),
    CommonShortcuts.addIncome(() => {
      setType("income")
      setOpen(true)
    }),
    CommonShortcuts.close(() => setOpen(false)),
    CommonShortcuts.save(() => {
      if (open) {
        handleSave()
      }
    }),
  ])

  // Sync pending transactions when back online
  useEffect(() => {
    if (isOnline && pendingCache.cached && pendingCache.cached.length > 0) {
      syncPendingTransactions()
    }
  }, [isOnline])

  const syncPendingTransactions = async () => {
    const pending = pendingCache.get()
    if (!pending || pending.length === 0) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    let synced = 0
    const failed = []

    for (const transaction of pending) {
      try {
        const table = transaction.type === "income" ? "incomes" : "expenses"
        const { error } = await supabase.from(table).insert({
          ...transaction,
          user_id: user.id,
        })

        if (!error) {
          synced++
        } else {
          failed.push(transaction.name)
        }
      } catch (err) {
        failed.push((err as any).message || "Erro")
      }
    }

    if (synced > 0) {
      toast.success(`${synced} transações sincronizadas`)
      pendingCache.clear()
      mutate((key) => {
        return (
          typeof key === "string" &&
          (key.includes("expenses") || key.includes("incomes"))
        )
      })
    }

    if (failed.length > 0) {
      toast.error(
        `Não foi possível sincronizar: ${failed.slice(0, 2).join(", ")}`
      )
    }
  }

  const handleSave = async () => {
    if (!periodId) {
      toast.error("Período não carregado")
      return
    }

    if (!name.trim() || !value) {
      toast.error("Preencha nome e valor")
      return
    }

    // Validate input
    const parseResult = type === "income" 
      ? incomeSchema.safeParse({
          name,
          value: parseMoneyToNumber(value),
          date,
          category_id: categoryId || undefined,
          receipt_url: receiptUrl || undefined,
        })
      : expenseSchema.safeParse({
          name,
          value: parseMoneyToNumber(value),
          date,
          category_id: categoryId || undefined,
          payment_method: paymentMethod,
          is_essential: false,
          receipt_url: receiptUrl || undefined,
        })

    if (!parseResult.success) {
      const error = ErrorHandler.fromZodError(parseResult.error)
      toast.error(ErrorHandler.getPublicMessage(error))
      return
    }

    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Autenticação necessária")
      setSaving(false)
      return
    }

    const transactionData = {
      user_id: user.id,
      period_id: periodId,
      ...parseResult.data,
    }

    try {
      const table = type === "income" ? "incomes" : "expenses"

      if (isOnline) {
        // Online: enviar direto
        const { error } = await supabase.from(table).insert(transactionData)
        if (error) throw error

        toast.success(
          type === "income" ? "Receita criada" : "Despesa criada"
        )

        // Revalidate cache imediatamente
        mutate((key) => {
          return (
            typeof key === "string" &&
            (key.includes("expenses") || key.includes("incomes"))
          )
        })
      } else {
        // Offline: guardar localmente
        const existing = pendingCache.get() ?? []
        pendingCache.set([...existing, { ...transactionData, type }])
        toast.success(
          `${type === "income" ? "Receita" : "Despesa"} salva localmente. Será sincronizada quando estiver online.`
        )
      }

      // Reset form
      setOpen(false)
      setName("")
      setValue("")
      setDate(new Date().toISOString().slice(0, 10))
      setCategoryId("")
      setReceiptUrl(null)
      if (type === "expense") setPaymentMethod("debit")
    } catch (err: any) {
      const appError = ErrorHandler.fromSupabaseError(err)
      ErrorHandler.log(appError)
      toast.error(ErrorHandler.getPublicMessage(appError))
    } finally {
      setSaving(false)
    }
  }

  const formContent = (
    <div className="grid gap-3">
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-md bg-yellow-100 p-2 text-sm text-yellow-800">
          <WifiOff className="h-4 w-4" />
          <span>Modo offline. Dados serão sincronizados quando conectar.</span>
        </div>
      )}

      <div className="grid gap-2">
        <Label>Tipo</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">
              Despesa (Ctrl+D)
            </SelectItem>
            <SelectItem value="income">
              Receita (Ctrl+R)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Nome</Label>
        <Input
          placeholder="Ex: Almoço, Salário"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <Label>Valor</Label>
        <MoneyInput
          value={value}
          onValueChange={setValue}
          disabled={saving}
          placeholder="0,00"
        />
      </div>

      <div className="grid gap-2">
        <Label>Data</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="grid gap-2">
        <Label>Categoria</Label>
        <Select
          value={categoryId || "none"}
          onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}
          disabled={saving}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sem categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem categoria</SelectItem>
            {filteredCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === "expense" && (
        <div className="grid gap-2">
          <Label>Método</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={saving}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debit">Cartão de Débito</SelectItem>
              <SelectItem value="credit">Cartão de Crédito</SelectItem>
              <SelectItem value="pix">Pix</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="voucher">Investimento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-2">
        <Label>Comprovante (Opcional)</Label>
        <FileUpload
          value={receiptUrl}
          onChange={setReceiptUrl}
          onUpload={uploadReceipt}
          disabled={saving || !isOnline}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="h-11 w-full"
      >
        {saving ? "Salvando..." : "Salvar (Ctrl+S)"}
      </Button>
    </div>
  )

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-[5.5rem] right-5 z-50 h-14 w-14 rounded-full shadow-[0_8px_30px_var(--tw-shadow-color)] shadow-primary/30 bg-gradient-to-tr from-primary to-teal-400 hover:scale-105 active:scale-95 transition-all text-primary-foreground lg:hidden flex items-center justify-center p-0"
        aria-label="Adicionar rápido"
        title="Ctrl+D (Despesa) ou Ctrl+R (Receita)"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Adicionar rápido</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">{formContent}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar rápido</DialogTitle>
              <DialogDescription>
                Despesa (Ctrl+D) • Receita (Ctrl+R) • Salvar (Ctrl+S) • Sair (ESC)
              </DialogDescription>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
