import { NextResponse } from "next/server";
import { requireRole, isErrorResponse } from "@/lib/rbac";
import { logAuditEvent, AuditActions } from "@/lib/audit";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET() {
    const auth = await requireRole(["superuser"]);
    if (isErrorResponse(auth)) return auth;

    const { user } = auth;

    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Get emails from auth.users (email lives there, not in profiles)
        const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });

        if (authError) {
            console.error("Error fetching auth users:", authError);
            return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
        }

        // Get roles from profiles (only has id and role)
        const { data: profiles, error: profileError } = await adminSupabase
            .from("profiles")
            .select("id, role");

        if (profileError) {
            console.error("Error fetching profiles:", profileError);
            return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
        }

        // Merge auth users with profiles
        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
        const users = authData.users.map((authUser) => {
            const profile = profileMap.get(authUser.id);
            return {
                id: authUser.id,
                email: authUser.email || "Unknown",
                role: profile?.role || "student",
                created_at: authUser.created_at,
            };
        });

        await logAuditEvent(adminSupabase, user.id, AuditActions.VIEW_USER_LIST, "profiles");

        return NextResponse.json({ users });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireRole(["superuser"]);
    if (isErrorResponse(auth)) return auth;

    const { user } = auth;
    const { userId, role } = await req.json();

    if (!userId || !role) {
        return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }

    if (!["student", "professor", "superuser"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (userId === user.id && role !== "superuser") {
        return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { error } = await adminSupabase
            .from("profiles")
            .update({ role })
            .eq("id", userId);

        if (error) {
            console.error("Error updating user role:", error);
            return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
        }

        await logAuditEvent(adminSupabase, user.id, AuditActions.MODIFY_USER_ROLE, "profiles", userId, {
            new_role: role,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
