"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NotificationsPanel } from "@/components/dashboard/notifications-panel"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Monitor, Moon, ShieldCheck, Sparkles, Sun, UserCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [displayNameEdit, setDisplayNameEdit] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  // Aparência igual à do app: automático (acompanha o sistema), claro ou escuro.
  const { theme, setTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)
  useEffect(() => setThemeReady(true), [])
  const themeLabel = theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Automático"

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setEmail(user.email ?? null)
      setUserId(user.id)
      setCreatedAt(user.created_at ?? null)

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()

      setDisplayName(profile?.display_name ?? null)
      setDisplayNameEdit(profile?.display_name ?? "")
      setLoading(false)
    }

    loadProfile()
  }, [])

  const handleSaveName = async () => {
    const cleaned = displayNameEdit.trim()
    if (!cleaned) return
    setSavingName(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSavingName(false)
      return
    }
    await supabase
      .from("profiles")
      .update({ display_name: cleaned, updated_at: new Date().toISOString() })
      .eq("id", user.id)
    setDisplayName(cleaned)
    setEditingName(false)
    setSavingName(false)
  }

  const handleCancelName = () => {
    setDisplayNameEdit(displayName ?? "")
    setEditingName(false)
  }

  const formattedJoinDate = useMemo(() => {
    if (!createdAt) return ""
    const date = new Date(createdAt)
    if (Number.isNaN(date.getTime())) return createdAt
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date)
  }, [createdAt])

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const response = await fetch("/api/delete-account", {
        method: "POST",
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || "Erro ao excluir a conta")
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/")
      toast.success("Conta excluida com sucesso")
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir a conta"
      )
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <UserCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {loading ? "Carregando..." : displayName ?? "Seu perfil"}
              </h1>
              <p className="text-muted-foreground">
                {email ?? "Informacoes da conta e preferencias"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Plano Core</Badge>
            <Badge className="bg-success text-success-foreground">Ativo</Badge>
            <Badge variant="outline">Seguranca reforcada</Badge>
          </div>
        </div>
        <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aparência</p>
            <p className="text-sm font-semibold text-foreground">{themeReady ? themeLabel : "—"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Notificacoes</p>
            <p className="text-sm font-semibold text-foreground">Centralizada aqui</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Conta criada</p>
            <p className="text-sm font-semibold text-foreground">{formattedJoinDate || "-"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Dados do usuario</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="grid gap-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Apelido</p>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={displayNameEdit}
                    onChange={(e) => setDisplayNameEdit(e.target.value)}
                    placeholder="Digite seu apelido"
                    className="h-9"
                    disabled={savingName}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={savingName || !displayNameEdit.trim()}
                  >
                    {savingName ? "..." : "Salvar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelName}
                    disabled={savingName}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-foreground">
                    {displayName ?? "Nao informado"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingName(true)}
                  >
                    Editar
                  </Button>
                </div>
              )}
            </div>
            <div className="grid gap-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="text-foreground">{email ?? "Nao informado"}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">ID</p>
              <p className="text-xs text-muted-foreground break-all">{userId ?? "-"}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Conta criada</p>
              <p className="text-foreground">{formattedJoinDate || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Diferenciais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <p className="font-semibold">Conquistas</p>
                <p className="text-muted-foreground">3 marcos desbloqueados este mes.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Primeira meta</Badge>
              <Badge variant="secondary">Mes organizado</Badge>
              <Badge variant="secondary">Reserva ativa</Badge>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <div>
                <p className="font-semibold">Seguranca</p>
                <p className="text-muted-foreground">Sessao protegida com Supabase.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {themeReady ? (
            <ToggleGroup
              type="single"
              variant="outline"
              className="justify-start"
              value={theme ?? "system"}
              onValueChange={(v) => v && setTheme(v)}
              aria-label="Aparência do NexFinance"
            >
              <ToggleGroupItem value="system">
                <Monitor />
                Automático
              </ToggleGroupItem>
              <ToggleGroupItem value="light">
                <Sun />
                Claro
              </ToggleGroupItem>
              <ToggleGroupItem value="dark">
                <Moon />
                Escuro
              </ToggleGroupItem>
            </ToggleGroup>
          ) : (
            <div className="h-10" />
          )}
          <p className="text-xs text-muted-foreground">No automático, o NexFinance acompanha o tema do seu computador ou celular.</p>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">Zona de risco</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            Excluir sua conta remove todos os seus dados e nao pode ser
            desfeito.
          </p>
          <div>
            <Button
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir conta"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteConfirm("")
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao apaga todos os seus dados e nao pode ser desfeita.
              Para confirmar, digite "DELETAR" abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="delete-confirm">Confirmacao</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETAR"
              className="h-10"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm.trim() !== "DELETAR"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Suspense
        fallback={
          <Card className="p-6">
            <div className="flex flex-col gap-3">
              <div className="h-4 w-48 rounded-md bg-muted" />
              <div className="h-10 w-full rounded-md bg-muted" />
              <div className="h-10 w-full rounded-md bg-muted" />
              <div className="h-10 w-full rounded-md bg-muted" />
            </div>
          </Card>
        }
      >
        <NotificationsPanel
          title="Notificacoes"
          subtitle="Central de alertas dentro do seu perfil."
        />
      </Suspense>
    </div>
  )
}
