-- About page refinement (owner spec 2026-10-20). Run AFTER the code is deployed.
-- Data-only update of public.site_content (about row); no schema change. These keys are English-only
-- and, since the 2026-10-20 fix, apply on /en/about only. The admin Content Editor keeps working.
--
-- areas: last item said "Vietnamese communities nationwide", which reads as every service everywhere.
-- mission/about_mission_en: match the refined mission (adds business setup and everyday paperwork).
update public.site_content
set content = content || jsonb_build_object(
  'areas', 'Houston · Dallas/Fort Worth · Austin · Online across the U.S. (varies by service)',
  'mission', 'We make life in the U.S. simpler for the Vietnamese community in Houston and beyond. From immigration paperwork, taxes, and business setup to insurance and everyday administrative tasks, Manna works with you step by step, in your own language.',
  'about_mission_en', 'We make life in the U.S. simpler for the Vietnamese community in Houston and beyond. From immigration paperwork, taxes, and business setup to insurance and everyday administrative tasks, Manna works with you step by step, in your own language.'
)
where section = 'about';

select content->>'areas' as areas, left(content->>'about_mission_en', 60) as mission
from public.site_content where section = 'about';
