import React from "react"
import { PeriodProvider } from "@/lib/period-context"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { OnboardingModal } from "@/components/dashboard/onboarding-modal"
import { QuickAdd } from "@/components/dashboard/quick-add"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PeriodProvider>
      <div className="flex min-h-svh flex-col bg-background">
        <SidebarNav />
        <OnboardingModal />
        <QuickAdd />
        {/* Conteúdo direto sobre o fundo, com os cartões por cima (como no app). No celular sobra
            espaço embaixo para o "+" flutuante. */}
        <main className="flex-1 lg:pl-64">
          <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</div>
        </main>
      </div>
    </PeriodProvider>
  )
}
