"use client"

import { useRouter } from "next/navigation"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { useNotifications } from "@/lib/use-financial-data"

async function fetchAccount() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
  return { name: profile?.display_name?.trim() || "Minha conta", email: user.email ?? "" }
}

/** Nome, e-mail, avisos não lidos e sair — o rodapé da barra lateral e do menu do celular. */
export function useAccount() {
  const router = useRouter()
  const { data: account } = useSWR("account", fetchAccount)
  const { data: notifications } = useNotifications()
  // Alertas de orçamento aparecem no Início; o número conta só os avisos da caixa de entrada (igual ao app).
  const unread = (notifications ?? []).filter((n: { is_read: boolean; type: string }) => !n.is_read && n.type !== "budget_alert").length

  async function signOut() {
    await createClient().auth.signOut()
    router.push("/auth/login")
  }

  return { name: account?.name ?? "Minha conta", email: account?.email ?? "", unread, signOut }
}
