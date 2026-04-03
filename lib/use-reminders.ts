"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export type Reminder = {
  id: string
  user_id: string
  category_id?: string
  date: string
  title: string
  description?: string
  is_completed: boolean
  created_at: string
  category?: {
    id: string
    name: string
  }
}

async function fetchReminders(): Promise<Reminder[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("reminders")
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq("user_id", user.id)
    .order("date", { ascending: true })

  if (error) throw error
  return data as Reminder[]
}

export function useReminders() {
  return useSWR("reminders", fetchReminders, {
    dedupingInterval: 1000 * 60 * 5, // 5 minutos
  })
}
