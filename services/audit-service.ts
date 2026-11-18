import { createAdminSupabaseClient } from "@/supabase/admin";

export type AuditEventCategory =
  | "admin"
  | "user"
  | "security"
  | "subscription"
  | "verification"
  | "matching"
  | "moderation"
  | "api_error";

export interface CreateAuditLogInput {
  actorId?: string | null;
  actorRole?: string | null;
  targetUserId?: string | null;
  category: AuditEventCategory;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(input: CreateAuditLogInput): Promise<void> {
  try {
    const sb = createAdminSupabaseClient();
    await sb.from("audit_logs").insert({
      actor_id: input.actorId || null,
      actor_role: input.actorRole || null,
      target_user_id: input.targetUserId || null,
      event_category: input.category,
      action: input.action,
      resource_type: input.resourceType || null,
      resource_id: input.resourceId || null,
      details: input.details || {},
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
    });
  } catch (err) {
    console.error("[audit-service] Failed to write audit log:", err);
  }
}
