import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Writes an entry to the audit_logs table.
 * Used to track superuser and sensitive actions for transparency.
 */
export async function logAuditEvent(
    supabase: SupabaseClient,
    userId: string,
    action: string,
    targetType: string,
    targetId?: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    const { error } = await supabase.from("audit_logs").insert({
        user_id: userId,
        action,
        target_type: targetType,
        target_id: targetId || null,
        metadata: metadata || {},
    });

    if (error) {
        // Log but don't throw — audit failures shouldn't break the main flow
        console.error("Failed to write audit log:", error);
    }
}

// Common audit action constants
export const AuditActions = {
    VIEW_GRADES: "VIEW_GRADES",
    MODIFY_GRADE: "MODIFY_GRADE",
    MODIFY_USER_ROLE: "MODIFY_USER_ROLE",
    VIEW_USER_LIST: "VIEW_USER_LIST",
    VIEW_COURSE: "VIEW_COURSE",
    DELETE_USER: "DELETE_USER",
    OVERRIDE_MODE_ENABLED: "OVERRIDE_MODE_ENABLED",
} as const;
