"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Prevenir erro de hidratação
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="w-9 sm:w-[110px] justify-center sm:justify-start bg-card/40 backdrop-blur-md border-border/10">
        <Sun className="h-4 w-4" />
        <span className="hidden sm:inline-block ml-2 text-xs font-medium text-muted-foreground italic">...</span>
      </Button>
    )
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={toggleTheme}
      className="w-9 sm:w-[110px] justify-center sm:justify-start bg-card/40 backdrop-blur-md border-border/10 hover:bg-card/60 transition-all border-orange-500/50"
      aria-label="Alternar tema"
    >
      <div className="relative h-4 w-4 flex items-center justify-center sm:mr-2">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </div>
      <span className="hidden sm:inline-block text-xs font-medium">
        {theme === "light" ? "Escuro" : "Claro"}
      </span>
    </Button>
  )
}
