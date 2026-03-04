import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Public routes that don't require authentication
    const publicPaths = ["/", "/login", "/auth", "/error"];
    const isPublicPath = publicPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
    );

    if (!user && !isPublicPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Role-based route gating for authenticated users
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        const role = profile?.role || "student";

        // Admin routes → superuser only
        if (pathname.startsWith("/dashboard/admin")) {
            if (role !== "superuser") {
                const url = request.nextUrl.clone();
                url.pathname = "/dashboard";
                return NextResponse.redirect(url);
            }
        }

        // Professor routes → professor or superuser
        if (pathname.startsWith("/dashboard/professor")) {
            if (role !== "professor" && role !== "superuser") {
                const url = request.nextUrl.clone();
                url.pathname = "/dashboard";
                return NextResponse.redirect(url);
            }
        }

        // Results routes → professor or superuser only
        if (pathname.startsWith("/results")) {
            if (role !== "professor" && role !== "superuser") {
                const url = request.nextUrl.clone();
                url.pathname = "/dashboard";
                return NextResponse.redirect(url);
            }
        }
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    return supabaseResponse;
}
