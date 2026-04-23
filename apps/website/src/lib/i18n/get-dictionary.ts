import { createServerSupabaseClient } from '@/lib/supabase';
import type { Locale } from './config';

const dictionaries = {
  en: () => import('@/messages/en.json').then((module) => module.default),
  vi: () => import('@/messages/vi.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => {
  const localDict = await dictionaries[locale]();
  
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from('site_content').select('*');
    
    if (data && data.length > 0) {
      const dbDict: any = { ...localDict };
      
      data.forEach((row) => {
        const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        if (row.section === 'homepage') {
           if (content.hero_headline) dbDict.hero_headline = content.hero_headline;
           if (content.hero_subtitle) dbDict.hero_sub = content.hero_subtitle;
           if (content.hero_description) dbDict.hero_desc = content.hero_description;
           if (content.cta_text) dbDict.hero_cta1 = content.cta_text;
        }
        if (row.section === 'about') {
           if (content.mission) dbDict.about_mission = content.mission;
           if (content.story) dbDict.about_story = content.story;
           if (content.areas) dbDict.about_areas = content.areas;
        }
        if (row.section === 'services') {
           if (content.tax_desc) dbDict.tax_desc = content.tax_desc;
           if (content.insurance_desc) dbDict.insurance_desc = content.insurance_desc;
           if (content.immigration_desc) dbDict.immigration_desc = content.immigration_desc;
           if (content.ai_desc) dbDict.ai_desc = content.ai_desc;
        }
        if (row.section === 'immigration_pricing') {
           if (content.n400_price) dbDict.imm_n400_price = content.n400_price;
           if (content.gc_price) dbDict.imm_gc_price = content.gc_price;
           if (content.visa_price) dbDict.imm_visa_price = content.visa_price;
           if (content.consult_price) dbDict.imm_consult_price = content.consult_price;
        }
      });
      
      return dbDict as typeof localDict & {
        imm_n400_price?: string;
        imm_gc_price?: string;
        imm_visa_price?: string;
        imm_consult_price?: string;
      };
    }
  } catch (err) {
    console.error("Failed to load site_content from DB", err);
  }
  
  return localDict as typeof localDict & {
    imm_n400_price?: string;
    imm_gc_price?: string;
    imm_visa_price?: string;
    imm_consult_price?: string;
  };
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
