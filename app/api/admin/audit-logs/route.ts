import { NextResponse } from "next/server";
import { requireRole, isErrorResponse } from "@/lib/rbac";

export async function GET(req: Request) {
    const auth = await requireRole(["superuser"]);
    if (isErrorResponse(auth)) return auth;

    const { supabase } = auth;

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    try {
        const { data: logs, error, count } = await supabase
            .from("audit_logs")
            .select("*, profiles!audit_logs_user_id_fkey(email)", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error fetching audit logs:", error);
            return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
        }

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
