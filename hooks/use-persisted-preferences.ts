/**
 * Hook para persistir filtros avançados do usuário
 * Salva preferências de filtro em localStorage
 * Usado em expenses, incomes, bills, etc.
 */

import { useEffect, useState, useCallback } from "react"

export interface PersistedFilters {
  dateFrom?: string
  dateTo?: string
  minValue?: number
  maxValue?: number
  categories?: string[]
  paymentMethods?: string[]
  status?: string[]
  searchText?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  [key: string]: any
}

const DEFAULT_FILTERS: PersistedFilters = {
  dateFrom: "",
  dateTo: "",
  minValue: 0,
  maxValue: 999999999,
  categories: [],
  paymentMethods: [],
  status: [],
  searchText: "",
  sortBy: "date",
  sortOrder: "desc",
}

/**
 * Hook para persistir filtros em localStorage
 * @param storageKey - Chave única para localStorage (ex: "expenses_filters")
 * @param defaultFilters - Filtros padrão se não houver dados salvos
 * @returns [filtros, função para atualizar, função para resetar]
 */
export function usePersistedFilters(
  storageKey: string,
  defaultFilters: PersistedFilters = DEFAULT_FILTERS
): [
  PersistedFilters,
  (filters: PersistedFilters) => void,
  () => void,
] {
  const [filters, setFilters] = useState<PersistedFilters>(defaultFilters)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}:filters`)
      if (stored) {
        const parsed = JSON.parse(stored)
        setFilters({ ...defaultFilters, ...parsed })
      }
      setIsLoaded(true)
    } catch (err) {
      console.warn(`Failed to load filters for key: ${storageKey}`, err)
      setIsLoaded(true)
    }
  }, [storageKey, defaultFilters])

  const updateFilters = useCallback(
    (newFilters: PersistedFilters) => {
      try {
        localStorage.setItem(`${storageKey}:filters`, JSON.stringify(newFilters))
        setFilters(newFilters)
      } catch (err) {
        console.warn(`Failed to save filters for key: ${storageKey}`, err)
      }
    },
    [storageKey]
  )

  const resetFilters = useCallback(() => {
    try {
      localStorage.removeItem(`${storageKey}:filters`)
      setFilters(defaultFilters)
    } catch (err) {
      console.warn(`Failed to reset filters for key: ${storageKey}`, err)
    }
  }, [storageKey, defaultFilters])

  return [filters, updateFilters, resetFilters]
}

/**
 * Hook para manter visibilidade de colunas da tabela persistida
 * @param storageKey - Chave única para localStorage (ex: "expenses_columns")
 * @param defaultColumns - Colunas padrão
 */
export function usePersistedTableColumns(
  storageKey: string,
  defaultColumns: string[]
): [string[], (columns: string[]) => void] {
  const [columns, setColumns] = useState<string[]>(defaultColumns)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}:columns`)
      if (stored) {
        setColumns(JSON.parse(stored))
      }
    } catch (err) {
      console.warn(`Failed to load columns for key: ${storageKey}`, err)
    }
  }, [storageKey])

  const updateColumns = useCallback(
    (newColumns: string[]) => {
      try {
        localStorage.setItem(`${storageKey}:columns`, JSON.stringify(newColumns))
        setColumns(newColumns)
      } catch (err) {
        console.warn(`Failed to save columns for key: ${storageKey}`, err)
      }
    },
    [storageKey]
  )

  return [columns, updateColumns]
}

/**
 * Hook para salvar posição de scroll em páginas com listas longas
 * @param storageKey - Chave única para localStorage
 * @param elementSelector - Seletor CSS do elemento para rastrear scroll
 */
export function usePersistedScroll(
  storageKey: string,
  elementSelector = "main"
): void {
  useEffect(() => {
    const element = document.querySelector(elementSelector)
    if (!element) return

    // Restore scroll position on mount
    try {
      const stored = localStorage.getItem(`${storageKey}:scroll`)
      if (stored) {
        const scrollPos = parseInt(stored, 10)
        element.scrollTop = scrollPos
      }
    } catch (err) {
      console.warn(`Failed to restore scroll for key: ${storageKey}`, err)
    }

    // Save scroll position on scroll
    const handleScroll = () => {
      try {
        localStorage.setItem(`${storageKey}:scroll`, String(element.scrollTop))
      } catch (err) {
        console.warn(`Failed to save scroll for key: ${storageKey}`, err)
      }
    }

    element.addEventListener("scroll", handleScroll)
    return () => element.removeEventListener("scroll", handleScroll)
  }, [storageKey, elementSelector])
}
