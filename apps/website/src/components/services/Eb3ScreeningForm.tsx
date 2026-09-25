"use client";

import { useState } from "react";
import { CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateEventId, trackFbq, trackGa } from "@/lib/analytics/events";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import {
  buildEb3Payload,
  EB3_CHILDREN_MAX,
  EB3_NOTES_MAX,
  emptyEb3Answers,
  validateEb3,
  type Eb3Answers,
  type Eb3ErrorCode,
  type Eb3Errors,
  type Eb3Field,
  type Eb3Location,
} from "@/lib/services/eb3-screening";
import Eb3MessengerButton from "./Eb3MessengerButton";

type FormCopy = Dictionary["eb3"]["form"];

const SELECT_CLASS =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const LABEL_CLASS = "block text-sm font-medium text-charcoal mb-1.5";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function Eb3ScreeningForm({ copy, locale }: { copy: FormCopy; locale: Locale }) {
  const [answers, setAnswers] = useState<Eb3Answers>(emptyEb3Answers);
  const [errors, setErrors] = useState<Eb3Errors>({});
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends Eb3Field>(field: K, value: Eb3Answers[K]) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Clear the other location's fields so stale values are never submitted.
  const setLocation = (location: Eb3Location) => {
    setAnswers((prev) =>
      location === "vn"
        ? { ...prev, location, phone: "", us_status: "" }
        : { ...prev, location, zalo: "" },
    );
    setErrors((prev) => ({ ...prev, location: undefined, phone: undefined, us_status: undefined, facebook: undefined }));
  };

  const errorText = (code: Eb3ErrorCode | undefined) =>
    code === "required" ? copy.error_required : code === "invalid" ? copy.error_invalid : null;

  const fieldError = (field: Eb3Field) => {
    const text = errorText(errors[field]);
    return text ? <p className="text-xs text-red-600 mt-1">{text}</p> : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(false);

    const result = validateEb3(answers);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const eventId = generateEventId();
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildEb3Payload(answers),
          email: "",
          locale,
          utm_source: params.get("utm_source") || "",
          utm_medium: params.get("utm_medium") || "",
          utm_campaign: params.get("utm_campaign") || "",
          utm_content: params.get("utm_content") || "",
          utm_term: params.get("utm_term") || "",
          fbclid: params.get("fbclid") || "",
          gclid: params.get("gclid") || "",
          event_id: eventId,
          event_source_url: window.location.href,
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc"),
          website: honeypot,
        }),
      });

      if (!res.ok) {
        setSubmitError(true);
        return;
      }
      trackFbq("Lead", { content_name: "eb3" }, eventId);
      trackGa("generate_lead", { service: "eb3", locale });
      setSubmitted(true);
    } catch {
      setSubmitError(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <p className="text-charcoal font-semibold text-lg mb-1">{copy.success_title}</p>
        <p className="text-muted-foreground text-sm mb-6">{copy.success_desc}</p>
        <Eb3MessengerButton label={copy.success_cta} />
      </div>
    );
  }

  const inVn = answers.location === "vn";
  const inUs = answers.location === "us";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div>
        <label className={LABEL_CLASS} htmlFor="eb3-name">{copy.full_name}</label>
        <Input id="eb3-name" value={answers.full_name} onChange={(e) => set("full_name", e.target.value)} className="rounded-lg" />
        {fieldError("full_name")}
      </div>

      <fieldset>
        <legend className={LABEL_CLASS}>{copy.location}</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["vn", "us"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocation(loc)}
              aria-pressed={answers.location === loc}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                answers.location === loc ? "border-primary bg-teal-light text-charcoal" : "border-input text-muted-foreground hover:border-primary/50"
              }`}
            >
              {loc === "vn" ? `🇻🇳 ${copy.location_vn}` : `🇺🇸 ${copy.location_us}`}
            </button>
          ))}
        </div>
        {fieldError("location")}
      </fieldset>

      {inVn && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="eb3-fb">{copy.facebook}</label>
            <Input id="eb3-fb" value={answers.facebook} onChange={(e) => set("facebook", e.target.value)} className="rounded-lg" />
            <p className="text-xs text-muted-foreground mt-1">{copy.facebook_hint}</p>
            {fieldError("facebook")}
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="eb3-zalo">{copy.zalo}</label>
            <Input id="eb3-zalo" inputMode="tel" value={answers.zalo} onChange={(e) => set("zalo", e.target.value)} className="rounded-lg" />
          </div>
        </div>
      )}

      {inUs && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS} htmlFor="eb3-phone">{copy.phone}</label>
              <Input id="eb3-phone" type="tel" inputMode="tel" value={answers.phone} onChange={(e) => set("phone", e.target.value)} className="rounded-lg" />
              {fieldError("phone")}
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="eb3-fb-us">{copy.facebook}</label>
              <Input id="eb3-fb-us" value={answers.facebook} onChange={(e) => set("facebook", e.target.value)} className="rounded-lg" />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="eb3-status">{copy.us_status}</label>
            <select
              id="eb3-status"
              value={answers.us_status}
              onChange={(e) => set("us_status", e.target.value as Eb3Answers["us_status"])}
              className={SELECT_CLASS}
            >
              <option value="">{copy.select_placeholder}</option>
              <option value="b1b2">{copy.us_status_b1b2}</option>
              <option value="f1">{copy.us_status_f1}</option>
              <option value="other_valid">{copy.us_status_other_valid}</option>
              <option value="expired">{copy.us_status_expired}</option>
              <option value="unknown">{copy.us_status_unknown}</option>
            </select>
            {fieldError("us_status")}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="eb3-year">{copy.birth_year}</label>
          <Input
            id="eb3-year"
            inputMode="numeric"
            maxLength={4}
            placeholder="1990"
            value={answers.birth_year}
            onChange={(e) => set("birth_year", e.target.value)}
            className="rounded-lg"
          />
          {fieldError("birth_year")}
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="eb3-english">{copy.english}</label>
          <select
            id="eb3-english"
            value={answers.english}
            onChange={(e) => set("english", e.target.value as Eb3Answers["english"])}
            className={SELECT_CLASS}
          >
            <option value="">{copy.select_placeholder}</option>
            <option value="none">{copy.english_none}</option>
            <option value="basic">{copy.english_basic}</option>
            <option value="conversational">{copy.english_conversational}</option>
          </select>
          {fieldError("english")}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <label className="flex items-center gap-2 text-sm text-charcoal h-9">
          <input type="checkbox" checked={answers.spouse} onChange={(e) => set("spouse", e.target.checked)} className="h-4 w-4 accent-primary" />
          {copy.spouse}
        </label>
        <div>
          <label className={LABEL_CLASS} htmlFor="eb3-children">{copy.children}</label>
          <select
            id="eb3-children"
            value={answers.children_under_21}
            onChange={(e) => set("children_under_21", Number(e.target.value))}
            className={SELECT_CLASS}
          >
            {Array.from({ length: EB3_CHILDREN_MAX + 1 }, (_, n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={LABEL_CLASS}>{copy.denial}</legend>
        <div className="flex gap-6">
          {([true, false] as const).map((v) => (
            <label key={String(v)} className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="radio"
                name="eb3-denial"
                checked={answers.prior_us_visa_denial === v}
                onChange={() => set("prior_us_visa_denial", v)}
                className="h-4 w-4 accent-primary"
              />
              {v ? copy.denial_yes : copy.denial_no}
            </label>
          ))}
        </div>
        {fieldError("prior_us_visa_denial")}
      </fieldset>

      <div>
        <label className={LABEL_CLASS} htmlFor="eb3-timeline">{copy.timeline}</label>
        <select
          id="eb3-timeline"
          value={answers.timeline}
          onChange={(e) => set("timeline", e.target.value as Eb3Answers["timeline"])}
          className={SELECT_CLASS}
        >
          <option value="">{copy.select_placeholder}</option>
          <option value="now">{copy.timeline_now}</option>
          <option value="3_6_months">{copy.timeline_3_6_months}</option>
          <option value="researching">{copy.timeline_researching}</option>
        </select>
        {fieldError("timeline")}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="eb3-notes">{copy.notes}</label>
        <Textarea
          id="eb3-notes"
          rows={3}
          maxLength={EB3_NOTES_MAX}
          value={answers.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="rounded-lg"
        />
        {fieldError("notes")}
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={answers.ack_not_law_firm}
            onChange={(e) => set("ack_not_law_firm", e.target.checked)}
            className="h-4 w-4 mt-0.5 accent-primary shrink-0"
          />
          {copy.ack}
        </label>
        {fieldError("ack_not_law_firm")}
      </div>

      {submitError && <p className="text-sm text-red-600">{copy.error_submit}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-teal-dark text-white rounded-full gap-2"
        size="lg"
      >
        <Send className="h-4 w-4" />
        {loading ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
