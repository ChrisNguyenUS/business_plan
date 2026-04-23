import Link from "next/link";
import { AlertCircle, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);
  return { title: d.immigration_title, description: d.immigration_desc, alternates: { languages: { en: "/en/services/immigration", vi: "/vi/services/immigration" } } };
}

export default async function ImmigrationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const d = await getDictionary(locale as Locale);

  const formatFormPrice = (form: any, defaultService: number, defaultUscis: number) => {
    if (!form) return `$${defaultService} service + $${defaultUscis} USCIS = $${(defaultService + defaultUscis).toLocaleString()} total`;
    const sf = parseInt(form.serviceFee) || 0;
    const uf = parseInt(form.uscisFeePaper) || 0;
    return `$${sf} service + $${uf} USCIS = $${(sf + uf).toLocaleString()} total`;
  };

  const defaultServices = [
    { name: "N-400 Citizenship Application", vi: "Đơn Xin Quốc Tịch N-400", price: formatFormPrice(d.n400_form, 550, 760) },
    { name: "I-90 Green Card Renewal", vi: "Gia Hạn Thẻ Xanh I-90", price: formatFormPrice(d.i90_form, 250, 465) },
    { name: "I-131 Travel Document", vi: "Giấy Đi Lại I-131", price: formatFormPrice(d.i131_form, 250, 630) },
    { name: "I-765 Work Permit (EAD)", vi: "Giấy Phép Làm Việc I-765", price: "$250 service + $520 USCIS = $770 total" },
    { name: "I-751 Remove Conditions", vi: "Xóa Điều Kiện Thẻ Xanh I-751", price: "$550 service + $750 USCIS = $1,300 total" },
    { name: "Marriage Green Card Bundle", vi: "Trọn Gói Thẻ Xanh Kết Hôn", price: formatFormPrice(d.marriage_form, 1085, 2115) },
    { name: "I-130 Family Petition", vi: "Bảo Lãnh Gia Đình I-130", price: "$425 service + $675 USCIS = $1,100 total" },
    { name: "I-912 Fee Waiver", vi: "Miễn Phí USCIS I-912", price: "$150 service (USCIS fee $0) = $150 total" },
    { name: "AR-11 Change of Address", vi: "Đổi Địa Chỉ AR-11", price: "$50 service (USCIS fee $0) = $50 total" },
    { name: "Certified Translation (per page)", vi: "Dịch Thuật Công Chứng", price: "$25 per page" },
    { name: "General Consultation", vi: "Tư Vấn Di Trú", price: d.imm_consult_price || "Free consultation for Texas residents" }
  ];

  const dynamicServices = Array.isArray(d.immigration_services) ? d.immigration_services.map(s => ({
    name: s.name,
    vi: "",
    price: s.price
  })) : [];

  const services = dynamicServices.length > 0 
    ? [
        { name: "N-400 Citizenship Application", vi: "Đơn Xin Quốc Tịch N-400", price: formatFormPrice(d.n400_form, 550, 760) },
        { name: "I-90 Green Card Renewal", vi: "Gia Hạn Thẻ Xanh I-90", price: formatFormPrice(d.i90_form, 250, 465) },
        { name: "I-131 Travel Document", vi: "Giấy Đi Lại I-131", price: formatFormPrice(d.i131_form, 250, 630) },
        { name: "Marriage Green Card Bundle", vi: "Trọn Gói Thẻ Xanh Kết Hôn", price: formatFormPrice(d.marriage_form, 1085, 2115) },
        ...dynamicServices
      ]
    : defaultServices;

  const faqs = [
    { q: "Gia hạn thẻ xanh (I-90) ở Houston giá bao nhiêu? / How much is green card renewal in Houston?", a: "Manna One Solution charges $250 service fee + $465 USCIS filing fee = $715 total for paper I-90. Online filing is $250 + $415 = $665 total. USCIS fees verified April 2026." },
    { q: "Manna One Solution có phải là luật sư không? / Are you an attorney?", a: "No. Manna One Solution is a non-attorney document preparer. We help Vietnamese-speaking Texas residents complete USCIS forms. We do NOT provide legal advice, file Form G-28, or represent clients at USCIS. For complex cases, we refer clients to licensed attorneys." },
    { q: "Đơn N-400 quốc tịch Mỹ giá bao nhiêu? / What does N-400 citizenship application cost?", a: "Our fee is $550 service + $760 USCIS filing fee = $1,310 total for paper filing; $550 + $710 = $1,260 for online. Free consultation for Texas residents." },
    { q: "Tôi có thể được tư vấn từ xa không? / Can I get remote consultation?", a: "Yes! We serve all Texas residents remotely via secure video consultation. In-person consultations are available at our Houston HQ on Bellaire Blvd." },
    { q: "What documents do I need for my first consultation?", a: "Bring your passport, any existing immigration documents (visa, I-94, EAD, green card), and any USCIS correspondence. We will review everything in Vietnamese or English." },
  ];

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Non-Attorney Disclosure Banner */}
        <div className="mb-8 p-5 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 text-sm mb-1">
              Important Disclosure / Thông Báo Quan Trọng
            </p>
            <p className="text-amber-800 text-sm leading-relaxed">
              Manna One Solution is a <strong>non-attorney document preparer</strong>. We prepare
              USCIS forms at your direction. We are NOT a law firm and do NOT provide legal
              advice. We do NOT file Form G-28 or represent clients before USCIS. For complex
              cases (RFEs, prior denials, criminal history), we refer you to a licensed immigration
              attorney.
            </p>
            <p className="text-amber-800 text-sm mt-1">
              <strong>⚠️ Texas residents only.</strong> Dịch vụ chỉ dành cho cư dân Texas.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl lg:text-5xl font-bold text-charcoal mb-4">
            Immigration Services / Dịch Vụ Di Trú
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
            Vietnamese-language USCIS document preparation for Texas residents. Non-attorney
            document preparer — transparent pricing, bilingual service.
          </p>
          <p className="text-primary font-semibold mt-2 text-sm">
            Starting from $50 · I-90 green card renewal from $715 total · Free consultation
          </p>
        </div>

        {/* What We Offer */}
        {Array.isArray(d.immigration_offerings) && d.immigration_offerings.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-charcoal mb-6">What We Offer / Dịch Vụ Của Chúng Tôi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {d.immigration_offerings.map((s: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-teal-light/50 border border-border">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-charcoal text-sm font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-charcoal mb-2">Services & Transparent Pricing</h2>
          <p className="text-muted-foreground text-sm mb-6">
            All prices = Service Fee + USCIS Filing Fee. USCIS fees verified as of {d.uscis_date || "April 2026"} at{" "}
            <a
              href="https://www.uscis.gov/forms/filing-fees"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              uscis.gov/forms/filing-fees
            </a>
            . Service fee is flat; USCIS fee is subject to change.
          </p>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            {services.map((s, i) => (
              <div
                key={i}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 gap-1 ${
                  i < services.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div>
                  <span className="text-charcoal text-sm font-medium block">{s.name}</span>
                  <span className="text-muted-foreground text-xs">{s.vi}</span>
                </div>
                <span className="text-primary font-bold text-sm shrink-0">{s.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What We Do NOT Do */}
        <div className="mb-12 p-6 rounded-2xl bg-red-50 border border-red-100">
          <h2 className="text-lg font-bold text-red-900 mb-3">What We Do NOT Do</h2>
          <ul className="text-red-800 text-sm space-y-1">
            {[
              "Provide legal advice or case strategy recommendations",
              "File Form G-28 or represent clients before USCIS",
              "Attend USCIS interviews as legal representative",
              "Handle RFEs, NOIDs, denials, or inadmissibility issues",
              "Handle removal/deportation proceedings",
              "Serve clients outside Texas",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-red-500">✗</span> {item}
              </li>
            ))}
          </ul>
          <p className="text-red-800 text-sm mt-3">
            For complex cases, we refer clients to:{" "}
            <a href="https://www.cliniclegal.org" target="_blank" rel="noopener noreferrer" className="underline">
              CLINIC
            </a>
            ,{" "}
            <a href="https://www.supportkind.org" target="_blank" rel="noopener noreferrer" className="underline">
              KIND
            </a>
            , Catholic Charities Houston, or AILA pro-bono attorneys.
          </p>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-charcoal mb-6">
            Câu Hỏi Thường Gặp / Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-charcoal font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA */}
        <div className="text-center p-10 rounded-2xl bg-charcoal">
          <h3 className="text-2xl font-bold text-white mb-2">
            Đặt Lịch Tư Vấn Miễn Phí / Book Free Consultation
          </h3>
          <p className="text-white/60 text-sm mb-6">
            For Texas residents only. Dành cho cư dân Texas.
          </p>
          <Link href={`/${locale}/contact`}>
            <Button size="lg" className="bg-primary hover:bg-teal-dark text-white rounded-full px-8 gap-2">
              <Calendar className="h-4 w-4" />
              Đặt Lịch / Book Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
