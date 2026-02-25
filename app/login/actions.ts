"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function signInWithGoogle() {
    const supabase = await createClient();

    const getURL = () => {
        let url =
            process?.env?.NEXT_PUBLIC_SITE_URL ?? // Make sure this is set in Vercel to https://speacy.vercel.app
            process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
            'http://localhost:3000';
        url = url.includes('http') ? url : `https://${url}`;
        // Ensure no trailing slash
        return url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url;
    };
    const origin = getURL();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    if (data.url) {
        redirect(data.url);
    }
}
