import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";

const ALLOWED_EMAILS = ["shouvikwu26@gmail.com"];
const ALLOWED_DOMAINS = ["willamette.edu"];

function isEmailAllowed(email: string): boolean {
    const normalized = email.toLowerCase().trim();
    if (ALLOWED_EMAILS.includes(normalized)) return true;
    const domain = normalized.split("@")[1];
    return ALLOWED_DOMAINS.includes(domain);
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email && !isEmailAllowed(user.email)) {
                // Instantiate admin client to physically delete the user account and cascading profiles
                const { createClient: createAdminClient } = await import('@supabase/supabase-js');
                const adminAuthClient = createAdminClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                await adminAuthClient.auth.admin.deleteUser(user.id);
                await supabase.auth.signOut();

                return NextResponse.redirect(`${origin}/login?error=unauthorized_email`);
            }

            const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === "development";
            const separator = next.includes("?") ? "&" : "?";

            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}${separator}verified=true`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}${separator}verified=true`);
            } else {
                return NextResponse.redirect(`${origin}${next}${separator}verified=true`);
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
