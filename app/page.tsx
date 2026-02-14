import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Shield, TrendingUp, Radar, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-svh bg-tech text-foreground">
      <header className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 py-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <img
            src="/logo01.jpg"
            alt="NexFinance"
            className="h-9 w-auto rounded-md"
          />
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              NexFinance
            </p>
            <p className="text-xs text-muted-foreground">
              Financas pessoais em modo turbo
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button variant="ghost" asChild className="w-full sm:w-auto">
            <Link href="/auth/login">Entrar</Link>
          </Button>
          <Button
            asChild
            className="w-full shadow-[0_0_30px_rgba(22,199,154,0.35)] sm:w-auto"
          >
            <Link href="/auth/sign-up">
              Criar Conta
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 pb-16 pt-4 sm:pt-8">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Inteligencia financeira
            </div>
            <h1 className="font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              A central tecnologica do seu dinheiro em tempo real.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Controle receitas, despesas e metas com dashboards inteligentes,
              projecoes mensais e uma experiencia fluida para desktop e mobile.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                asChild
                className="w-full shadow-[0_0_30px_rgba(22,199,154,0.35)] sm:w-auto"
              >
                <Link href="/auth/sign-up">Comecar agora</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/auth/login">Ja tenho conta</Link>
              </Button>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Painel tatico
              </p>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                Live
              </span>
            </div>
            <div className="mt-6 grid gap-4">
              {[
                { label: "Saldo projetado", value: "R$ 12.450" },
                { label: "Receitas futuras", value: "R$ 9.200" },
                { label: "Despesas previstas", value: "R$ 4.180" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/40 px-4 py-4"
                >
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-base font-semibold text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
                Projecao automatica com base nos seus periodos financeiros.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: TrendingUp,
              title: "Fluxo de caixa preciso",
              text: "Visualize entradas e saidas com filtros e exportacao instantanea.",
            },
            {
              icon: Radar,
              title: "Projecoes inteligentes",
              text: "Antecipe o saldo final com base em contas e metas planejadas.",
            },
            {
              icon: Shield,
              title: "Dados blindados",
              text: "Seguranca com autenticao Supabase e regras por usuario.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border/60 bg-card/40 p-6"
            >
              <feature.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-lg text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.text}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo01.jpg"
              alt="NexFinance"
              className="h-7 w-auto rounded-md opacity-70 grayscale"
            />
            <p className="text-xs text-muted-foreground">
              NexFinance. Sua base financeira inteligente.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date().getFullYear()} NexFinance
          </p>
        </div>
      </footer>
    </div>
  )
}
