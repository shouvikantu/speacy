"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

const ALLOWED_EMAILS = ["shouvikwu26@gmail.com"];
const ALLOWED_DOMAINS = ["willamette.edu"];

function isEmailAllowed(email: string): boolean {
    const normalized = email.toLowerCase().trim();
    if (ALLOWED_EMAILS.includes(normalized)) return true;
    const domain = normalized.split("@")[1];
    return ALLOWED_DOMAINS.includes(domain);
}

export async function login(
    _prevState: { error: string | null },
    formData: FormData
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!isEmailAllowed(email)) {
        return { error: "Only willamette.edu email addresses are allowed." };
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: "Invalid email or password." };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}

export async function signup(
    _prevState: { error: string | null },
    formData: FormData
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;

    if (!isEmailAllowed(email)) {
        return { error: "Only willamette.edu email addresses are allowed." };
    }
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

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
                full_name: fullName,
            }
        },
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/", "layout");
    redirect("/verify-email");
}
