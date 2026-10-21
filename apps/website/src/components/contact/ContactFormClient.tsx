"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { generateEventId, trackFbq, trackGa } from "@/lib/analytics/events";
import {
  CONTACT_SERVICES,
  validateContact,
  type ContactError,
  type ContactErrors,
  type ContactFields,
} from "@/lib/contact/validate";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface ContactFormClientProps {
  dictionary: Dictionary;
  locale: Locale;
}

// Configured contact details (same values as the footer and Calendly CTA elsewhere).
const PHONE_DISPLAY = "346-852-4454";
const PHONE_TEL = "tel:3468524454";
const EMAIL = "Chris@mannaos.com";
const FACEBOOK_URL = "https://facebook.com/mannaonesolution";
const CALENDLY_URL = "https://calendly.com/mannaos";

const EMPTY: ContactFields = { full_name: "", phone: "", email: "", service_type: "", message: "" };
const FIELD_ORDER: (keyof ContactFields)[] = ["full_name", "phone", "email", "service_type", "message"];

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactFormClient({ dictionary, locale }: ContactFormClientProps) {
  const d = dictionary as unknown as Record<string, string>;
  const [form, setForm] = useState<ContactFields>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFields, boolean>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const errorText = (field: keyof ContactFields, e: ContactError) => {
    if (e === "email") return d.contact_err_email;
    if (e === "phone") return d.contact_err_phone;
    return field === "service_type" ? d.contact_err_service : d.contact_err_required;
  };

  const update = (field: keyof ContactFields, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    // Once a field has been left (or the form submitted), re-check it as the visitor types.
    if (touched[field]) setErrors((prev) => ({ ...prev, [field]: validateContact(next)[field] }));
  };

  const blur = (field: keyof ContactFields) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateContact(form)[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    const found = validateContact(form);
    setErrors(found);
    setTouched({ full_name: true, phone: true, email: true, service_type: true, message: true });
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setStatus("submitting");
    setSubmitError("");
    try {
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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          locale,
          ...utm,
          event_id: eventId,
          event_source_url: window.location.href,
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc"),
          website: honeypot.current?.value || "",
        }),
      });

      if (!res.ok) {
        setSubmitError(res.status === 429 ? d.contact_err_rate : d.contact_err_submit);
        setStatus("error");
        return;
      }

      trackFbq("Lead", { content_name: form.service_type || "general" }, eventId);
      trackGa("generate_lead", { service: form.service_type || "general", locale });
      setStatus("success");
    } catch {
      setSubmitError(d.contact_err_submit);
      setStatus("error");
    }
  };

  const resetForm = () => {
    setForm(EMPTY);
    setErrors({});
    setTouched({});
    setStatus("idle");
  };

  const handleCalendlyClick = () => {
    trackFbq("Schedule", { content_name: "calendly" });
    trackGa("schedule_click", { destination: "calendly" });
  };
  const handlePhoneClick = () => {
    trackFbq("Contact", { method: "phone" });
    trackGa("phone_click", { number: "3468524454" });
  };
  const handleEmailClick = () => {
    trackFbq("Contact", { method: "email" });
    trackGa("email_click", {});
  };
  const handleFacebookClick = () => {
    trackFbq("Contact", { method: "facebook" });
    trackGa("facebook_click", {});
  };

  const inputCls = (field: keyof ContactFields) =>
    `block w-full rounded-xl border bg-white px-4 text-base md:text-[15px] text-charcoal placeholder:text-muted-foreground/80 transition-colors focus:outline-none focus:ring-2 ${
      errors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
        : "border-border focus:border-primary focus:ring-primary/25"
    }`;

  const renderLabel = (field: keyof ContactFields, text: string, optional = false) => (
    <label htmlFor={`contact-${field}`} className="mb-1.5 block text-sm font-medium text-charcoal">
      {text}
      {optional ? (
        <span className="ml-1 font-normal text-muted-foreground">({d.contact_optional})</span>
      ) : (
        <>
          <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
          <span className="sr-only"> ({d.contact_required})</span>
        </>
      )}
    </label>
  );

  const renderError = (field: keyof ContactFields) =>
    errors[field] ? (
      <p id={`contact-${field}-error`} className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {errorText(field, errors[field]!)}
      </p>
    ) : null;

  const a11y = (field: keyof ContactFields) => ({
    id: `contact-${field}`,
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `contact-${field}-error` : undefined,
    onBlur: () => blur(field),
  });

  const submitting = status === "submitting";

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
      {/* Contact form */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8" aria-labelledby="contact-form-title">
        <div className="mb-6 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-light text-primary">
            <Mail className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 id="contact-form-title" className="text-xl font-bold text-charcoal sm:text-2xl">{dictionary.contact_form_title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d.contact_form_intro}</p>
          </div>
        </div>

        {status === "success" ? (
          <div role="status" className="rounded-xl bg-teal-light px-6 py-10 text-center">
            <CheckCircle className="mx-auto mb-4 h-14 w-14 text-primary" aria-hidden="true" />
            <p className="text-lg font-semibold text-charcoal">{dictionary.contact_form_success}</p>
            <button
              type="button"
              onClick={resetForm}
              className="mt-5 rounded-full border border-primary/30 bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {d.contact_send_another}
            </button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={submitting}>
            {/* Honeypot: real people never see or fill this. */}
            <input ref={honeypot} type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                {renderLabel("full_name", dictionary.contact_form_name)}
                <input
                  {...a11y("full_name")}
                  type="text"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  placeholder={d.contact_ph_name}
                  className={`${inputCls("full_name")} h-11`}
                />
                {renderError("full_name")}
              </div>
              <div>
                {renderLabel("phone", dictionary.contact_form_phone, true)}
                <input
                  {...a11y("phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder={d.contact_ph_phone}
                  className={`${inputCls("phone")} h-11`}
                />
                {renderError("phone")}
              </div>
              <div>
                {renderLabel("email", dictionary.contact_form_email)}
                <input
                  {...a11y("email")}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder={d.contact_ph_email}
                  className={`${inputCls("email")} h-11`}
                />
                {renderError("email")}
              </div>
              <div>
                {renderLabel("service_type", dictionary.contact_form_service)}
                <select
                  {...a11y("service_type")}
                  value={form.service_type}
                  onChange={(e) => update("service_type", e.target.value)}
                  className={`${inputCls("service_type")} h-11 ${form.service_type ? "" : "text-muted-foreground"}`}
                >
                  <option value="">{dictionary.contact_select_service}</option>
                  {CONTACT_SERVICES.map((s) => (
                    <option key={s} value={s} className="text-charcoal">{d[`contact_opt_${s}`]}</option>
                  ))}
                </select>
                {renderError("service_type")}
              </div>
            </div>

            <div>
              {renderLabel("message", dictionary.contact_form_message)}
              <textarea
                {...a11y("message")}
                rows={5}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder={d.contact_ph_message}
                className={`${inputCls("message")} resize-y py-3`}
              />
              {renderError("message")}
            </div>

            {status === "error" && (
              <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-teal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? d.contact_sending : dictionary.contact_form_submit}
            </button>

            <p className="flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {d.contact_privacy}{" "}
                <Link href={`/${locale}/privacy-policy`} className="underline hover:text-primary">{d.contact_privacy_link}</Link>
              </span>
            </p>
          </form>
        )}
      </section>

      {/* Sidebar */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-primary/20 bg-teal-light p-6" aria-labelledby="contact-book-title">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <Calendar className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 id="contact-book-title" className="text-xl font-bold text-charcoal">{dictionary.contact_book_title}</h2>
          <p className="mb-5 mt-2 text-sm leading-relaxed text-muted-foreground">{dictionary.contact_book_desc}</p>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCalendlyClick}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-teal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {dictionary.contact_book_btn}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{d.contact_new_tab}</span>
          </a>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm" aria-labelledby="contact-direct-title">
          <h2 id="contact-direct-title" className="mb-3 text-xl font-bold text-charcoal">{dictionary.contact_direct_title}</h2>
          <ul className="divide-y divide-border">
            <li>
              <ContactRow href={PHONE_TEL} onClick={handlePhoneClick} label={d.contact_label_phone} value={PHONE_DISPLAY} icon={<Phone className="h-4 w-4" aria-hidden="true" />} />
            </li>
            <li>
              <ContactRow href={`mailto:${EMAIL}`} onClick={handleEmailClick} label={d.contact_label_email} value={EMAIL} icon={<Mail className="h-4 w-4" aria-hidden="true" />} />
            </li>
            <li>
              <ContactRow
                href={FACEBOOK_URL}
                external
                newTabLabel={d.contact_new_tab}
                onClick={handleFacebookClick}
                label={d.contact_label_facebook}
                value="Manna One Solution"
                icon={<FacebookIcon className="h-4 w-4" />}
              />
            </li>
            <li>
              <ContactRow label={d.contact_label_location} value={dictionary.footer_houston} icon={<MapPin className="h-4 w-4" aria-hidden="true" />} />
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function ContactRow({
  href,
  external = false,
  newTabLabel,
  onClick,
  label,
  value,
  icon,
}: {
  href?: string;
  external?: boolean;
  newTabLabel?: string;
  onClick?: () => void;
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-light text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block break-words text-sm font-semibold text-charcoal">{value}</span>
      </span>
      {href && <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />}
    </>
  );
  if (!href) return <div className="flex items-center gap-3 py-3">{body}</div>;
  return (
    <a
      href={href}
      onClick={onClick}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-teal-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {body}
      {external && newTabLabel && <span className="sr-only">{newTabLabel}</span>}
    </a>
  );
}
