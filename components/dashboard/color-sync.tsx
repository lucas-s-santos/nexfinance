"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  applySystemColor,
  DEFAULT_SYSTEM_COLOR,
  normalizeHex,
} from "@/lib/theme"

export function ColorSync() {
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        applySystemColor(DEFAULT_SYSTEM_COLOR)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("accent_color")
        .eq("id", user.id)
        .single()

      const initial = normalizeHex(profile?.accent_color ?? "") ?? DEFAULT_SYSTEM_COLOR
      applySystemColor(initial)
    }

    load()
  }, [])

  return null
}
