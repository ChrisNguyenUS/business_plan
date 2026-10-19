-- website_02: two new big topics (business, documents) and hashtags on blog posts.
-- Hashtag keys come from the fixed registry in src/lib/blog/tags.ts; the app is the
-- gatekeeper (admin offers only known keys, public pages ignore unknown ones).
-- The column inherits the blog_posts RLS policies and table-level grants from website_01.

alter table public.blog_posts drop constraint if exists blog_posts_category_check;
alter table public.blog_posts add constraint blog_posts_category_check
  check (category in ('tax', 'insurance', 'immigration', 'ai', 'business', 'documents', 'general'));

alter table public.blog_posts add column if not exists tags text[] not null default '{}';

-- Backfill the 12 posts published on 2026-10-19 (matched by slug_vi).
update public.blog_posts set tags = array['citizenship-test', 'form-n-400', 'uscis-fees'] where slug_vi = 'thi-quoc-tich-my';
update public.blog_posts set tags = array['citizenship-test'] where slug_vi = '128-cau-hoi-thi-quoc-tich-my';
update public.blog_posts set tags = array['citizenship-test', 'older-applicants'] where slug_vi = 'thi-quoc-tich-my-cho-nguoi-tren-65-tuoi';
update public.blog_posts set tags = array['citizenship-test'] where slug_vi = 'thi-quoc-tich-my-co-kho-khong';
update public.blog_posts set tags = array['form-n-400'] where slug_vi = 'cau-hoi-yes-no-don-n-400';
update public.blog_posts set tags = array['form-n-400', 'uscis-fees'] where slug_vi = 'don-n-400-la-gi';
update public.blog_posts set tags = array['green-card', 'uscis-fees'] where slug_vi = 'gia-han-the-xanh';
update public.blog_posts set tags = array['green-card', 'sponsor-spouse', 'uscis-fees'] where slug_vi = 'the-xanh-2-nam-len-10-nam';
update public.blog_posts set tags = array['green-card', 'travel-abroad', 'uscis-fees'] where slug_vi = 'co-the-xanh-ve-viet-nam-duoc-bao-lau';
update public.blog_posts set tags = array['green-card', 'travel-abroad', 'uscis-fees'] where slug_vi = 'mat-the-xanh-phai-lam-sao';
update public.blog_posts set tags = array['sponsor-spouse', 'family-petitions', 'uscis-fees'] where slug_vi = 'bao-lanh-vo-chong-sang-my';
update public.blog_posts set tags = array['sponsor-parents', 'family-petitions', 'uscis-fees'] where slug_vi = 'bao-lanh-cha-me-sang-my';
