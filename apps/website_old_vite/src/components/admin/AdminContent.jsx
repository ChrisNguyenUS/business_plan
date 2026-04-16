const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Image, Type, DollarSign, CheckCircle, LayoutGrid } from 'lucide-react';
import AdminServicesEditor from './AdminServicesEditor';

// Editable content sections — stored in localStorage for simplicity
// (In production these would go to a site_content entity)

const DEFAULTS = {
  // Home
  hero_headline_en: 'One Stop, All Solutions',
  hero_headline_vi: 'Một Điểm Đến, Mọi Giải Pháp',
  hero_subheadline_en: 'Tax & Business · Insurance & Finance · Immigration · AI Automation — all in one bilingual Houston office.',
  hero_subheadline_vi: 'Thuế & Kinh Doanh · Bảo Hiểm · Di Trú · Tự Động Hóa AI — tất cả trong một văn phòng song ngữ tại Houston.',
  hero_image_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1400&q=80',
  why_badge_1: 'Bilingual Service (VI/EN)',
  why_badge_2: 'IRS EFIN Licensed #857993',
  why_badge_3: 'TX Life & P&C Insurance Licensed',
  why_badge_4: 'Texas Notary Public (Pending)',
  // About
  about_title_en: 'About Manna One Solution',
  about_title_vi: 'Giới Thiệu Manna One Solution',
  about_bio_en: 'Launched in 2026 to serve Houston\'s Vietnamese-American community, Manna One Solution was founded on a simple belief: everyone deserves transparent, affordable professional services in their own language.',
  about_bio_vi: 'Ra đời năm 2026 để phục vụ cộng đồng người Mỹ gốc Việt tại Houston, Manna One Solution được thành lập với niềm tin đơn giản: mọi người đều xứng đáng được tiếp cận các dịch vụ chuyên nghiệp minh bạch, giá cả phải chăng bằng ngôn ngữ của mình.',
  about_image_url: 'https://media.db.com/images/public/69dafd73d99166d00ad6b65b/c0a13c9eb_generated_2bccc46f.png',
  // Immigration pricing
  price_i90_service: '250',
  price_i90_uscis_paper: '465',
  price_i90_uscis_online: '415',
  price_n400_service: '550',
  price_n400_uscis_paper: '760',
  price_n400_uscis_online: '710',
  price_i130_service: '425',
  price_i130_uscis: '675',
  price_i765_service: '250',
  price_i765_uscis_paper: '520',
  price_i751_service: '550',
  price_i751_uscis: '750',
  price_i131_service: '250',
  price_i131_uscis: '630',
  price_marriage_gc_service: '1085',
  price_marriage_gc_uscis: '2115',
  price_verified_date: 'April 2026',
};

function getContent() {
  try {
    const stored = JSON.parse(localStorage.getItem('mannaos_content') || '{}');
    return { ...DEFAULTS, ...stored };
  } catch { return { ...DEFAULTS }; }
}

function saveContent(data) {
  localStorage.setItem('mannaos_content', JSON.stringify(data));
}

export { getContent };

