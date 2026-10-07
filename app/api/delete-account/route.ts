import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function POST() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    console.error("delete-account: unauthorized", error)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error("delete-account: missing service role key")
    return NextResponse.json(
      { error: "Service role key nao configurada" },
      { status: 500 }
    )
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  // Comprovantes ficam em receipts/<id do usuário>/ e não somem com o deleteUser
  // (as tabelas somem pelo ON DELETE CASCADE). A Play Store exige apagar tudo.
  const receipts = adminClient.storage.from("receipts")
  while (true) {
    const { data: files, error: listError } = await receipts.list(user.id, { limit: 1000 })
    if (listError) {
      console.error("delete-account: list receipts failed", listError)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }
    if (!files?.length) break
    const { data: removed, error: removeError } = await receipts.remove(
      files.map((file) => `${user.id}/${file.name}`)
    )
    if (removeError) {
      console.error("delete-account: remove receipts failed", removeError)
      return NextResponse.json({ error: removeError.message }, { status: 500 })
    }
    if (!removed?.length) break
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id
  )

  if (deleteError) {
    console.error("delete-account: delete failed", deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
