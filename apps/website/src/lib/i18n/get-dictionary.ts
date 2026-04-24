import "server-only";
import type { Locale } from "./config";
import { supabase } from "@/lib/supabase";

const dictionaries = {
  en: () => import("@/messages/en.json").then((module) => module.default),
  vi: () => import("@/messages/vi.json").then((module) => module.default),
};

export type Dictionary = Awaited<ReturnType<typeof dictionaries.en>> & {
  hero_bg_image?: string;
  about_photo?: string;
  tax_services?: { id: string; name: string; price: string }[];
  insurance_services?: { id: string; name: string; price: string }[];
  immigration_services?: { id: string; name: string; price: string }[];
  ai_services?: { id: string; name: string; price: string }[];
  tax_offerings?: { id: string; name: string }[];
  insurance_offerings?: { id: string; name: string }[];
  immigration_offerings?: { id: string; name: string }[];
  ai_offerings?: { id: string; name: string }[];
  uscis_date?: string;
  immigration_form_bundles?: { id: string; name: string; isBundle?: boolean; serviceFee: string; uscisFeePaper: string; uscisFeeOnline: string; }[];
  imm_n400_price?: string;
  imm_gc_price?: string;
  imm_visa_price?: string;
  imm_consult_price?: string;
  trust_badges?: { id: string; title: string; desc: string }[];
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const { unstable_noStore: noStore } = await import("next/cache");
  noStore();
  const dictionary = await dictionaries[locale]();

  try {
    const { data: siteContent } = await supabase.from("site_content").select("*");
    if (siteContent) {
      // Create a mutable copy of the dictionary to allow overrides
      const dbDict = { ...dictionary } as any;

      const hasServicesRow = siteContent.some(row => row.section === "services");

      if (!hasServicesRow) {
        dbDict.tax_offerings = [
          { id: "1", name: dbDict.tax_s1 },
          { id: "2", name: dbDict.tax_s2 },
          { id: "3", name: dbDict.tax_s3 },
          { id: "4", name: dbDict.tax_s4 }
        ];
        dbDict.insurance_offerings = [
          { id: "1", name: dbDict.insurance_s1 },
          { id: "2", name: dbDict.insurance_s2 },
          { id: "3", name: dbDict.insurance_s3 }
        ];
        dbDict.immigration_offerings = [
          { id: "1", name: dbDict.immigration_s1 },
          { id: "2", name: dbDict.immigration_s2 },
          { id: "3", name: dbDict.immigration_s3 },
          { id: "4", name: dbDict.immigration_s4 }
        ];
        dbDict.ai_offerings = [
          { id: "1", name: dbDict.ai_s1 },
          { id: "2", name: dbDict.ai_s2 },
          { id: "3", name: dbDict.ai_s3 },
          { id: "4", name: dbDict.ai_s4 }
        ];
        dbDict.tax_services = [
          { id: "1", name: dbDict.tax_pricing_1, price: dbDict.tax_price_1 },
          { id: "2", name: dbDict.tax_pricing_2, price: dbDict.tax_price_2 },
          { id: "3", name: dbDict.tax_pricing_3, price: dbDict.tax_price_3 },
          { id: "4", name: dbDict.tax_pricing_4, price: dbDict.tax_price_4 },
          { id: "5", name: dbDict.tax_pricing_5, price: dbDict.tax_price_5 }
        ];
      }

      siteContent.forEach((row) => {
        const content = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
        
        if (row.section === "homepage") {
          if (locale === "en") {
            if (content.hero_headline_en) dbDict.hero_headline = content.hero_headline_en;
            if (content.hero_sub_en) dbDict.hero_sub = content.hero_sub_en;
          } else {
            if (content.hero_headline_vi) dbDict.hero_headline = content.hero_headline_vi;
            if (content.hero_sub_vi) dbDict.hero_sub = content.hero_sub_vi;
          }
          
          if (content.hero_bg_image) dbDict.hero_bg_image = content.hero_bg_image;
          
          if (content.trust_badges) dbDict.trust_badges = content.trust_badges;
          
          // Legacy fallbacks
          if (content.badge_1) dbDict.why_bilingual = content.badge_1;
          if (content.badge_2) dbDict.why_efin = content.badge_2;
          if (content.badge_3) dbDict.why_insurance_license = content.badge_3;
          if (content.badge_4) dbDict.why_ai = content.badge_4;

          if (content.hero_headline && !content.hero_headline_en && locale === "en") dbDict.hero_headline = content.hero_headline;
          if (content.hero_subtitle && !content.hero_sub_en && locale === "en") dbDict.hero_sub = content.hero_subtitle;
          if (content.cta_text) dbDict.hero_cta1 = content.cta_text;
        }

        if (row.section === "about") {
          if (locale === "en") {
            if (content.about_title_en) dbDict.about_title = content.about_title_en;
            if (content.about_mission_en) dbDict.about_mission = content.about_mission_en;
          } else {
            if (content.about_title_vi) dbDict.about_title = content.about_title_vi;
            if (content.about_mission_vi) dbDict.about_mission = content.about_mission_vi;
          }
          
          if (content.about_photo) dbDict.about_photo = content.about_photo;

          if (content.mission && !content.about_mission_en && locale === "en") dbDict.about_mission = content.mission;
          if (content.story) dbDict.about_story = content.story;
          if (content.areas) dbDict.about_areas = content.areas;
        }

        if (row.section === "services") {
          if (content.tax_services && content.tax_services.length > 0) dbDict.tax_services = content.tax_services;
          else dbDict.tax_services = [
            { id: "1", name: dbDict.tax_pricing_1, price: dbDict.tax_price_1 },
            { id: "2", name: dbDict.tax_pricing_2, price: dbDict.tax_price_2 },
            { id: "3", name: dbDict.tax_pricing_3, price: dbDict.tax_price_3 },
            { id: "4", name: dbDict.tax_pricing_4, price: dbDict.tax_price_4 },
            { id: "5", name: dbDict.tax_pricing_5, price: dbDict.tax_price_5 }
          ];

          if (content.insurance_services !== undefined) dbDict.insurance_services = content.insurance_services;
          if (content.immigration_services !== undefined) dbDict.immigration_services = content.immigration_services;
          if (content.ai_services !== undefined) dbDict.ai_services = content.ai_services;

          if (content.tax_offerings && content.tax_offerings.length > 0) dbDict.tax_offerings = content.tax_offerings;
          else dbDict.tax_offerings = [
            { id: "1", name: dbDict.tax_s1 },
            { id: "2", name: dbDict.tax_s2 },
            { id: "3", name: dbDict.tax_s3 },
            { id: "4", name: dbDict.tax_s4 }
          ];

          if (content.insurance_offerings && content.insurance_offerings.length > 0) dbDict.insurance_offerings = content.insurance_offerings;
          else dbDict.insurance_offerings = [
            { id: "1", name: dbDict.insurance_s1 },
            { id: "2", name: dbDict.insurance_s2 },
            { id: "3", name: dbDict.insurance_s3 }
          ];

          if (content.immigration_offerings && content.immigration_offerings.length > 0) dbDict.immigration_offerings = content.immigration_offerings;
          else dbDict.immigration_offerings = [
            { id: "1", name: dbDict.immigration_s1 },
            { id: "2", name: dbDict.immigration_s2 },
            { id: "3", name: dbDict.immigration_s3 },
            { id: "4", name: dbDict.immigration_s4 }
          ];

          if (content.ai_offerings && content.ai_offerings.length > 0) dbDict.ai_offerings = content.ai_offerings;
          else dbDict.ai_offerings = [
            { id: "1", name: dbDict.ai_s1 },
            { id: "2", name: dbDict.ai_s2 },
            { id: "3", name: dbDict.ai_s3 },
            { id: "4", name: dbDict.ai_s4 }
          ];
          
          if (content.uscis_date) dbDict.uscis_date = content.uscis_date;

          if (content.immigration_form_bundles && content.immigration_form_bundles.length > 0) {
            dbDict.immigration_form_bundles = content.immigration_form_bundles;
          } else {
            dbDict.immigration_form_bundles = [
              { id: "1", name: "I-90 Green Card Renewal", serviceFee: "250", uscisFeePaper: "465", uscisFeeOnline: "415" },
              { id: "2", name: "⭐ Marriage Green Card Bundle", isBundle: true, serviceFee: "1085", uscisFeePaper: "2115", uscisFeeOnline: "" },
              { id: "3", name: "N-400 Citizenship Application", serviceFee: "550", uscisFeePaper: "760", uscisFeeOnline: "710" },
              { id: "4", name: "I-131 Travel Document", serviceFee: "250", uscisFeePaper: "630", uscisFeeOnline: "" },
            ];
          }
          
          if (content.tax_desc) dbDict.tax_desc = content.tax_desc;
          if (content.insurance_desc) dbDict.insurance_desc = content.insurance_desc;
          if (content.immigration_desc) dbDict.immigration_desc = content.immigration_desc;
          if (content.ai_desc) dbDict.ai_desc = content.ai_desc;
        }

        if (row.section === "immigration_pricing") {
          // Fallbacks for older data if still in this row
          if (content.uscis_date && !dbDict.uscis_date) dbDict.uscis_date = content.uscis_date;

          if (content.n400_price) dbDict.imm_n400_price = content.n400_price;
          if (content.gc_price) dbDict.imm_gc_price = content.gc_price;
          if (content.visa_price) dbDict.imm_visa_price = content.visa_price;
          if (content.consult_price) dbDict.imm_consult_price = content.consult_price;
        }
      });

      return dbDict;
    }
  } catch (error) {
    console.error("Failed to load content from Supabase:", error);
  }
  
  return dictionary as Dictionary;
};
