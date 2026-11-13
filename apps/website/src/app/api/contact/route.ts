import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCapiLead } from "@/lib/analytics/meta-capi";
import { vnPhoneToE164 } from "@/lib/analytics/events";
import { CONTACT_SERVICES, EMAIL_RE } from "@/lib/contact/validate";
import { createContactLimiter } from "@/lib/contact/rate-limit";

// Server-side limits. The two forms that post here (contact page, EB-3
// screening) send far less; anything beyond these is junk or abuse, and every
// field is stored and emailed as-is.
const MAX = { name: 200, email: 254, phone: 40, handle: 200, message: 5000, tracking: 500 };
const SERVICE_TYPES = new Set<string>([...CONTACT_SERVICES, "eb3"]);

/** Optional text: missing → "", a non-string → null (invalid). */
function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : null;
}

/** Tracking values come from the URL and cookies: keep them, cut to size. */
function trackingText(value: unknown): string | null {
  return typeof value === "string" && value ? value.slice(0, MAX.tracking) : null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 5 per IP per minute; shared across instances when Upstash is configured.
const limiter = createContactLimiter();

export async function POST(request: Request) {
  try {
    const xff = request.headers.get("x-forwarded-for") || "";
    const clientIp = xff.split(",")[0]?.trim() || "unknown";
    if (!(await limiter.allow(clientIp))) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();

    const {
      full_name,
      phone,
      email,
      service_type,
      message,
      facebook,
      zalo,
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

    // Facebook/Zalo are free-text handles (EB-3 leads in Vietnam often have no
    // US phone or email). No dedicated columns — they're prepended to message.
    const facebookHandle = typeof facebook === "string" ? facebook.replace(/\s+/g, " ").trim() : "";
    const zaloHandle = typeof zalo === "string" ? zalo.replace(/\s+/g, " ").trim() : "";

    const nameText = optionalText(full_name);
    const emailText = optionalText(email);
    const phoneText = optionalText(phone);
    const messageText = optionalText(message);
    const serviceText = optionalText(service_type);
    if (
      nameText === null || nameText.trim().length > MAX.name ||
      emailText === null || emailText.trim().length > MAX.email ||
      (emailText.trim() !== "" && !EMAIL_RE.test(emailText.trim())) ||
      phoneText === null || phoneText.trim().length > MAX.phone ||
      messageText === null || messageText.length > MAX.message ||
      serviceText === null || (serviceText !== "" && !SERVICE_TYPES.has(serviceText)) ||
      facebookHandle.length > MAX.handle || zaloHandle.length > MAX.handle
    ) {
      return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    }
    const name = nameText.trim();
    const emailValue = emailText.trim();
    const phoneValue = phoneText.trim();
    const lang = locale === "vi" ? "vi" : "en";

    // Validation
    if (!name || (!emailValue && !phoneValue && !facebookHandle && !zaloHandle)) {
      return NextResponse.json(
        { error: "Name and a contact method are required." },
        { status: 400 }
      );
    }

    const fullMessage =
      [
        facebookHandle && `Facebook: ${facebookHandle}`,
        zaloHandle && `Zalo: ${zaloHandle}`,
        messageText,
      ]
        .filter(Boolean)
        .join("\n") || null;

    // 1. Insert into Supabase (if configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: dbError } = await supabase
        .from("contact_submissions")
        .insert({
          full_name: name,
          phone: phoneValue || null,
          email: emailValue || null,
          service_type: serviceText || null,
          message: fullMessage,
          locale: lang,
          utm_source: trackingText(utm_source),
          utm_medium: trackingText(utm_medium),
          utm_campaign: trackingText(utm_campaign),
          utm_content: trackingText(utm_content),
          utm_term: trackingText(utm_term),
          fbclid: trackingText(fbclid),
          gclid: trackingText(gclid),
          status: "new",
          user_agent: request.headers.get("user-agent")?.slice(0, MAX.tracking) || null,
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
          subject: `[MannaOS] New Contact: ${name.slice(0, 100)} — ${(serviceText || "General").slice(0, 50)}`,
          html: `
            <h2>New Contact Submission</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phoneValue || "N/A")}</p>
            <p><strong>Email:</strong> ${escapeHtml(emailValue || "N/A")}</p>
            <p><strong>Service:</strong> ${escapeHtml(serviceText || "General")}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space:pre-line">${escapeHtml(fullMessage || "N/A")}</p>
            <hr/>
            <p><small>Language: ${escapeHtml(lang)} | Source: ${escapeHtml(trackingText(utm_source) || "direct")} | Campaign: ${escapeHtml(trackingText(utm_campaign) || "none")}</small></p>
          `,
        });
      } catch (emailError) {
        console.error("Resend email error:", emailError);
      }
    }

    // 3. Mirror Lead to Meta CAPI (deduped with browser Pixel via shared event_id)
    const eventId = trackingText(event_id);
    if (eventId) {
      const [firstName, ...rest] = name.split(/\s+/);
      const lastName = rest.join(" ");
      const source = trackingText(utm_source);
      const campaign = trackingText(utm_campaign);
      // A Zalo handle that is a phone number is a Vietnamese number (the
      // EB-3 form only sends Zalo for leads in Vietnam): pass it as +84 so
      // Meta can match the lead.
      const zaloPhone = zaloHandle ? vnPhoneToE164(zaloHandle) : null;
      const phones = [phoneValue, zaloPhone].filter((p): p is string => !!p);
      await sendCapiLead({
        eventId,
        eventSourceUrl: trackingText(event_source_url) || "",
        user: {
          emails: emailValue ? [emailValue] : undefined,
          phones: phones.length ? phones : undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          clientIp: clientIp === "unknown" ? null : clientIp,
          clientUserAgent: request.headers.get("user-agent"),
          fbp: trackingText(fbp),
          fbc: trackingText(fbc),
        },
        customData: {
          content_name: serviceText || "general",
          locale: lang,
          ...(source ? { utm_source: source } : {}),
          ...(campaign ? { utm_campaign: campaign } : {}),
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
