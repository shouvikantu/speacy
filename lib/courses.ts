import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generates a unique join code in the format XX-YYYY-ZZ
 * (8 alphanumeric characters with dashes for readability).
 */
export function generateJoinCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No ambiguous chars (0/O, 1/I/L)
    const pick = (n: number) =>
        Array.from({ length: n }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join("");

    return `${pick(2)}-${pick(4)}-${pick(2)}`;
}

/**
 * Validates a join code and returns the course if valid and joining is enabled.
 */
export async function validateJoinCode(
    supabase: SupabaseClient,
    code: string
): Promise<{
    valid: boolean;
    course?: { id: string; name: string; faculty_id: string };
    error?: string;
}> {
    const normalizedCode = code.trim().toUpperCase();

    const { data: course, error } = await supabase
        .from("courses")
        .select("id, name, faculty_id, joining_enabled")
        .eq("join_code", normalizedCode)
        .single();

    if (error || !course) {
        return { valid: false, error: "Invalid course code" };
    }

    if (!course.joining_enabled) {
        return { valid: false, error: "Course enrollment is currently disabled" };
    }

    return {
        valid: true,
        course: { id: course.id, name: course.name, faculty_id: course.faculty_id },
    };
}

/**
 * Ensures a generated join code is unique in the database.
 * Retries up to 5 times if collision detected.
 */
export async function generateUniqueJoinCode(
    supabase: SupabaseClient
): Promise<string> {
    for (let i = 0; i < 5; i++) {
        const code = generateJoinCode();
        const { data } = await supabase
            .from("courses")
            .select("id")
            .eq("join_code", code)
            .single();

        if (!data) return code; // No collision
    }
    // Extremely unlikely fallback
    throw new Error("Failed to generate unique join code after 5 attempts");
}
