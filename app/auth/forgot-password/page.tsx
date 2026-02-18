"use client"

import React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { ArrowRight, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Ocorreu um erro ao enviar o e-mail"
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-svh w-full items-start justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10 sm:items-center sm:px-6 sm:py-12">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="mb-6 flex items-center justify-center sm:mb-8">
            <img
              src="/logo01.jpg"
              alt="NexFinance"
              className="h-16 w-auto sm:h-20"
            />
          </div>
          <Card className="glass-panel border-0 shadow-sm">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <CardTitle className="text-2xl font-display text-center sm:text-3xl">
                E-mail enviado!
              </CardTitle>
              <CardDescription className="text-center">
                Verifique seu e-mail e clique no link de reset de senha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enviamos um link de recuperação para <strong>{email}</strong>. 
                Clique no link para redefinir sua senha.
              </p>
              <p className="text-sm text-muted-foreground">
                Se não receber o e-mail em alguns minutos, verifique sua pasta de spam.
              </p>
              <div className="pt-4">
                <Link href="/auth/login" className="inline-block w-full">
                  <Button className="w-full h-11">
                    Voltar para login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full items-start justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10 sm:items-center sm:px-6 sm:py-12">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-6 flex items-center justify-center sm:mb-8">
          <img
            src="/logo01.jpg"
            alt="NexFinance"
            className="h-16 w-auto sm:h-20"
          />
        </div>
        <Card className="glass-panel border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-display sm:text-3xl">
              Esqueci minha senha
            </CardTitle>
            <CardDescription>
              Digite seu e-mail para receber um link de reset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Enviando..." : "Enviar link de reset"}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {"Lembrou da sua senha? "}
                <Link
                  href="/auth/login"
                  className="text-primary underline underline-offset-4"
                >
                  Faça login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
