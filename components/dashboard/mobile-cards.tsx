"use client"

import React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, ReceiptText, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/lib/format"


interface MobileCardItem {
  id: string
  name: string
  value: number
  date?: string
  badges?: Array<{ label: string; variant?: "default" | "secondary" | "outline" | "destructive"; className?: string }>
  valueColor?: string
  extra?: React.ReactNode
}

interface MobileCardsProps {
  items: MobileCardItem[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function MobileCards({ items, onEdit, onDelete }: MobileCardsProps) {
  const getIconData = (valueColor?: string) => {
    if (valueColor?.includes("success") || valueColor?.includes("green")) {
      return { Icon: TrendingUp, bg: "bg-success/10", text: "text-success" }
    }
    if (valueColor?.includes("destructive") || valueColor?.includes("red")) {
      return { Icon: TrendingDown, bg: "bg-destructive/10", text: "text-destructive" }
    }
    if (valueColor?.includes("primary") || valueColor?.includes("blue")) {
      return { Icon: PiggyBank, bg: "bg-primary/10", text: "text-primary" }
    }
    return { Icon: ReceiptText, bg: "bg-muted", text: "text-muted-foreground" }
  }

  return (
    <div className="flex flex-col gap-2.5 lg:hidden px-1">
      {items.map((item) => {
        const { Icon, bg, text } = getIconData(item.valueColor)
        
        return (
          <div 
            key={item.id} 
            className="group relative flex items-center gap-3.5 glass-panel rounded-[1.25rem] p-3.5 sm:p-4 transition-all active:scale-[0.98] hover:shadow-md hover:bg-muted/10 border border-border/40"
          >
            {/* Dynamic Icon */}
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", bg, text)}>
              <Icon className="h-5 w-5" />
            </div>
            
            {/* Middle Content */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground truncate text-[15px] sm:text-base tracking-tight">{item.name}</p>
              
              <div className="flex items-center gap-2 mt-0.5">
                {item.date && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {formatDate(item.date)}
                  </p>
                )}
                {item.badges && item.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.badges.slice(0, 1).map((badge) => (
                      <span 
                        key={badge.label} 
                        className={cn(
                          "text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium", 
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    ))}
                    {item.badges.length > 1 && (
                      <span className="text-[9px] px-1 text-muted-foreground">+{item.badges.length - 1}</span>
                    )}
                  </div>
                )}
              </div>
              
              {item.extra && <div className="mt-1.5">{item.extra}</div>}
            </div>

            {/* Right Actions & Value */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <p className={cn("text-base sm:text-lg font-black tracking-tight", item.valueColor ?? "text-foreground")}>
                {formatCurrency(item.value)}
              </p>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/50 -mr-1.5">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl glass-panel-heavy border-border/50">
                  <DropdownMenuItem onClick={() => onEdit(item.id)} className="gap-2 focus:bg-primary/10 cursor-pointer">
                    <Pencil className="h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(item.id)} 
                    className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}
