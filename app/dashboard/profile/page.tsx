"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NotificationsPanel } from "@/components/dashboard/notifications-panel"
import {
  applySystemColor,
  DEFAULT_SYSTEM_COLOR,
  normalizeHex,
} from "@/lib/theme"
import { Palette, ShieldCheck, Sparkles, UserCircle2 } from "lucide-react"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [displayNameEdit, setDisplayNameEdit] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  const [accentHex, setAccentHex] = useState(DEFAULT_SYSTEM_COLOR)
  const [customHex, setCustomHex] = useState(DEFAULT_SYSTEM_COLOR)
  const [colorSaving, setColorSaving] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        applySystemColor(DEFAULT_SYSTEM_COLOR)
        setLoading(false)
        return
      }

      setEmail(user.email ?? null)
      setUserId(user.id)
      setCreatedAt(user.created_at ?? null)

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, accent_color")
        .eq("id", user.id)
        .single()

      const initial =
        normalizeHex(profile?.accent_color ?? "") ?? DEFAULT_SYSTEM_COLOR
      setDisplayName(profile?.display_name ?? null)
      setDisplayNameEdit(profile?.display_name ?? "")
      setAccentHex(initial)
      setCustomHex(initial)
      applySystemColor(initial)
      setLoading(false)
    }

    loadProfile()
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
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

  const scheduleColorSave = (value: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    setColorSaving(true)
    saveTimerRef.current = setTimeout(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setColorSaving(false)
        return
      }
      await supabase
        .from("profiles")
        .update({ accent_color: value, updated_at: new Date().toISOString() })
        .eq("id", user.id)
      setColorSaving(false)
    }, 600)
  }

  const handleAccentChange = (value: string) => {
    const normalized = normalizeHex(value)
    if (!normalized) return
    setAccentHex(normalized)
    setCustomHex(normalized)
    applySystemColor(normalized)
    scheduleColorSave(normalized)
  }

  const handleCustomApply = () => {
    const normalized = normalizeHex(customHex)
    if (!normalized) return
    handleAccentChange(normalized)
  }

  const handleReset = () => {
    setAccentHex(DEFAULT_SYSTEM_COLOR)
    setCustomHex(DEFAULT_SYSTEM_COLOR)
    applySystemColor(DEFAULT_SYSTEM_COLOR)
    scheduleColorSave(DEFAULT_SYSTEM_COLOR)
  }

  const quickColors = [
    DEFAULT_SYSTEM_COLOR,
    "#06b6d4",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#a855f7",
  ]

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
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tema atual</p>
            <p className="text-sm font-semibold text-foreground">{accentHex}</p>
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

      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" />
            Personalizacao de cores
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Selecionar cor"
                value={accentHex}
                onChange={(e) => handleAccentChange(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Cor atual</p>
                <p className="text-xs text-muted-foreground">{accentHex}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {quickColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleAccentChange(color)}
                  className="h-8 w-8 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                  aria-label={`Selecionar ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div className="grid gap-2">
              <Label htmlFor="custom-color">Digite um hex</Label>
              <Input
                id="custom-color"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#16c79a"
              />
            </div>
            <Button variant="outline" onClick={handleCustomApply}>
              Aplicar
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              Restaurar
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Dica: use o formato #RRGGBB para cores personalizadas.</span>
            <span>{colorSaving ? "Salvando cor..." : "Cor sincronizada"}</span>
          </div>
        </CardContent>
      </Card>

      <NotificationsPanel
        title="Notificacoes"
        subtitle="Central de alertas dentro do seu perfil."
      />
    </div>
  )
}
