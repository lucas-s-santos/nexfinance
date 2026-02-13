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
      <div className="min-h-svh">
        <ColorSync />
        <SidebarNav />
        <OnboardingModal />
        <QuickAdd />
        <main className="lg:pl-64">
          <div className="mx-auto max-w-7xl px-4 py-6 pt-16 lg:px-8 lg:pt-6">
            <div className="glass-panel rounded-3xl p-6 lg:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </PeriodProvider>
  )
}
