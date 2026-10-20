-- Six-category services taxonomy (owner spec 2026-10-19). Run AFTER the code is deployed.
-- Data-only update of public.site_content (services row); no schema change.
--
-- 1. tax_desc: legacy English-only override that still says "business registration"; Business is now its
--    own category. Dropping it lets each language use its own tax_desc from the messages files.
-- 2. insurance_offerings: held "Annuity Plans", "Retirement Planning", "Commercial Insurance" in English only
--    (the VI page showed English). Dropping it falls back to the localized defaults:
--    Life Insurance / Property & Casualty Insurance / Annuity & Retirement-Related Solutions.
--    The admin Content Editor can still set a custom list later.
update public.site_content
set content = content - 'tax_desc' - 'insurance_offerings'
where section = 'services';

-- Check: both keys gone, other keys intact.
select (content ? 'tax_desc') as has_tax_desc,
       (content ? 'insurance_offerings') as has_insurance_offerings,
       (content ? 'immigration_offerings') as has_immigration_offerings
from public.site_content where section = 'services';
