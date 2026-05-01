import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCapiLead } from "@/lib/analytics/meta-capi";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      full_name,
      phone,
      email,
      service_type,
      message,
      locale = "en",
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      fbclid,
      gclid,
      event_id,
      event_source_url,
      fbp,
      fbc,
      website, // honeypot
    } = body;

    // Honeypot check
    if (website) {
      return NextResponse.json({ success: true }); // Silently reject bots
    }

    // Validation
    if (!full_name || (!email && !phone)) {
      return NextResponse.json(
        { error: "Name and either email or phone are required." },
        { status: 400 }
      );
    }

    // 1. Insert into Supabase (if configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: dbError } = await supabase
        .from("contact_submissions")
        .insert({
          full_name,
          phone: phone || null,
          email: email || null,
          service_type: service_type || null,
          message: message || null,
          locale,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_content: utm_content || null,
          utm_term: utm_term || null,
          fbclid: fbclid || null,
          gclid: gclid || null,
          status: "new",
          user_agent: request.headers.get("user-agent") || null,
        });

      if (dbError) {
        console.error("Supabase insert error:", dbError);
      }
    }

    // 2. Send email via Resend (if configured)
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "MannaOS <notifications@mannaos.com>",
          to: ["Chris@mannaos.com"],
          subject: `[MannaOS] New Contact: ${String(full_name).slice(0, 100)} — ${String(service_type || "General").slice(0, 50)}`,
          html: `
            <h2>New Contact Submission</h2>
            <p><strong>Name:</strong> ${escapeHtml(full_name)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone || "N/A")}</p>
            <p><strong>Email:</strong> ${escapeHtml(email || "N/A")}</p>
            <p><strong>Service:</strong> ${escapeHtml(service_type || "General")}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message || "N/A")}</p>
            <hr/>
            <p><small>Language: ${escapeHtml(locale)} | Source: ${escapeHtml(utm_source || "direct")} | Campaign: ${escapeHtml(utm_campaign || "none")}</small></p>
          `,
        });
      } catch (emailError) {
        console.error("Resend email error:", emailError);
      }
    }

    // 3. Mirror Lead to Meta CAPI (deduped with browser Pixel via shared event_id)
    if (event_id) {
      const [firstName, ...rest] = (full_name || "").trim().split(/\s+/);
      const lastName = rest.join(" ");
      const xff = request.headers.get("x-forwarded-for") || "";
      const clientIp = xff.split(",")[0]?.trim() || null;
      await sendCapiLead({
        eventId: event_id,
        eventSourceUrl: event_source_url || "",
        user: {
          emails: email ? [email] : undefined,
          phones: phone ? [phone] : undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          clientIp,
          clientUserAgent: request.headers.get("user-agent"),
          fbp: fbp || null,
          fbc: fbc || null,
        },
        customData: {
          content_name: service_type || "general",
          locale,
          ...(utm_source ? { utm_source } : {}),
          ...(utm_campaign ? { utm_campaign } : {}),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
