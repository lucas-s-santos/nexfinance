import { createClient } from "@/lib/supabase/client"

type AuditAction = "insert" | "update" | "delete"

export async function logAudit(
  entityType: string,
  entityId: string | null,
  action: AuditAction,
  changes?: Record<string, unknown>
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    entity_type: entityType,
    entity_id: entityId,
    action,
    changes: changes ?? null,
  })
}
