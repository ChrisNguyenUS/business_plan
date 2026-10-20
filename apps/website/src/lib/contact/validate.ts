// Client-side checks for the general contact form. The API still applies its own
// rules (name + a contact method); these only give the visitor inline feedback.

/** Stored `service_type` values, in dropdown order. "general" is shown as "Other". */
export const CONTACT_SERVICES = ["immigration", "personal-documents", "tax", "business", "insurance", "ai", "general"] as const;

export interface ContactFields {
  full_name: string;
  phone: string;
  email: string;
  service_type: string;
  message: string;
}

export type ContactError = "required" | "email" | "phone";
export type ContactErrors = Partial<Record<keyof ContactFields, ContactError>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Digits plus the separators people actually type: + ( ) - . and spaces.
const PHONE_CHARS_RE = /^\+?[\d\s().-]+$/;

export function validateContact(f: ContactFields): ContactErrors {
  const errors: ContactErrors = {};
  if (!f.full_name.trim()) errors.full_name = "required";

  const email = f.email.trim();
  if (!email) errors.email = "required";
  else if (!EMAIL_RE.test(email)) errors.email = "email";

  const phone = f.phone.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    // E.164 allows up to 15 digits; 7 covers short local numbers.
    if (!PHONE_CHARS_RE.test(phone) || digits < 7 || digits > 15) errors.phone = "phone";
  }

  if (!(CONTACT_SERVICES as readonly string[]).includes(f.service_type)) errors.service_type = "required";
  if (!f.message.trim()) errors.message = "required";
  return errors;
}
