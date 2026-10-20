-- Homepage copy refresh (owner spec 2026-10-19). Run AFTER the homepage code is deployed.
-- Data-only update of public.site_content; no schema change. The admin Content Editor keeps working:
-- it already reads/writes hero_headline_en/_vi and hero_sub_en/_vi, and edits trust_badges (English).

-- 1. Homepage row: per-language hero text, new trust badges (EN + VI), drop the English-only legacy keys
--    (hero_headline, hero_subtitle, hero_description, cta_text, badge_4) so each language uses its own copy.
update public.site_content
set content = (content - 'hero_headline' - 'hero_subtitle' - 'hero_description' - 'cta_text' - 'badge_4')
  || jsonb_build_object(
    'hero_headline_en', 'Your Trusted Partner for Life, Business & Immigration.',
    'hero_headline_vi', 'Đối tác tin cậy cho cuộc sống, kinh doanh và di trú.',
    'hero_sub_en', 'Bilingual support for immigration paperwork, tax preparation, business services, and insurance in Houston, with most services available online across the U.S.',
    'hero_sub_vi', 'Hỗ trợ song ngữ về hồ sơ di trú, khai thuế, dịch vụ doanh nghiệp và bảo hiểm tại Houston, phần lớn dịch vụ làm online trên toàn nước Mỹ.',
    'trust_badges', jsonb_build_array(
      jsonb_build_object('id', '1', 'icon', 'MessagesSquare', 'title', 'Bilingual Service (VI/EN)',
        'desc', 'Native Vietnamese speaker, so nothing gets lost between languages.'),
      jsonb_build_object('id', '2', 'icon', 'FileCheck', 'title', 'IRS Authorized e-file Provider',
        'desc', 'EFIN #857993: authorized by the IRS to file tax returns electronically.'),
      jsonb_build_object('id', '3', 'icon', 'ShieldCheck', 'title', 'TX Life & P&C Insurance Licensed',
        'desc', 'Texas-licensed Life and Property & Casualty insurance agent (NPN #21024561).')
    ),
    'trust_badges_vi', jsonb_build_array(
      jsonb_build_object('id', '1', 'icon', 'MessagesSquare', 'title', 'Dịch vụ song ngữ (VI/EN)',
        'desc', 'Nói tiếng Việt bản ngữ, không lo hiểu sai giữa hai ngôn ngữ.'),
      jsonb_build_object('id', '2', 'icon', 'FileCheck', 'title', 'Được IRS ủy quyền nộp thuế điện tử',
        'desc', 'EFIN #857993: được IRS cho phép nộp tờ khai thuế điện tử.'),
      jsonb_build_object('id', '3', 'icon', 'ShieldCheck', 'title', 'Đại lý bảo hiểm có giấy phép tại Texas',
        'desc', 'Được cấp phép bảo hiểm nhân thọ và tài sản/trách nhiệm (P&C) tại Texas, NPN #21024561.')
    )
  )
where section = 'homepage';

-- 2. Services row: the Immigration card summary on the homepage comes from service_content.
update public.site_content
set content = jsonb_set(
  content,
  '{service_content,immigration,card_summary,description}',
  jsonb_build_object(
    'en', 'Citizenship, green cards, family petitions, and immigration paperwork support.',
    'vi', 'Quốc tịch, thẻ xanh, bảo lãnh gia đình và hỗ trợ giấy tờ di trú.'
  )
)
where section = 'services';
