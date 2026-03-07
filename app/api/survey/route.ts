import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/rbac";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { user } = auth;
    const { assessmentId, responses, consent } = await req.json();

    if (!responses || !consent) {
        return NextResponse.json(
            { error: "Responses and consent are required" },
            { status: 400 }
        );
    }

    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminSupabase
        .from("survey_responses")
        .insert({
            user_id: user.id,
            assessment_id: assessmentId || null,
            responses,
            consent,
        })
        .select()
        .single();

    if (error) {
        console.error("Error saving survey:", error);
        return NextResponse.json(
            { error: "Failed to save survey response" },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true, id: data.id });
}
