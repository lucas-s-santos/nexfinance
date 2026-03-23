"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Shield, TrendingUp, Radar, Sparkles, Activity, Layers } from "lucide-react"
import { motion } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"

// Helper animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
}

export default function HomePage() {
  return (
    <div className="min-h-svh bg-background text-foreground overflow-hidden selection:bg-primary/30 flex flex-col relative">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-blue-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-primary/30 border border-border/50 bg-white">
            <img src="/logo01.jpg" alt="NexFinance Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-foreground uppercase">
              NexFinance
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Gestão de Nível Enterprise
            </p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
        >
          <ThemeToggle />
          <Button variant="ghost" asChild className="w-full sm:w-auto hover:bg-white/5 rounded-xl">
            <Link href="/auth/login">Acessar Base</Link>
          </Button>
          <Button
            asChild
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_rgba(22,199,154,0.3)] transition-all hover:shadow-[0_0_50px_rgba(22,199,154,0.5)] rounded-xl px-6"
          >
            <Link href="/auth/sign-up">
              Começar Agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 pb-24 pt-12 sm:pt-20">
        
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center text-center space-y-8 mb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary backdrop-blur-md"
          >
            <Sparkles className="h-4 w-4" />
            A revolução nas suas finanças
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-7xl max-w-4xl"
          >
            Sua vida financeira, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-teal-300 to-blue-400 drop-shadow-sm">perfeitamente orquestrada.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg text-muted-foreground md:text-xl max-w-2xl text-balance font-medium"
          >
            Planilhas são coisa do passado. Assuma o controle total do seu patrimônio com projeções automatizadas e uma interface de cair o queixo.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 pt-6"
          >
            <Button
              size="lg"
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_40px_rgba(22,199,154,0.4)] hover:shadow-[0_0_70px_rgba(22,199,154,0.6)] h-14 px-8 text-lg rounded-2xl group transition-all"
            >
              <Link href="/auth/sign-up">
                Criar Controle Grátis
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>

          {/* Floating UI Showcase Element */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, type: "spring", bounce: 0.3 }}
            className="w-full max-w-5xl mt-16 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 rounded-b-3xl" />
            <div className="relative rounded-3xl border border-border/10 bg-card/40 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl mx-auto overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Mock Card 1 */}
                <div className="glass-panel border-border/5 rounded-2xl p-6 bg-card/20 shadow-inner translate-y-4 hover:translate-y-0 shadow-black/5 transition-all duration-500">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center mb-4 text-success">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="h-2 w-1/3 bg-foreground/10 rounded-full mb-3" />
                  <div className="text-3xl font-display font-bold text-foreground mb-2">R$ 15.240,00</div>
                  <div className="h-1.5 w-1/2 bg-success/40 rounded-full" />
                </div>

                {/* Mock Card 2 */}
                <div className="glass-panel border-border/5 rounded-2xl p-6 bg-card/20 shadow-inner -translate-y-2 hover:-translate-y-4 shadow-black/5 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full blur-2xl" />
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary relative z-10">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="h-2 w-1/3 bg-foreground/10 rounded-full mb-3 relative z-10" />
                  <div className="text-3xl font-display font-bold text-foreground mb-2 relative z-10">R$ +4.100,50</div>
                  <div className="h-1.5 w-full bg-primary/40 rounded-full relative z-10" />
                </div>

                {/* Mock Card 3 */}
                <div className="glass-panel border-border/5 rounded-2xl p-6 bg-card/20 shadow-inner translate-y-6 hover:translate-y-2 shadow-black/5 transition-all duration-500">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-500">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="h-2 w-1/3 bg-foreground/10 rounded-full mb-3" />
                  <div className="text-3xl font-display font-bold text-foreground mb-2">8 Metas Ativas</div>
                  <div className="h-1.5 w-3/4 bg-blue-500/40 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Bento Grid Features Section */}
        <motion.section 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col items-center mt-12"
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">Tudo o que você precisa. Mágica pura.</h2>
            <p className="text-muted-foreground text-lg">Projetado com perfeição para ser intuitivo, rápido e absolutamente lindo.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
            {/* Bento 1: Large */}
            <motion.div variants={fadeUp} className="md:col-span-2 glass-panel border border-border/10 rounded-[2rem] p-8 md:p-12 hover:bg-card/30 transition-colors relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] group-hover:bg-primary/20 transition-colors" />
              <Radar className="h-10 w-10 text-primary mb-6" />
              <h3 className="text-2xl font-display font-bold text-foreground mb-3">Previsões Inteligentes</h3>
              <p className="text-muted-foreground text-lg max-w-md">O NexFinance analisa suas despesas recorrentes e calcula como estará sua conta no fim do mês automaticamente. Nunca mais seja pego de surpresa.</p>
            </motion.div>

            {/* Bento 2: Square */}
            <motion.div variants={fadeUp} className="glass-panel border border-border/10 rounded-[2rem] p-8 md:p-10 hover:bg-card/30 transition-colors">
              <Shield className="h-10 w-10 text-blue-400 mb-6" />
              <h3 className="text-2xl font-display font-bold text-foreground mb-3">Segurança Total</h3>
              <p className="text-muted-foreground">Autenticação militar e criptografia ponta a ponta com Row Level Security (RLS).</p>
            </motion.div>

            {/* Bento 3: Square */}
            <motion.div variants={fadeUp} className="glass-panel border border-border/10 rounded-[2rem] p-8 md:p-10 hover:bg-card/30 transition-colors">
              <TrendingUp className="h-10 w-10 text-success mb-6" />
              <h3 className="text-2xl font-display font-bold text-foreground mb-3">Relatórios Vivos</h3>
              <p className="text-muted-foreground">Exporte extratos e PDFs lindamente desenhados com apenas um clique.</p>
            </motion.div>

            {/* Bento 4: Large */}
            <motion.div variants={fadeUp} className="md:col-span-2 glass-panel border border-border/10 rounded-[2rem] p-8 md:p-12 hover:bg-card/30 transition-colors relative overflow-hidden group">
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-colors" />
              <Sparkles className="h-10 w-10 text-indigo-400 mb-6" />
              <h3 className="text-2xl font-display font-bold text-foreground mb-3">Modo Escuro Premium</h3>
              <p className="text-muted-foreground text-lg max-w-md">Feito sob medida para quem trabalha à noite. Contraste perfeito, profundidades blur e tipografia que descansa a visão enquanto impressiona.</p>
            </motion.div>
          </div>
        </motion.section>
      </main>

      <footer className="relative z-20 border-t border-border/10 py-10 bg-black/40 backdrop-blur-sm mt-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col sm:flex-row items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden border border-white/10 bg-white">
              <img src="/logo01.jpg" alt="NexFinance Logo" className="h-full w-full object-cover" />
            </div>
            <span className="font-display font-bold text-foreground">NexFinance</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} NexFinance. Revolucionando as finanças.
          </p>
        </div>
      </footer>
    </div>
  )
}
