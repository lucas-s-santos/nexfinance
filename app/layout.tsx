import React from "react"
import type { Metadata, Viewport } from "next"
import { Sora, Space_Grotesk } from "next/font/google"
import { Toaster } from "sonner"

import "./globals.css"

const sora = Sora({ subsets: ["latin"], variable: "--font-display" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "NexFinance - Controle Financeiro",
  description:
    "Gerencie suas finanças pessoais com controle de receitas, despesas, contas, investimentos e metas financeiras.",
}

export const viewport: Viewport = {
  themeColor: "#0b1524",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-tech font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
