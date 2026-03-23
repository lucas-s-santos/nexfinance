"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("As senhas não conferem")
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      if (data.session) {
        router.push("/dashboard")
      } else {
        router.push("/dashboard")
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao criar a conta"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full bg-background selection:bg-primary/30">
      
      {/* Right Pane - Visual / Branding (INVERTER LADO NO SIGNUP) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black flex-col justify-between p-12 overflow-hidden border-l border-border/10 order-2">
        <div className="absolute inset-0 bg-gradient-to-bl from-blue-600/20 via-black to-primary/10" />
        {/* Glow Spheres */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center justify-end gap-4"
        >
          <span className="font-display text-2xl font-bold tracking-wide text-white">NexFinance</span>
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-primary/30 border border-white/10 bg-white">
            <img src="/logo01.jpg" alt="NexFinance Logo" className="h-full w-full object-cover" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-lg self-end text-right"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Liberdade Financeira
          </div>
          <h1 className="text-5xl font-display font-bold text-white leading-tight mb-6">
            Junte-se à nova era de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">gestão</span>.
          </h1>
          <p className="text-lg text-white/60 ml-auto">
            Abandone as planilhas. Comece agora a gerenciar seu patrimônio com uma base de nível enterprise.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="relative z-10 flex items-center justify-end gap-4 text-sm text-white/40"
        >
          Seus dados estão criptografados do início ao fim.
          <ShieldCheck className="h-5 w-5" />
        </motion.div>
      </div>

      {/* Left Pane - Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-8 sm:p-12 relative overflow-hidden bg-background order-1">
        {/* Subtle mobile glow */}
        <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 rounded-full blur-[100px] lg:hidden" />
        
        <div className="w-full max-w-md relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">Construa sua Base</h2>
            <p className="text-muted-foreground">
              Preencha os dados abaixo para iniciar sua jornada.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 shadow-xl bg-card/40 backdrop-blur-2xl"
          >
            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
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
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Senha</Label>
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

              <div className="grid gap-2">
                <Label htmlFor="repeat-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirmar Senha</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
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
                className="h-12 w-full mt-4 rounded-xl bg-foreground hover:bg-foreground/90 text-background shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] group"
                disabled={isLoading}
              >
                {isLoading ? "Gerando base..." : "Criar Conta Local"}
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
            {"Já faz parte do esquadrão? "}
            <Link
              href="/auth/login"
              className="text-primary font-medium hover:underline underline-offset-4 transition-all"
            >
              Fazer Login
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
