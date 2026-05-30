"use client";

import { useState, useEffect, useCallback, type ComponentType } from "react";
import {
  Save, CheckCircle, Type, Image as ImageIcon, LayoutGrid, DollarSign, ChevronUp, ChevronDown, Trash2, Plus, Info,
  Globe, ShieldCheck, Award, Stamp, Star, Heart, Briefcase, Users, FileText, BadgeCheck, Scale, Building, TrendingUp, Handshake, Zap, Clock, MapPin
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Lucide icon components share this prop shape; ComponentType keeps
// SECTIONS[].icon strongly typed without dragging in the full lucide
// type surface.
type LucideIcon = ComponentType<{ className?: string }>;

// Trust badge editor row.
interface TrustBadge {
  id: string;
  icon?: string;
  title: string;
  desc: string;
}

// Service catalog row used by ServiceCategoryPanel. `price` is optional
// because the "What We Offer" panel hides the column.
interface ServiceItem {
  id?: string;
  name?: string;
  price?: string;
  [k: string]: unknown;
}

// site_content row payload. The shape is intentionally loose — the
// admin form accumulates whatever keys exist for the active section
// (homepage / about / services), and we ship them back to the DB
// verbatim. unknown beats any here because it forces consumers to
// narrow before use.
type ContentRecord = Record<string, unknown>;

// Read an array-of-ServiceItem field off the loose ContentRecord with a
// safe-default fallback. Centralizes the cast so individual call sites
// stay readable.
function readServiceItems(content: ContentRecord, key: string, fallback: ServiceItem[] = []): ServiceItem[] {
  const v = content[key];
  return Array.isArray(v) ? (v as ServiceItem[]) : fallback;
}

// Read a string field off the loose ContentRecord. Anything non-string
// (including unset) returns the empty default. Mirrors the `|| ""`
// coercion the original code did inline, just type-safely.
function readString(content: ContentRecord, key: string, fallback = ""): string {
  const v = content[key];
  return typeof v === "string" ? v : fallback;
}

// Read a TrustBadge[] field with default fallback. Centralizes the
// cast-with-fallback pattern that the trust_badges editor uses in 6
// different places (badge add/remove + edit-icon/title/desc).
function readTrustBadges(content: ContentRecord): TrustBadge[] {
  const v = content.trust_badges;
  return Array.isArray(v) ? (v as TrustBadge[]) : DEFAULT_TRUST_BADGES;
}
import {
  updateServiceContentDescription,
  type ServiceContent,
  type ServiceLocale,
  type ServiceSlug,
} from "@/lib/services/service-content";

type ContentSection = "homepage" | "about" | "services";

const SECTIONS: { key: ContentSection; label: string; icon: LucideIcon }[] = [
  { key: "homepage", label: "Home", icon: Type },
  { key: "about", label: "About", icon: ImageIcon },
  { key: "services", label: "Services", icon: LayoutGrid },
];

const ICON_OPTIONS = [
  { name: "Globe", icon: Globe },
  { name: "ShieldCheck", icon: ShieldCheck },
  { name: "Award", icon: Award },
  { name: "Stamp", icon: Stamp },
  { name: "CheckCircle", icon: CheckCircle },
  { name: "Star", icon: Star },
  { name: "Heart", icon: Heart },
  { name: "Briefcase", icon: Briefcase },
  { name: "Users", icon: Users },
  { name: "FileText", icon: FileText },
  { name: "BadgeCheck", icon: BadgeCheck },
  { name: "Scale", icon: Scale },
  { name: "Building", icon: Building },
  { name: "TrendingUp", icon: TrendingUp },
  { name: "Handshake", icon: Handshake },
  { name: "Zap", icon: Zap },
  { name: "DollarSign", icon: DollarSign },
  { name: "Clock", icon: Clock },
  { name: "MapPin", icon: MapPin },
];

const DEFAULT_TRUST_BADGES = [
  { id: "1", title: "Bilingual Service (VI/EN)", desc: "Native Vietnamese speaker — no language barrier, no miscommunication" },
  { id: "2", title: "IRS EFIN Licensed #857993", desc: "IRS-authorized electronic filer — verified credential for tax services" },
  { id: "3", title: "TX Life & P&C Insurance Licensed", desc: "Texas-licensed Life & Property/Casualty insurance agent." },
  { id: "4", title: "Texas Notary Public (Pending)", desc: "In-house signature witnessing for USCIS forms — a core trust differentiator" }
];

const DEFAULT_TAX_OFFERINGS = [
  { id: "1", name: "Individual Tax Preparation" },
  { id: "2", name: "Extension Filing (Form 4868)" },
  { id: "3", name: "Business Tax (LLC/S-Corp)" },
  { id: "4", name: "LLC Setup (Full Package)" }
];

const DEFAULT_TAX_SERVICES = [
  { id: "1", name: "Extension Filing (Form 4868)", price: "$50 – $75" },
  { id: "2", name: "Individual Tax (Simple)", price: "$150 – $250" },
  { id: "3", name: "Individual Tax (Complex)", price: "$250 – $400" },
  { id: "4", name: "Business Tax (LLC/S-Corp)", price: "$400 – $800" },
  { id: "5", name: "LLC Setup (Full Package)", price: "$300 – $500 + state fee" }
];

const DEFAULT_INSURANCE_OFFERINGS = [
  { id: "1", name: "Life Insurance" },
  { id: "2", name: "Annuity Plans" },
  { id: "3", name: "Retirement Planning" }
];

const DEFAULT_IMMIGRATION_OFFERINGS = [
  { id: "1", name: "N-400 Citizenship Application" },
  { id: "2", name: "Green Card Applications" },
  { id: "3", name: "Visa Renewal" },
  { id: "4", name: "Immigration Consultation" }
];

const DEFAULT_AI_OFFERINGS = [
  { id: "1", name: "Workflow Automation" },
  { id: "2", name: "AI Tools for SMBs" },
  { id: "3", name: "Business Digitization" },
  { id: "4", name: "Monthly Retainer Support" }
];

const SERVICE_CONTENT_CONFIG: Array<{
  slug: ServiceSlug;
  title: string;
  cardSummary: { en: string; vi: string };
  detailIntro: { en: string; vi: string };
}> = [
  {
    slug: "tax",
    title: "Tax & Business",
    cardSummary: {
      en: "Tax preparation, extension filing, LLC setup, and full business registration services.",
      vi: "Khai thuế, gia hạn nộp thuế, thành lập LLC và dịch vụ đăng ký kinh doanh đầy đủ.",
    },
    detailIntro: {
      en: "Professional tax preparation, business registration, and compliance services for individuals and businesses.",
      vi: "Dịch vụ khai thuế, đăng ký kinh doanh và tuân thủ hồ sơ chuyên nghiệp cho cá nhân và doanh nghiệp.",
    },
  },
  {
    slug: "insurance",
    title: "Insurance & Finance",
    cardSummary: {
      en: "Life insurance, annuity, and retirement planning to protect your family's future.",
      vi: "Bảo hiểm nhân thọ, niên kim và lập kế hoạch hưu trí để bảo vệ tương lai gia đình bạn.",
    },
    detailIntro: {
      en: "Protect your family and secure your financial future with our licensed insurance services.",
      vi: "Bảo vệ gia đình và xây dựng tương lai tài chính vững chắc với dịch vụ bảo hiểm có giấy phép.",
    },
  },
  {
    slug: "immigration",
    title: "Immigration",
    cardSummary: {
      en: "N-400 citizenship, green card, visa renewal, and expert immigration consultation.",
      vi: "Quốc tịch N-400, thẻ xanh, gia hạn visa và tư vấn di trú chuyên nghiệp.",
    },
    detailIntro: {
      en: "Professional Vietnamese-language USCIS document preparation and consultation services. Bilingual support to help you navigate your immigration journey with confidence.",
      vi: "Dịch vụ chuẩn bị hồ sơ USCIS và tư vấn di trú bằng tiếng Việt. Hỗ trợ song ngữ để bạn tự tin trong hành trình di trú.",
    },
  },
  {
    slug: "ai",
    title: "AI / Automation",
    cardSummary: {
      en: "Workflow automation, AI tools for small businesses, and digital transformation.",
      vi: "Tự động hóa quy trình, công cụ AI cho doanh nghiệp nhỏ và chuyển đổi số.",
    },
    detailIntro: {
      en: "Workflow automation, AI tools for small businesses, and digital transformation.",
      vi: "Tự động hóa quy trình, công cụ AI cho doanh nghiệp nhỏ và chuyển đổi số.",
    },
  },
];

export default function AdminContent() {
  const [activeSection, setActiveSection] = useState<ContentSection>("homepage");
  const [content, setContent] = useState<ContentRecord>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const fetchPromise = supabase.from("site_content").select("*").eq("section", activeSection).single();
      // 5 second timeout to prevent infinite spinning if Safari network stack hangs on tab resume
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 5000)
      );
      
      const { data } = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (data) {
        setContent(typeof data.content === "string" ? JSON.parse(data.content) : data.content || {});
      } else {
        setContent({});
      }
    } catch (err) {
      console.error(err);
      setContent({});
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: activeSection, content }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Save failed (${res.status})`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save error:", err);
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const updateField = (key: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const updateServiceDescription = (
    service: ServiceSlug,
    group: "card_summary" | "detail_intro",
    locale: ServiceLocale,
    value: string,
  ) => {
    const next = updateServiceContentDescription(
      content.service_content as ServiceContent | undefined,
      service,
      group,
      locale,
      value,
    );
    updateField("service_content", next);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal mb-1">Content Editor</h1>
          <p className="text-sm text-muted-foreground">Edit homepage, about page, and service pricing.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" /> Saved!
            </span>
          )}
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
              activeSection === key 
                ? "bg-slate-50 border-slate-200 text-charcoal shadow-sm" 
                : "bg-transparent border-transparent text-muted-foreground hover:bg-slate-50 hover:border-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {activeSection === "homepage" && (
            <>
              {/* Hero Banner Card */}
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-slate-50/50">
                  <h2 className="text-base font-bold text-charcoal">Hero Banner</h2>
                </div>
                <div className="p-6 space-y-4">
                  <ContentField label="Headline (English)" value={readString(content, "hero_headline_en") || readString(content, "hero_headline")} onChange={(v) => updateField("hero_headline_en", v)} />
                  <ContentField label="Headline (Vietnamese)" value={readString(content, "hero_headline_vi")} onChange={(v) => updateField("hero_headline_vi", v)} />
                  <ContentField label="Sub-headline (English)" value={readString(content, "hero_sub_en") || readString(content, "hero_subtitle")} onChange={(v) => updateField("hero_sub_en", v)} multiline />
                  <ContentField label="Sub-headline (Vietnamese)" value={readString(content, "hero_sub_vi")} onChange={(v) => updateField("hero_sub_vi", v)} multiline />
                  <ContentField label="Hero Background Image URL" value={readString(content, "hero_bg_image")} onChange={(v) => updateField("hero_bg_image", v)} />
                  {readString(content, "hero_bg_image") && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-border h-48 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={readString(content, "hero_bg_image")} alt="Hero preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Trust Badges Card */}
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-slate-50/50 flex justify-between items-center">
                  <h2 className="text-base font-bold text-charcoal">Why Manna — Trust Badges</h2>
                  <button
                    onClick={() => {
                      const current = readTrustBadges(content);
                      updateField("trust_badges", [...current, { id: Date.now().toString(), title: "New Badge", desc: "Badge description" }]);
                    }}
                    className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Badge
                  </button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  {readTrustBadges(content).map((b: TrustBadge, idx: number) => {
                    const SelectedIcon = ICON_OPTIONS.find((o) => o.name === (b.icon || "CheckCircle"))?.icon || CheckCircle;
                    return (
                      <div key={b.id || idx} className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-slate-50 relative group">
                        <button
                          onClick={() => {
                            const newBadges = readTrustBadges(content).filter(
                              (_: TrustBadge, i: number) => i !== idx,
                            );
                            updateField("trust_badges", newBadges);
                          }}
                          className="absolute top-2 right-2 p-2 text-red-500 hover:bg-red-50 rounded-md md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          title="Delete Badge"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-3 pr-10">
                          <div className="p-2 rounded-md bg-white border border-border shadow-sm flex items-center justify-center w-10 h-10">
                            <SelectedIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Icon</label>
                            <select
                              value={b.icon || "CheckCircle"}
                              onChange={(e) => {
                                const newBadges = [...readTrustBadges(content)];
                                newBadges[idx] = { ...newBadges[idx], icon: e.target.value };
                                updateField("trust_badges", newBadges);
                              }}
                              className="w-full rounded-md border border-input bg-white px-3 py-1.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              {ICON_OPTIONS.map((opt) => (
                                <option key={opt.name} value={opt.name}>{opt.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <ContentField
                          label={`Badge ${idx + 1} Title`}
                          value={b.title || ""}
                          onChange={(v) => {
                            const newBadges = [...readTrustBadges(content)];
                            newBadges[idx] = { ...newBadges[idx], title: v };
                            updateField("trust_badges", newBadges);
                          }}
                        />
                        <ContentField
                          label="Description"
                          value={b.desc || ""}
                          onChange={(v) => {
                            const newBadges = [...readTrustBadges(content)];
                            newBadges[idx] = { ...newBadges[idx], desc: v };
                            updateField("trust_badges", newBadges);
                          }}
                          multiline
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeSection === "about" && (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-slate-50/50">
                <h2 className="text-base font-bold text-charcoal">About Page</h2>
              </div>
              <div className="p-6 space-y-4">
                <ContentField label="Page Title (English)" value={readString(content, "about_title_en")} onChange={(v) => updateField("about_title_en", v)} />
                <ContentField label="Page Title (Vietnamese)" value={readString(content, "about_title_vi")} onChange={(v) => updateField("about_title_vi", v)} />
                <ContentField label="Bio / Mission (English)" value={readString(content, "about_mission_en") || readString(content, "mission")} onChange={(v) => updateField("about_mission_en", v)} multiline />
                <ContentField label="Bio / Mission (Vietnamese)" value={readString(content, "about_mission_vi")} onChange={(v) => updateField("about_mission_vi", v)} multiline />
                <ContentField label="Office / Founder Photo URL" value={readString(content, "about_photo")} onChange={(v) => updateField("about_photo", v)} />
                {readString(content, "about_photo") && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border h-48 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={readString(content, "about_photo")} alt="Office preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "services" && (
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground">Manage your service offerings and detailed pricing. Use &ldquo;What We Offer&rdquo; to build the top list of services on the page, and &ldquo;Pricing&rdquo; to build the detailed cost breakdown table.</p>
              
              <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-xl font-bold text-charcoal">Tax & Business</h2>
                <ServiceContentFields
                  service={SERVICE_CONTENT_CONFIG.find((service) => service.slug === "tax")!}
                  serviceContent={content.service_content as ServiceContent | undefined}
                  onChange={updateServiceDescription}
                />
                <ServiceCategoryPanel
                  title="What We Offer (Top List)"
                  items={readServiceItems(content, "tax_offerings", DEFAULT_TAX_OFFERINGS)}
                  onChange={(items) => updateField("tax_offerings", items)}
                  headerColor="bg-slate-100"
                  borderColor="border-slate-200"
                  hasPrice={false}
                />
                <ServiceCategoryPanel
                  title="Pricing (Bottom Table)"
                  items={readServiceItems(content, "tax_services", DEFAULT_TAX_SERVICES)}
                  onChange={(items) => updateField("tax_services", items)}
                  headerColor="bg-amber-100/50"
                  borderColor="border-amber-200"
                />
              </div>

              <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-xl font-bold text-charcoal">Insurance & Finance</h2>
                <ServiceContentFields
                  service={SERVICE_CONTENT_CONFIG.find((service) => service.slug === "insurance")!}
                  serviceContent={content.service_content as ServiceContent | undefined}
                  onChange={updateServiceDescription}
                />
                <ServiceCategoryPanel
                  title="What We Offer (Top List)"
                  items={readServiceItems(content, "insurance_offerings", DEFAULT_INSURANCE_OFFERINGS)}
                  onChange={(items) => updateField("insurance_offerings", items)}
                  headerColor="bg-slate-100"
                  borderColor="border-slate-200"
                  hasPrice={false}
                />
                <ServiceCategoryPanel
                  title="Pricing (Bottom Table)"
                  items={readServiceItems(content, "insurance_services")}
                  onChange={(items) => updateField("insurance_services", items)}
                  headerColor="bg-blue-100/50"
                  borderColor="border-blue-200"
                />
              </div>

              <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-xl font-bold text-charcoal">Immigration</h2>
                <ServiceContentFields
                  service={SERVICE_CONTENT_CONFIG.find((service) => service.slug === "immigration")!}
                  serviceContent={content.service_content as ServiceContent | undefined}
                  onChange={updateServiceDescription}
                />
                <ServiceCategoryPanel
                  title="What We Offer (Top List)"
                  items={readServiceItems(content, "immigration_offerings", DEFAULT_IMMIGRATION_OFFERINGS)}
                  onChange={(items) => updateField("immigration_offerings", items)}
                  headerColor="bg-slate-100"
                  borderColor="border-slate-200"
                  hasPrice={false}
                />
                <ServiceCategoryPanel
                  title="Other Pricing (Bottom Table)"
                  items={readServiceItems(content, "immigration_services")}
                  onChange={(items) => updateField("immigration_services", items)}
                  headerColor="bg-green-100/50"
                  borderColor="border-green-200"
                />
              </div>

              <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-xl font-bold text-charcoal">AI / Automation</h2>
                <ServiceContentFields
                  service={SERVICE_CONTENT_CONFIG.find((service) => service.slug === "ai")!}
                  serviceContent={content.service_content as ServiceContent | undefined}
                  onChange={updateServiceDescription}
                />
                <ServiceCategoryPanel
                  title="What We Offer (Top List)"
                  items={readServiceItems(content, "ai_offerings", DEFAULT_AI_OFFERINGS)}
                  onChange={(items) => updateField("ai_offerings", items)}
                  headerColor="bg-slate-100"
                  borderColor="border-slate-200"
                  hasPrice={false}
                />
                <ServiceCategoryPanel
                  title="Pricing (Bottom Table)"
                  items={readServiceItems(content, "ai_services")}
                  onChange={(items) => updateField("ai_services", items)}
                  headerColor="bg-purple-100/50"
                  borderColor="border-purple-200"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-primary mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      )}
    </div>
  );
}

function ServiceContentFields({
  service,
  serviceContent,
  onChange,
}: {
  service: (typeof SERVICE_CONTENT_CONFIG)[number];
  serviceContent?: ServiceContent;
  onChange: (
    service: ServiceSlug,
    group: "card_summary" | "detail_intro",
    locale: ServiceLocale,
    value: string,
  ) => void;
}) {
  const cardEn = serviceContent?.[service.slug]?.card_summary?.description?.en ?? service.cardSummary.en;
  const cardVi = serviceContent?.[service.slug]?.card_summary?.description?.vi ?? service.cardSummary.vi;
  const introEn = serviceContent?.[service.slug]?.detail_intro?.description?.en ?? service.detailIntro.en;
  const introVi = serviceContent?.[service.slug]?.detail_intro?.description?.vi ?? service.detailIntro.vi;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-charcoal">Card Summary (Homepage + Services Page)</h3>
          <p className="text-xs text-muted-foreground mt-1">Shown in the four service cards on the homepage and /services.</p>
        </div>
        <ContentField label="Description (English)" value={cardEn} onChange={(v) => onChange(service.slug, "card_summary", "en", v)} multiline />
        <ContentField label="Description (Vietnamese)" value={cardVi} onChange={(v) => onChange(service.slug, "card_summary", "vi", v)} multiline />
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-charcoal">Service Detail Intro</h3>
          <p className="text-xs text-muted-foreground mt-1">Shown at the top of this service detail page only.</p>
        </div>
        <ContentField label="Description (English)" value={introEn} onChange={(v) => onChange(service.slug, "detail_intro", "en", v)} multiline />
        <ContentField label="Description (Vietnamese)" value={introVi} onChange={(v) => onChange(service.slug, "detail_intro", "vi", v)} multiline />
      </div>
    </div>
  );
}

function ServiceCategoryPanel({ title, items, onChange, headerColor, borderColor, hasPrice = true }: { title: string; items: ServiceItem[]; onChange: (items: ServiceItem[]) => void; headerColor: string; borderColor: string; hasPrice?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const moveItem = (index: number, dir: number) => {
    if (index + dir < 0 || index + dir >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + dir];
    newItems[index + dir] = temp;
    onChange(newItems);
  };

  const updateItem = (index: number, key: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, { id: Date.now().toString(), name: "", ...(hasPrice ? { price: "" } : {}) }]);
    setIsOpen(true);
  };

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden bg-white`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-6 py-4 ${headerColor} transition-colors`}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-charcoal">{title}</span>
          <span className="text-xs text-muted-foreground">({items.length} items)</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-3 border-t border-border bg-slate-50/30">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex flex-col gap-1 px-1">
                <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-charcoal disabled:opacity-30">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="text-muted-foreground hover:text-charcoal disabled:opacity-30">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <input 
                type="text" 
                placeholder="Name" 
                value={item.name} 
                onChange={(e) => updateItem(index, "name", e.target.value)}
                className="flex-1 h-10 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
              />
              {hasPrice && (
                <input 
                  type="text" 
                  placeholder="Price / Desc" 
                  value={item.price || ""} 
                  onChange={(e) => updateItem(index, "price", e.target.value)}
                  className="w-48 h-10 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
                />
              )}
              <button onClick={() => removeItem(index)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button 
            onClick={addItem}
            className="w-full flex items-center justify-center gap-2 py-3 mt-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors bg-white"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>
      )}
    </div>
  );
}
