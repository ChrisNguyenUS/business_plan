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
  uscis_date?: string;
  i90_form?: any;
  marriage_form?: any;
  n400_form?: any;
  i131_form?: any;
  imm_n400_price?: string;
  imm_gc_price?: string;
  imm_visa_price?: string;
  imm_consult_price?: string;
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const dictionary = await dictionaries[locale]();

  try {
    const { data: siteContent } = await supabase.from("site_content").select("*");
    if (siteContent) {
      // Create a mutable copy of the dictionary to allow overrides
      const dbDict = { ...dictionary } as any;

      siteContent.forEach((row) => {
        const content = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
        
        if (row.section === "homepage") {
          // Merge bilingual content based on current locale
          if (locale === "en") {
            if (content.hero_headline_en) dbDict.hero_headline = content.hero_headline_en;
            if (content.hero_sub_en) dbDict.hero_sub = content.hero_sub_en;
          } else {
            if (content.hero_headline_vi) dbDict.hero_headline = content.hero_headline_vi;
            if (content.hero_sub_vi) dbDict.hero_sub = content.hero_sub_vi;
          }
          
          if (content.hero_bg_image) dbDict.hero_bg_image = content.hero_bg_image;
          
          // Badges are common for both locales, or they can be translated if the admin puts bilingual text
          if (content.badge_1) dbDict.why_bilingual = content.badge_1;
          if (content.badge_2) dbDict.why_efin = content.badge_2;
          if (content.badge_3) dbDict.why_insurance_license = content.badge_3;
          if (content.badge_4) dbDict.why_ai = content.badge_4;

          // Legacy fallbacks (in case Admin hasn't updated to new format)
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

          // Legacy fallbacks
          if (content.mission && !content.about_mission_en && locale === "en") dbDict.about_mission = content.mission;
          if (content.story) dbDict.about_story = content.story;
          if (content.areas) dbDict.about_areas = content.areas;
        }

        if (row.section === "services") {
          if (content.tax_services) dbDict.tax_services = content.tax_services;
          if (content.insurance_services) dbDict.insurance_services = content.insurance_services;
          if (content.immigration_services) dbDict.immigration_services = content.immigration_services;
          if (content.ai_services) dbDict.ai_services = content.ai_services;
          
          if (content.tax_desc) dbDict.tax_desc = content.tax_desc;
          if (content.insurance_desc) dbDict.insurance_desc = content.insurance_desc;
          if (content.immigration_desc) dbDict.immigration_desc = content.immigration_desc;
          if (content.ai_desc) dbDict.ai_desc = content.ai_desc;
        }

        if (row.section === "immigration_pricing") {
          if (content.uscis_date) dbDict.uscis_date = content.uscis_date;
          if (content.i90_form) dbDict.i90_form = content.i90_form;
          if (content.marriage_form) dbDict.marriage_form = content.marriage_form;
          if (content.n400_form) dbDict.n400_form = content.n400_form;
          if (content.i131_form) dbDict.i131_form = content.i131_form;

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
