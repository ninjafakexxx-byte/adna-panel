import { externalSupabase as supabase } from "@/integrations/external-supabase/client";

export async function logAudit(
  action: string,
  entity?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("audit_logs").insert({
      user_id: user.id,
      action,
      entity,
      entity_id: entityId,
      details,
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}
