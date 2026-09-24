import React from "react"
import type { Metadata, Viewport } from "next"
import { Sora } from "next/font/google"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { palettes } from "@/lib/palette"

import "./globals.css"

// Sora nos títulos e valores (a família da marca); o corpo usa a fonte do sistema, como no app.
const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" })

export const metadata: Metadata = {
  title: "NexFinance — Controle financeiro",
  description:
    "Suas receitas, despesas, contas, investimentos e metas num lugar só.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png" }],
  },
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: palettes.light.background },
    { media: "(prefers-color-scheme: dark)", color: palettes.dark.background },
  ],
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
    <html lang="pt-BR" className={sora.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground font-sans antialiased selection:bg-primary/30 min-h-svh flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
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
