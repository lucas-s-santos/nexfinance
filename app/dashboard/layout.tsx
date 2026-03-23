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
        <main className="flex-1 lg:pl-64 transition-all duration-300">
          <div className="mx-auto max-w-7xl px-4 py-8 pb-32 pt-6 lg:px-8 lg:pb-12 h-full flex flex-col">
            <div className="glass-panel flex-1 rounded-[2rem] p-5 sm:p-6 lg:p-8 animate-in fade-in duration-700 slide-in-from-bottom-6 min-h-[80vh]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </PeriodProvider>
  )
}
