"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Radar, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/dashboard")
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Ocorreu um erro ao entrar"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full bg-background selection:bg-primary/30">
      
      {/* Left Pane - Visual / Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black flex-col justify-between p-12 overflow-hidden border-r border-border/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-black to-blue-900/20" />
        {/* Glow Spheres */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center gap-4"
        >
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-primary/30 border border-white/10 bg-white">
            <img src="/logo01.jpg" alt="NexFinance Logo" className="h-full w-full object-cover" />
          </div>
          <span className="font-display text-2xl font-bold tracking-wide text-white">NexFinance</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-lg"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Inteligência Financeira
          </div>
          <h1 className="text-5xl font-display font-bold text-white leading-tight mb-6">
            O poder de controlar o seu <span className="text-primary">futuro</span>.
          </h1>
          <p className="text-lg text-white/60">
            Acesse seu painel tático, monitore receitas, despesas e metas com precisão e clareza.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="relative z-10 flex items-center gap-4 text-sm text-white/40"
        >
          <Radar className="h-5 w-5" />
          Sistema ativo. Proteção de dados ligada.
        </motion.div>
      </div>

      {/* Right Pane - Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-8 sm:p-12 relative overflow-hidden bg-background">
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        {/* Subtle mobile glow */}
        <div className="absolute top-0 right-0 w-full h-96 bg-primary/5 rounded-full blur-[100px] lg:hidden" />
        
        <div className="w-full max-w-md relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">Bem-vindo(a) de volta</h2>
            <p className="text-muted-foreground">
              Insira as credenciais da sua conta tática.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 shadow-xl bg-card/40 backdrop-blur-2xl"
          >
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-background/50 border-input/50 focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Senha</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Esqueceu?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-background/50 border-input/50 focus:border-primary/50 transition-colors"
                />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                className="h-12 w-full mt-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_rgba(22,199,154,0.3)] transition-all hover:shadow-[0_0_50px_rgba(22,199,154,0.5)] group"
                disabled={isLoading}
              >
                {isLoading ? "Validando..." : "Entrar na Base"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </Button>
            </form>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            {"Ainda não faz parte? "}
            <Link
              href="/auth/sign-up"
              className="text-primary font-medium hover:underline underline-offset-4 transition-all"
            >
              Criar conta
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
