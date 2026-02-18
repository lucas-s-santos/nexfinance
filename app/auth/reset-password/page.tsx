"use client"

import React, { useEffect, useState } from "react"
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
import { useRouter } from "next/navigation"
import { useState as useStateComponent } from "react"
import { ArrowRight, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ResetPasswordPage() {
  const [password, setPassword] = useStateComponent("")
  const [confirmPassword, setConfirmPassword] = useStateComponent("")
  const [error, setError] = useStateComponent<string | null>(null)
  const [isLoading, setIsLoading] = useStateComponent(false)
  const [success, setSuccess] = useStateComponent(false)
  const [isVerifying, setIsVerifying] = useStateComponent(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          setError("Link de reset inválido ou expirado. Tente novamente.")
          setIsVerifying(false)
          return
        }
        setIsVerifying(false)
      } catch (error: unknown) {
        setError("Erro ao verificar o link de reset.")
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("As senhas não conferem")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres")
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error
      setSuccess(true)

      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Erro ao redefinir a senha"
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verificando link de reset...</p>
        </div>
      </div>
    )
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
                Senha redefinida!
              </CardTitle>
              <CardDescription className="text-center">
                Sua senha foi alterada com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Você será redirecionado para o login em breve...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
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
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-xl font-display">Erro</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Link href="/auth/login" className="inline-block w-full">
                <Button className="w-full h-11">
                  Voltar para login
                </Button>
              </Link>
              <Link href="/auth/forgot-password" className="inline-block w-full">
                <Button variant="outline" className="w-full h-11">
                  Tentar novamente
                </Button>
              </Link>
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
              Redefinir senha
            </CardTitle>
            <CardDescription>
              Digite uma nova senha para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword}>
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {isLoading ? "Redefinindo..." : "Redefinir senha"}
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
