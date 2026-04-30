"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Save, CheckCircle, Type, Image as ImageIcon, LayoutGrid, DollarSign, ChevronUp, ChevronDown, Trash2, Plus, Info,
  Globe, ShieldCheck, Award, Stamp, Star, Heart, Briefcase, Users, FileText, BadgeCheck, Scale, Building, TrendingUp, Handshake, Zap, Clock, MapPin 
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ContentSection = "homepage" | "about" | "services";

const SECTIONS: { key: ContentSection; label: string; icon: any }[] = [
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

type ServiceItem = { id: string; name: string; price: string };

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

export default function AdminContent() {
  const [activeSection, setActiveSection] = useState<ContentSection>("homepage");
  const [content, setContent] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const fetchPromise = supabase.from("site_content").select("*").eq("section", activeSection).single();
      // 5 second timeout to prevent infinite spinning if Safari network stack hangs on tab resume
      const timeoutPromise = new Promise<{ data: null, error: any }>((resolve) => 
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

  const updateField = (key: string, value: any) => {
    setContent((prev) => ({ ...prev, [key]: value }));
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
                  <ContentField label="Headline (English)" value={content.hero_headline_en || content.hero_headline || ""} onChange={(v) => updateField("hero_headline_en", v)} />
                  <ContentField label="Headline (Vietnamese)" value={content.hero_headline_vi || ""} onChange={(v) => updateField("hero_headline_vi", v)} />
                  <ContentField label="Sub-headline (English)" value={content.hero_sub_en || content.hero_subtitle || ""} onChange={(v) => updateField("hero_sub_en", v)} multiline />
                  <ContentField label="Sub-headline (Vietnamese)" value={content.hero_sub_vi || ""} onChange={(v) => updateField("hero_sub_vi", v)} multiline />
                  <ContentField label="Hero Background Image URL" value={content.hero_bg_image || ""} onChange={(v) => updateField("hero_bg_image", v)} />
                  {content.hero_bg_image && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-border h-48 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={content.hero_bg_image} alt="Hero preview" className="w-full h-full object-cover" />
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
                      const current = content.trust_badges || DEFAULT_TRUST_BADGES;
                      updateField("trust_badges", [...current, { id: Date.now().toString(), title: "New Badge", desc: "Badge description" }]);
                    }}
                    className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Badge
                  </button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  {(content.trust_badges || DEFAULT_TRUST_BADGES).map((b: any, idx: number) => {
                    const SelectedIcon = ICON_OPTIONS.find((o) => o.name === (b.icon || "CheckCircle"))?.icon || CheckCircle;
                    return (
                      <div key={b.id || idx} className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-slate-50 relative group">
                        <button
                          onClick={() => {
                            const newBadges = (content.trust_badges || DEFAULT_TRUST_BADGES).filter((_: any, i: number) => i !== idx);
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
                                const newBadges = [...(content.trust_badges || DEFAULT_TRUST_BADGES)];
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
                            const newBadges = [...(content.trust_badges || DEFAULT_TRUST_BADGES)];
                            newBadges[idx] = { ...newBadges[idx], title: v };
                            updateField("trust_badges", newBadges);
                          }} 
                        />
                        <ContentField 
                          label="Description" 
                          value={b.desc || ""} 
                          onChange={(v) => {
                            const newBadges = [...(content.trust_badges || DEFAULT_TRUST_BADGES)];
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
                <ContentField label="Page Title (English)" value={content.about_title_en || ""} onChange={(v) => updateField("about_title_en", v)} />
                <ContentField label="Page Title (Vietnamese)" value={content.about_title_vi || ""} onChange={(v) => updateField("about_title_vi", v)} />
                <ContentField label="Bio / Mission (English)" value={content.about_mission_en || content.mission || ""} onChange={(v) => updateField("about_mission_en", v)} multiline />
                <ContentField label="Bio / Mission (Vietnamese)" value={content.about_mission_vi || ""} onChange={(v) => updateField("about_mission_vi", v)} multiline />
                <ContentField label="Office / Founder Photo URL" value={content.about_photo || ""} onChange={(v) => updateField("about_photo", v)} />
                {content.about_photo && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border h-48 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={content.about_photo} alt="Office preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "services" && (
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground">Manage your service offerings and detailed pricing. Use "What We Offer" to build the top list of services on the page, and "Pricing" to build the detailed cost breakdown table.</p>
              
              <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-xl font-bold text-charcoal">Tax & Business</h2>
                <ServiceCategoryPanel 
                  title="What We Offer (Top List)" 
                  items={(content.tax_offerings && content.tax_offerings.length > 0) ? content.tax_offerings : DEFAULT_TAX_OFFERINGS}
                  onChange={(items) => updateField("tax_offerings", items)}
                  headerColor="bg-slate-100"
                  borderColor="border-slate-200"
                  hasPrice={false}
                />
                <ServiceCategoryPanel 
                  title="Pricing (Bottom Table)" 
                  items={(content.tax_services && content.tax_services.length > 0) ? content.tax_services : DEFAULT_TAX_SERVICES}
                  onChange={(items) => updateField("tax_services", items)}
                  headerColor="bg-amber-100/50"
                  borderColor="border-amber-200"
                />
              </div>

              <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-xl font-bold text-charcoal">Insurance & Finance</h2>
                <ServiceCategoryPanel 
                  title="What We Offer (Top List)" 
                  items={(content.insurance_offerings && content.insurance_offerings.length > 0) ? content.insurance_offerings : DEFAULT_INSURANCE_OFFERINGS}
                  onChange={(items) => updateField("insurance_offerings", items)}
                  headerColor="bg-slate-100"
                  borderColor="border-slate-200"
                  hasPrice={false}
                />
                <ServiceCategoryPanel 
                  title="Pricing (Bottom Table)" 
                  items={content.insurance_services || []} 
                  onChange={(items) => updateField("insurance_services", items)}
                  headerColor="bg-blue-100/50"
                  borderColor="border-blue-200"
                />
              </div>

              <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-xl font-bold text-charcoal">Immigration</h2>
                <ServiceCategoryPanel 
                  title="What We Offer (Top List)" 
                  items={(content.immigration_offerings && content.immigration_offerings.length > 0) ? content.immigration_offerings : DEFAULT_IMMIGRATION_OFFERINGS}
                  onChange={(items) => updateField("immigration_offerings", items)}
                  headerColor="bg-slate-100"
                  borderColor="border-slate-200"
                  hasPrice={false}
                />
                <ServiceCategoryPanel 
                  title="Other Pricing (Bottom Table)" 
                  items={content.immigration_services || []} 
                  onChange={(items) => updateField("immigration_services", items)}
                  headerColor="bg-green-100/50"
                  borderColor="border-green-200"
                />
              </div>

              <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-xl font-bold text-charcoal">AI / Automation</h2>
                <ServiceCategoryPanel 
                  title="What We Offer (Top List)" 
                  items={(content.ai_offerings && content.ai_offerings.length > 0) ? content.ai_offerings : DEFAULT_AI_OFFERINGS} 
                  onChange={(items) => updateField("ai_offerings", items)}
                  headerColor="bg-slate-100"
                  borderColor="border-slate-200"
                  hasPrice={false}
                />
                <ServiceCategoryPanel 
                  title="Pricing (Bottom Table)" 
                  items={content.ai_services || []} 
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

function ServiceCategoryPanel({ title, items, onChange, headerColor, borderColor, hasPrice = true }: { title: string, items: any[], onChange: (items: any[]) => void, headerColor: string, borderColor: string, hasPrice?: boolean }) {
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
