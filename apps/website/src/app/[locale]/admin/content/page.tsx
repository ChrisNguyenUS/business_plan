"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, CheckCircle, Type, Image as ImageIcon, LayoutGrid, DollarSign, ChevronUp, ChevronDown, Trash2, Plus, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ContentSection = "homepage" | "about" | "services" | "immigration_pricing";

const SECTIONS: { key: ContentSection; label: string; icon: any }[] = [
  { key: "homepage", label: "Home", icon: Type },
  { key: "about", label: "About", icon: ImageIcon },
  { key: "services", label: "Services", icon: LayoutGrid },
];

type ServiceItem = { id: string; name: string; price: string };

type ImmForm = {
  id: string;
  name: string;
  isBundle?: boolean;
  serviceFee: string;
  uscisFeePaper: string;
  uscisFeeOnline: string;
};

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
                <div className="px-6 py-4 border-b border-border bg-slate-50/50">
                  <h2 className="text-base font-bold text-charcoal">Why Manna — Trust Badges</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ContentField label="Badge 1" value={content.badge_1 || "Bilingual Service (VI/EN)"} onChange={(v) => updateField("badge_1", v)} />
                  <ContentField label="Badge 2" value={content.badge_2 || "IRS EFIN Licensed #857993"} onChange={(v) => updateField("badge_2", v)} />
                  <ContentField label="Badge 3" value={content.badge_3 || "TX Life & P&C Insurance Licensed"} onChange={(v) => updateField("badge_3", v)} />
                  <ContentField label="Badge 4" value={content.badge_4 || "Texas Notary Public (Pending)"} onChange={(v) => updateField("badge_4", v)} />
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

                <div className="pt-4 mt-6 border-t border-border space-y-6">
                  <h3 className="text-lg font-bold text-charcoal">Immigration Forms Bundles</h3>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    All prices are Service Fee + USCIS Fee. USCIS fees are verified as of the date below and are subject to change.
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-primary">USCIS Fees Verified Date (displayed on site)</label>
                    <input 
                      type="text" 
                      value={content.uscis_date || "April 2026"} 
                      onChange={(e) => updateField("uscis_date", e.target.value)}
                      className="w-full h-10 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                    {(() => {
                      const defaultImmBundles: ImmForm[] = [
                        { id: "1", name: "I-90 Green Card Renewal", serviceFee: "250", uscisFeePaper: "465", uscisFeeOnline: "415" },
                        { id: "2", name: "⭐ Marriage Green Card Bundle", isBundle: true, serviceFee: "1085", uscisFeePaper: "2115", uscisFeeOnline: "" },
                        { id: "3", name: "N-400 Citizenship Application", serviceFee: "550", uscisFeePaper: "760", uscisFeeOnline: "710" },
                        { id: "4", name: "I-131 Travel Document", serviceFee: "250", uscisFeePaper: "630", uscisFeeOnline: "" },
                      ];
                      
                      const immBundles: ImmForm[] = content.immigration_form_bundles || defaultImmBundles;

                      const updateImmBundle = (index: number, newBundle: ImmForm) => {
                        const newBundles = [...immBundles];
                        newBundles[index] = newBundle;
                        updateField("immigration_form_bundles", newBundles);
                      };

                      const removeImmBundle = (index: number) => {
                        const newBundles = immBundles.filter((_, i) => i !== index);
                        updateField("immigration_form_bundles", newBundles);
                      };

                      const addImmBundle = () => {
                        const newBundles = [...immBundles, { id: Date.now().toString(), name: "New Bundle", serviceFee: "0", uscisFeePaper: "0", uscisFeeOnline: "0" }];
                        updateField("immigration_form_bundles", newBundles);
                      };

                      return (
                        <>
                          {immBundles.map((bundle, index) => (
                            <ImmPricingFormCard 
                              key={bundle.id}
                              form={bundle}
                              onChange={(f) => updateImmBundle(index, f)}
                              onRemove={() => removeImmBundle(index)}
                            />
                          ))}
                          <button 
                            onClick={addImmBundle}
                            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors bg-white"
                          >
                            <Plus className="h-4 w-4" />
                            Add Bundle
                          </button>
                        </>
                      );
                    })()}
                </div>
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

function ImmPricingFormCard({ form, onChange, onRemove }: { form: ImmForm, onChange: (f: ImmForm) => void, onRemove: () => void }) {
  const sf = parseInt(form.serviceFee) || 0;
  const up = parseInt(form.uscisFeePaper) || 0;
  const uo = parseInt(form.uscisFeeOnline) || 0;

  const totalPaper = sf + up;
  
  return (
    <div className="bg-white rounded-xl border border-border p-6 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <input 
          type="text" 
          value={form.name} 
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Bundle Name"
          className="flex-1 h-10 rounded-lg border border-border px-3 font-bold text-charcoal focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
            <input 
              type="checkbox" 
              checked={form.isBundle || false}
              onChange={(e) => onChange({ ...form, isBundle: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            Is Bundle (Hides Online Fee)
          </label>
          <button onClick={onRemove} className="p-2 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-4">
        <label className="w-1/3 text-sm font-medium text-muted-foreground">Service Fee</label>
        <div className="flex-1 relative">
          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
          <input 
            type="number" 
            value={form.serviceFee} 
            onChange={(e) => onChange({ ...form, serviceFee: e.target.value })}
            className="w-full h-10 pl-7 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="w-1/3 text-sm font-medium text-muted-foreground">{form.isBundle ? "USCIS Fees" : "USCIS Fee (Paper)"}</label>
        <div className="flex-1 relative">
          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
          <input 
            type="number" 
            value={form.uscisFeePaper} 
            onChange={(e) => onChange({ ...form, uscisFeePaper: e.target.value })}
            className="w-full h-10 pl-7 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {!form.isBundle && (
        <div className="flex items-center justify-between gap-4">
          <label className="w-1/3 text-sm font-medium text-muted-foreground">USCIS Fee (Online)</label>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
            <input 
              type="number" 
              value={form.uscisFeeOnline} 
              onChange={(e) => onChange({ ...form, uscisFeeOnline: e.target.value })}
              className="w-full h-10 pl-7 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border mt-2">
        <label className="w-1/3 font-bold text-charcoal">{form.isBundle ? "Bundle Total" : "Total (Paper)"}</label>
        <div className="flex-1 font-bold text-primary">
          ${totalPaper.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
