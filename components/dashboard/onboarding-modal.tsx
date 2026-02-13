"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Check } from "lucide-react"

const STEPS = [
  { title: "Seu Perfil", icon: User, description: "Como devemos chamar voce?" },
]

export function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(true)

  // Step 1: Profile
  const [fullName, setFullName] = useState("")

  useEffect(() => {
    const checkOnboarding = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setChecking(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, onboarding_completed")
        .eq("id", user.id)
        .single()

      if (!profile && !profileError) {
        await supabase.from("profiles").insert({
          id: user.id,
          display_name: null,
          onboarding_completed: true,
        })
        setChecking(false)
        return
      }

      if (!profile?.onboarding_completed) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id)
      }

      setChecking(false)
    }
    checkOnboarding()
  }, [])

  const handleFinish = async () => {
    if (!fullName.trim()) {
      toast.error("Por favor, informe seu apelido")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    // Save profile name
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: fullName.trim(), onboarding_completed: true })
      .eq("id", user.id)

    if (profileError) {
      toast.error("Erro ao salvar perfil")
      setSaving(false)
      return
    }

    toast.success("Perfil salvo! Bem-vindo(a)!")
    setSaving(false)
    setOpen(false)
  }

  if (checking) return null

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {React.createElement(STEPS[0].icon, { className: "h-5 w-5 text-primary" })}
            {STEPS[0].title}
          </DialogTitle>
          <DialogDescription>{STEPS[0].description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="onboarding-name">Seu apelido</Label>
            <Input
              id="onboarding-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Joao"
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleFinish} disabled={saving}>
            {saving ? "Salvando..." : "Concluir"}
            {!saving && <Check className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
