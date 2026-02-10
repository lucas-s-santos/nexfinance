"use client"

import React from "react"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface PeriodContextType {
  month: number
  year: number
  periodId: string | null
  setMonth: (month: number) => void
  setYear: (year: number) => void
  isLoading: boolean
}

const PeriodContext = createContext<PeriodContextType | null>(null)

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [periodId, setPeriodId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const ensurePeriod = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsLoading(false)
      return
    }

    // Check if period exists
    const { data: existing } = await supabase
      .from("financial_periods")
      .select("id")
      .eq("month", month)
      .eq("year", year)
      .eq("user_id", user.id)
      .single()

    if (existing) {
      setPeriodId(existing.id)
    } else {
      // Create new period
      const { data: newPeriod } = await supabase
        .from("financial_periods")
        .insert({ user_id: user.id, month, year })
        .select("id")
        .single()
      if (newPeriod) {
        setPeriodId(newPeriod.id)
      }
    }
    setIsLoading(false)
  }, [month, year])

  useEffect(() => {
    ensurePeriod()
  }, [ensurePeriod])

  return (
    <PeriodContext.Provider
      value={{ month, year, periodId, setMonth, setYear, isLoading }}
    >
      {children}
    </PeriodContext.Provider>
  )
}

export function usePeriod() {
  const context = useContext(PeriodContext)
  if (!context) {
    throw new Error("usePeriod must be used within a PeriodProvider")
  }
  return context
}
