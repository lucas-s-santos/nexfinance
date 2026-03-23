import React from "react"
import type { Metadata, Viewport } from "next"
import { Sora, Space_Grotesk } from "next/font/google"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"

import "./globals.css"

const sora = Sora({ subsets: ["latin"], variable: "--font-display" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "NexFinance - Controle Financeiro",
  description:
    "Gerencie suas finanças pessoais com controle de receitas, despesas, contas, investimentos e metas financeiras.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NexFinance",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#0b1524",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Previne o zoom no iPhone, dando sensação real de App
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground font-sans antialiased selection:bg-primary/30 min-h-svh flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
