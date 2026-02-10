"use client"

import React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
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
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-card-foreground truncate">{item.name}</p>
                {item.date && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(item.date)}
                  </p>
                )}
                {item.badges && item.badges.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.badges.map((badge) => (
                      <Badge
                        key={badge.label}
                        variant={badge.variant ?? "secondary"}
                        className={badge.className}
                      >
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                )}
                {item.extra && <div className="mt-2">{item.extra}</div>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <p
                  className={`text-lg font-bold ${
                    item.valueColor ?? "text-foreground"
                  }`}
                >
                  {formatCurrency(item.value)}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(item.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Excluir</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