export default function AdminContent() {
  const [content, setContent] = useState(getContent);
  const [saved, setSaved] = useState(false);

  function update(key, value) {
    setContent(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    saveContent(content);
    // Also save services if the editor has been touched
    if (AdminServicesEditor.save) AdminServicesEditor.save();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function Field({ label, k, type = 'input', rows = 3, placeholder = '' }) {
    return (
      <div>
        <Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>
        {type === 'textarea' ? (
          <Textarea rows={rows} value={content[k] || ''} onChange={e => update(k, e.target.value)} placeholder={placeholder} className="text-sm" />
        ) : (
          <Input value={content[k] || ''} onChange={e => update(k, e.target.value)} placeholder={placeholder} className="text-sm" />
        )}
      </div>
    );
  }

  function ImageField({ label, k }) {
    return (
      <div>
        <Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>
        <Input value={content[k] || ''} onChange={e => update(k, e.target.value)} placeholder="https://..." className="text-sm font-mono" />
        {content[k] && (
          <img src={content[k]} alt="" className="mt-2 h-28 w-full object-cover rounded-xl border border-border" onError={e => e.target.style.display = 'none'} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Content Editor</h1>
          <p className="text-muted-foreground text-sm mt-1">Edit homepage, about page, and service pricing.</p>
        </div>
        <Button onClick={handleSave} className={`rounded-full gap-2 transition-all ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-teal-dark'} text-white`}>
          {saved ? <><CheckCircle className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
        </Button>
      </div>

      <Tabs defaultValue="home">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="home"><Type className="h-3.5 w-3.5 mr-1.5" />Home</TabsTrigger>
          <TabsTrigger value="about"><Image className="h-3.5 w-3.5 mr-1.5" />About</TabsTrigger>
          <TabsTrigger value="services"><LayoutGrid className="h-3.5 w-3.5 mr-1.5" />Services</TabsTrigger>
          <TabsTrigger value="pricing"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Immigration Pricing</TabsTrigger>
        </TabsList>

        {/* HOME */}
        <TabsContent value="home" className="space-y-6">
          <Section title="Hero Banner">
            <Field label="Headline (English)" k="hero_headline_en" />
            <Field label="Headline (Vietnamese)" k="hero_headline_vi" />
            <Field label="Sub-headline (English)" k="hero_subheadline_en" type="textarea" rows={2} />
            <Field label="Sub-headline (Vietnamese)" k="hero_subheadline_vi" type="textarea" rows={2} />
            <ImageField label="Hero Background Image URL" k="hero_image_url" />
          </Section>
          <Section title="Why Manna — Trust Badges">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Badge 1" k="why_badge_1" />
              <Field label="Badge 2" k="why_badge_2" />
              <Field label="Badge 3" k="why_badge_3" />
              <Field label="Badge 4" k="why_badge_4" />
            </div>
          </Section>
        </TabsContent>

        {/* ABOUT */}
        <TabsContent value="about" className="space-y-6">
          <Section title="About Page">
            <Field label="Page Title (English)" k="about_title_en" />
            <Field label="Page Title (Vietnamese)" k="about_title_vi" />
            <Field label="Bio / Mission (English)" k="about_bio_en" type="textarea" rows={4} />
            <Field label="Bio / Mission (Vietnamese)" k="about_bio_vi" type="textarea" rows={4} />
            <ImageField label="Office / Founder Photo URL" k="about_image_url" />
          </Section>
        </TabsContent>

        {/* SERVICES */}
        <TabsContent value="services">
          <AdminServicesEditor />
        </TabsContent>

        {/* PRICING */}
        <TabsContent value="pricing" className="space-y-6">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            All prices are Service Fee + USCIS Fee. USCIS fees are verified as of the date below and are subject to change.
          </div>

          <Field label="USCIS Fees Verified Date (displayed on site)" k="price_verified_date" />

          <PriceSection title="I-90 Green Card Renewal">
            <PriceRow label="Service Fee" k="price_i90_service" update={update} content={content} />
            <PriceRow label="USCIS Fee (Paper)" k="price_i90_uscis_paper" update={update} content={content} />
            <PriceRow label="USCIS Fee (Online)" k="price_i90_uscis_online" update={update} content={content} />
            <Total label="Total (Paper)" val={(+content.price_i90_service||0) + (+content.price_i90_uscis_paper||0)} />
          </PriceSection>

          <PriceSection title="N-400 Citizenship">
            <PriceRow label="Service Fee" k="price_n400_service" update={update} content={content} />
            <PriceRow label="USCIS Fee (Paper)" k="price_n400_uscis_paper" update={update} content={content} />
            <PriceRow label="USCIS Fee (Online)" k="price_n400_uscis_online" update={update} content={content} />
            <Total label="Total (Paper)" val={(+content.price_n400_service||0) + (+content.price_n400_uscis_paper||0)} />
          </PriceSection>

          <PriceSection title="I-130 Family Petition">
            <PriceRow label="Service Fee" k="price_i130_service" update={update} content={content} />
            <PriceRow label="USCIS Fee" k="price_i130_uscis" update={update} content={content} />
            <Total label="Total" val={(+content.price_i130_service||0) + (+content.price_i130_uscis||0)} />
          </PriceSection>

          <PriceSection title="I-765 Work Permit (EAD)">
            <PriceRow label="Service Fee" k="price_i765_service" update={update} content={content} />
            <PriceRow label="USCIS Fee (Paper)" k="price_i765_uscis_paper" update={update} content={content} />
            <Total label="Total (Paper)" val={(+content.price_i765_service||0) + (+content.price_i765_uscis_paper||0)} />
          </PriceSection>

          <PriceSection title="I-751 Remove Conditions">
            <PriceRow label="Service Fee" k="price_i751_service" update={update} content={content} />
            <PriceRow label="USCIS Fee" k="price_i751_uscis" update={update} content={content} />
            <Total label="Total" val={(+content.price_i751_service||0) + (+content.price_i751_uscis||0)} />
          </PriceSection>

          <PriceSection title="I-131 Travel Document">
            <PriceRow label="Service Fee" k="price_i131_service" update={update} content={content} />
            <PriceRow label="USCIS Fee" k="price_i131_uscis" update={update} content={content} />
            <Total label="Total" val={(+content.price_i131_service||0) + (+content.price_i131_uscis||0)} />
          </PriceSection>

          <PriceSection title="⭐ Marriage Green Card Bundle">
            <PriceRow label="Service Fee" k="price_marriage_gc_service" update={update} content={content} />
            <PriceRow label="USCIS Fees" k="price_marriage_gc_uscis" update={update} content={content} />
            <Total label="Bundle Total" val={(+content.price_marriage_gc_service||0) + (+content.price_marriage_gc_uscis||0)} />
          </PriceSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
      <h3 className="font-semibold text-charcoal text-sm border-b border-border pb-2">{title}</h3>
      {children}
    </div>
  );
}

function PriceSection({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <h3 className="font-semibold text-charcoal text-sm mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PriceRow({ label, k, update, content }) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-xs text-muted-foreground w-40 shrink-0">{label}</Label>
      <div className="flex items-center gap-1 flex-1">
        <span className="text-sm text-muted-foreground">$</span>
        <Input
          type="number"
          value={content[k] || ''}
          onChange={e => update(k, e.target.value)}
          className="text-sm h-8"
        />
      </div>
    </div>
  );
}

function Total({ label, val }) {
  return (
    <div className="flex items-center gap-3 pt-1 border-t border-border/50">
      <span className="text-xs font-semibold text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm font-bold text-primary">${val.toLocaleString()}</span>
    </div>
  );
}