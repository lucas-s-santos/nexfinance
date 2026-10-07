// Moldura das páginas públicas que a Play Store exige (privacidade e exclusão de conta).
import type { ReactNode } from "react"
import Link from "next/link"
import { Wordmark } from "@/components/brand/brand"

export const CONTACT_EMAIL = "lucassilvadossantos2005@gmail.com"

export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: ReactNode }) {
  return (
    <div className="min-h-svh w-full bg-gradient-to-b from-background to-muted/30 px-4 py-10 sm:px-6 sm:py-14">
      <article className="mx-auto w-full max-w-2xl">
        <Link href="/" aria-label="NexFinance, página inicial" className="inline-block">
          <Wordmark size={32} />
        </Link>
        <h1 className="mt-8 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Atualizada em {updatedAt}</p>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90">{children}</div>
      </article>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
  )
}
