import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const ALLOWED_SECTIONS = new Set(["homepage", "about", "services", "immigration_pricing"]);

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server misconfiguration: Supabase env vars missing" }, { status: 500 });
  }

  try {
    const { section, content } = await request.json();

    if (!section || !ALLOWED_SECTIONS.has(section) || typeof content !== "object" || content === null) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // API route — no need to forward refreshed cookies
          },
        },
      }
    );

    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error: upsertError } = await serviceClient
      .from("site_content")
      .upsert({ section, content }, { onConflict: "section" });

    if (upsertError) {
      console.error("site_content upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    revalidatePath("/", "layout");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Content save error:", err);
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
