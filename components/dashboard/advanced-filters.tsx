"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Filter, Download, X, ChevronDown } from "lucide-react"

export interface FilterState {
  search: string
  dateFrom: string
  dateTo: string
  paymentMethod: string
  isEssential: string
  categoryId: string
  paidStatus: string
}

const emptyFilters: FilterState = {
  search: "",
  dateFrom: "",
  dateTo: "",
  paymentMethod: "all",
  isEssential: "all",
  categoryId: "all",
  paidStatus: "all",
}

interface AdvancedFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onExport: () => void
  showPaymentMethod?: boolean
  showEssential?: boolean
  showCategory?: boolean
  showPaidStatus?: boolean
  categories?: Array<{ id: string; name: string }>
  itemCount: number
  totalValue: number
}

export function AdvancedFilters({
  filters,
  onFiltersChange,
  onExport,
  showPaymentMethod = false,
  showEssential = false,
  showCategory = false,
  showPaidStatus = false,
  categories,
  itemCount,
  totalValue,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false)

  const hasActiveFilters =
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.paymentMethod !== "all" ||
    filters.isEssential !== "all" ||
    filters.categoryId !== "all" ||
    filters.paidStatus !== "all"

  const clearFilters = () => {
    onFiltersChange(emptyFilters)
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por nome..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pr-8"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={hasActiveFilters ? "border-primary text-primary" : ""}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                !
              </span>
            )}
            <ChevronDown
              className={`ml-1 h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
      </div>

      <CollapsibleContent className="mt-3">
        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Data Inicio</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                onFiltersChange({ ...filters, dateFrom: e.target.value })
              }
              className="h-9 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Data Fim</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                onFiltersChange({ ...filters, dateTo: e.target.value })
              }
              className="h-9 text-sm"
            />
          </div>
          {showPaymentMethod && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Metodo Pagamento</Label>
              <Select
                value={filters.paymentMethod}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, paymentMethod: v })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="credit">Cartao de Credito</SelectItem>
                  <SelectItem value="debit">Cartao de Debito</SelectItem>
                  <SelectItem value="voucher">Vale Refeicao</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {showEssential && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={filters.isEssential}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, isEssential: v })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Essencial</SelectItem>
                  <SelectItem value="false">Nao Essencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {showCategory && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select
                value={filters.categoryId}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, categoryId: v })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {(categories ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showPaidStatus && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={filters.paidStatus}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, paidStatus: v })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="unpaid">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="h-9 text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Limpar filtros
            </Button>
          </div>
        </div>

        {hasActiveFilters && (
          <p className="mt-2 text-xs text-muted-foreground">
            Exibindo <strong>{itemCount}</strong> resultado(s)
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function useFilteredData<
  T extends {
    name: string
    date?: string
    payment_method?: string
    is_essential?: boolean
    category_id?: string | null
    is_paid?: boolean
  },
>(data: T[], filters: FilterState): T[] {
  return data.filter((item) => {
    // Search filter
    if (
      filters.search &&
      !item.name.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false
    }

    // Date range filter
    const itemDate = item.date ?? ""
    if (filters.dateFrom && itemDate < filters.dateFrom) return false
    if (filters.dateTo && itemDate > filters.dateTo) return false

    // Payment method filter
    if (
      filters.paymentMethod !== "all" &&
      item.payment_method &&
      item.payment_method !== filters.paymentMethod
    ) {
      return false
    }

    // Category filter
    if (filters.categoryId !== "all") {
      if (item.category_id !== filters.categoryId) return false
    }

    // Essential filter
    if (filters.isEssential !== "all" && item.is_essential !== undefined) {
      const isEss = filters.isEssential === "true"
      if (item.is_essential !== isEss) return false
    }

    // Paid status filter
    if (filters.paidStatus !== "all" && item.is_paid !== undefined) {
      const isPaid = filters.paidStatus === "paid"
      if (item.is_paid !== isPaid) return false
    }

    return true
  })
}

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers: { key: string; label: string }[]
) {
  const csvHeaders = headers.map((h) => h.label).join(",")
  const csvRows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key]
        const str = String(val ?? "")
        return str.includes(",") || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      })
      .join(",")
  )
  const csvContent = [csvHeaders, ...csvRows].join("\n")
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export { emptyFilters }
