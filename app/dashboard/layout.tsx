import React from "react"
import { PeriodProvider } from "@/lib/period-context"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { OnboardingModal } from "@/components/dashboard/onboarding-modal"
import { QuickAdd } from "@/components/dashboard/quick-add"
import { ColorSync } from "@/components/dashboard/color-sync"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PeriodProvider>
      <div className="min-h-svh bg-background flex flex-col">
        <ColorSync />
        <SidebarNav />
        <OnboardingModal />
        <QuickAdd />
        <main className="flex-1 lg:pl-64 transition-all duration-300 pb-24 lg:pb-0">
          <div className="mx-auto max-w-7xl px-0 lg:px-8 py-0 lg:py-8 h-full flex flex-col min-h-[100dvh] lg:min-h-[calc(100vh-4rem)]">
            <div className="glass-panel flex-1 rounded-none lg:rounded-[2rem] p-4 pt-6 sm:p-6 lg:p-8 border-x-0 border-y-0 lg:border">
              {children}
            </div>
          </div>
        </main>
      </div>
    </PeriodProvider>
  )
}
