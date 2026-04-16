"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ContentSection = "homepage" | "about" | "services" | "immigration_pricing";

const SECTIONS: { key: ContentSection; label: string }[] = [
  { key: "homepage", label: "Homepage" },
  { key: "about", label: "About Page" },
  { key: "services", label: "Services" },
  { key: "immigration_pricing", label: "Immigration Pricing" },
];

export default function AdminContent() {
  const [activeSection, setActiveSection] = useState<ContentSection>("homepage");
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("site_content").select("*").eq("section", activeSection).single();
    if (data) {
      setContent(typeof data.content === "string" ? JSON.parse(data.content) : data.content || {});
    } else {
      setContent({});
    }
    setLoading(false);
  }, [activeSection]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    const { data: existing } = await supabase
      .from("site_content")
      .select("id")
      .eq("section", activeSection)
      .single();

    if (existing) {
      await supabase.from("site_content").update({ content }).eq("id", existing.id);
    } else {
      await supabase.from("site_content").insert({ section: activeSection, content });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const updateField = (key: string, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-charcoal mb-6">Content Editor</h1>

      {/* Section Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 overflow-x-auto">
        {SECTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeSection === key ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="space-y-4">
            {activeSection === "homepage" && (
              <>
                <ContentField label="Hero Headline" value={content.hero_headline || ""} onChange={(v) => updateField("hero_headline", v)} />
                <ContentField label="Hero Subtitle" value={content.hero_subtitle || ""} onChange={(v) => updateField("hero_subtitle", v)} />
                <ContentField label="Hero Description" value={content.hero_description || ""} onChange={(v) => updateField("hero_description", v)} multiline />
                <ContentField label="CTA Button Text" value={content.cta_text || ""} onChange={(v) => updateField("cta_text", v)} />
              </>
            )}
            {activeSection === "about" && (
              <>
                <ContentField label="Mission" value={content.mission || ""} onChange={(v) => updateField("mission", v)} multiline />
                <ContentField label="Story" value={content.story || ""} onChange={(v) => updateField("story", v)} multiline />
                <ContentField label="Areas Served" value={content.areas || ""} onChange={(v) => updateField("areas", v)} />
              </>
            )}
            {activeSection === "services" && (
              <>
                <ContentField label="Tax Description" value={content.tax_desc || ""} onChange={(v) => updateField("tax_desc", v)} multiline />
                <ContentField label="Insurance Description" value={content.insurance_desc || ""} onChange={(v) => updateField("insurance_desc", v)} multiline />
                <ContentField label="Immigration Description" value={content.immigration_desc || ""} onChange={(v) => updateField("immigration_desc", v)} multiline />
                <ContentField label="AI Description" value={content.ai_desc || ""} onChange={(v) => updateField("ai_desc", v)} multiline />
              </>
            )}
            {activeSection === "immigration_pricing" && (
              <>
                <ContentField label="N-400 Price" value={content.n400_price || ""} onChange={(v) => updateField("n400_price", v)} />
                <ContentField label="Green Card Price" value={content.gc_price || ""} onChange={(v) => updateField("gc_price", v)} />
                <ContentField label="Visa Renewal Price" value={content.visa_price || ""} onChange={(v) => updateField("visa_price", v)} />
                <ContentField label="Consultation Price" value={content.consult_price || ""} onChange={(v) => updateField("consult_price", v)} />
              </>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" /> Saved!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ContentField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      )}
    </div>
  );
}
