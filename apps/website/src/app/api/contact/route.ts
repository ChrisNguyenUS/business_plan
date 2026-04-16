import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Resend import - will be used when API key is configured
// import { Resend } from 'resend';

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
          subject: `[MannaOS] New Contact: ${full_name} — ${service_type || "General"}`,
          html: `
            <h2>New Contact Submission</h2>
            <p><strong>Name:</strong> ${full_name}</p>
            <p><strong>Phone:</strong> ${phone || "N/A"}</p>
            <p><strong>Email:</strong> ${email || "N/A"}</p>
            <p><strong>Service:</strong> ${service_type || "General"}</p>
            <p><strong>Message:</strong></p>
            <p>${message || "N/A"}</p>
            <hr/>
            <p><small>Language: ${locale} | Source: ${utm_source || "direct"} | Campaign: ${utm_campaign || "none"}</small></p>
          `,
        });
      } catch (emailError) {
        console.error("Resend email error:", emailError);
      }
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
