"use client";

import { useState } from "react";
import { Phone, MapPin, Send, Calendar, CheckCircle } from "lucide-react";
import { generateEventId, trackFbq, trackGa } from "@/lib/analytics/events";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface ContactFormClientProps {
  dictionary: Dictionary;
  locale: Locale;
}

export default function ContactFormClient({ dictionary, locale }: ContactFormClientProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    service_type: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Capture UTM params from URL
      const params = new URLSearchParams(window.location.search);
      const utm = {
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
        utm_content: params.get("utm_content") || "",
        utm_term: params.get("utm_term") || "",
        fbclid: params.get("fbclid") || "",
        gclid: params.get("gclid") || "",
      };

      const eventId = generateEventId();
      const fbp = readCookie("_fbp");
      const fbc = readCookie("_fbc");

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          locale,
          ...utm,
          event_id: eventId,
          event_source_url: window.location.href,
          fbp,
          fbc,
        }),
      });

      if (res.ok) {
        trackFbq("Lead", { content_name: form.service_type || "general" }, eventId);
        trackGa("generate_lead", {
          service: form.service_type || "general",
          locale,
        });
        setSubmitted(true);
      }
    } catch {
      // Silently fail for now
    } finally {
      setLoading(false);
    }
  };

  const handleCalendlyClick = () => {
    trackFbq("Schedule", { content_name: "calendly" });
    trackGa("schedule_click", { destination: "calendly" });
  };

  const handlePhoneClick = () => {
    trackFbq("Contact", { method: "phone" });
    trackGa("phone_click", { number: "3468524454" });
  };

  const handleFacebookClick = () => {
    trackFbq("Contact", { method: "facebook" });
    trackGa("facebook_click", {});
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Contact Form */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-8 shadow-sm">
        <h2 className="text-xl font-bold text-charcoal mb-6">{dictionary.contact_form_title}</h2>

        {submitted ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-charcoal font-semibold text-lg">
              {dictionary.contact_form_success}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot */}
            <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  {dictionary.contact_form_name}
                </label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  {dictionary.contact_form_phone}
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  {dictionary.contact_form_email}
                </label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  {dictionary.contact_form_service}
                </label>
                <select
                  required
                  value={form.service_type}
                  onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">{dictionary.contact_select_service}</option>
                  <option value="tax">{dictionary.services_tax_title}</option>
                  <option value="insurance">{dictionary.services_insurance_title}</option>
                  <option value="immigration">{dictionary.services_immigration_title}</option>
                  <option value="ai">{dictionary.services_ai_title}</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                {dictionary.contact_form_message}
              </label>
              <Textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="rounded-lg"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-teal-dark text-white rounded-full gap-2"
              size="lg"
            >
              <Send className="h-4 w-4" />
              {loading ? "..." : dictionary.contact_form_submit}
            </Button>
          </form>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Book */}
        <div className="bg-teal-light rounded-2xl p-6 border border-primary/20">
          <Calendar className="h-8 w-8 text-primary mb-3" />
          <h3 className="font-bold text-charcoal text-lg mb-2">{dictionary.contact_book_title}</h3>
          <p className="text-muted-foreground text-sm mb-4">{dictionary.contact_book_desc}</p>
          <a
            href="https://calendly.com/mannaos"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCalendlyClick}
            className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-teal-dark text-white rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
          >
            <Calendar className="h-4 w-4" />
            {dictionary.contact_book_btn}
          </a>
        </div>

        {/* Direct Contact */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="font-bold text-charcoal text-lg mb-4">{dictionary.contact_direct_title}</h3>
          <div className="space-y-4">
            <a
              href="tel:3468524454"
              onClick={handlePhoneClick}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-light transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-charcoal font-semibold text-sm">346-852-4454</p>
              </div>
            </a>
            <a
              href="https://facebook.com/mannaonesolution"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleFacebookClick}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-light transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <FacebookIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Facebook</p>
                <p className="text-charcoal font-semibold text-sm">Manna One Solution</p>
              </div>
            </a>
            <div className="flex items-center gap-3 p-3 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-charcoal font-semibold text-sm">Houston, TX</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
