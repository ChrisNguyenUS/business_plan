-- website_01: blog_posts for the public blog + admin editor (spec 2026-10-15-website-seo-blog-design).
-- The table never existed on prod; phase_b_website_tables.sql was never applied.

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug_en text unique,
  slug_vi text unique,
  title_en text,
  title_vi text,
  excerpt_en text,
  excerpt_vi text,
  content_en text,
  content_vi text,
  faq_en jsonb not null default '[]'::jsonb,
  faq_vi jsonb not null default '[]'::jsonb,
  author_name text not null default 'Manna One Solution',
  cover_image_url text,
  category text not null default 'general'
    check (category in ('tax', 'insurance', 'immigration', 'ai', 'general')),
  post_type text not null default 'article'
    check (post_type in ('article', 'guide', 'news', 'faq')),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_has_slug check (slug_en is not null or slug_vi is not null),
  constraint blog_posts_slug_en_format check (slug_en ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint blog_posts_slug_vi_format check (slug_vi ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index blog_posts_published_idx on public.blog_posts (published, published_at desc);

-- updated_at on every write; published_at stamped once, on first publish.
create function public.blog_posts_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.blog_posts_touch() from public, anon, authenticated;

create trigger blog_posts_touch
  before insert or update on public.blog_posts
  for each row execute function public.blog_posts_touch();

alter table public.blog_posts enable row level security;

-- anon: published rows only, read-only.
create policy blog_posts_select_anon on public.blog_posts
  for select to anon using (published = true);
-- signed-in: published rows, or everything for admins (drafts in /admin/blog).
create policy blog_posts_select_auth on public.blog_posts
  for select to authenticated using (published = true or (select public.is_admin()));
create policy blog_posts_insert_admin on public.blog_posts
  for insert to authenticated with check ((select public.is_admin()));
create policy blog_posts_update_admin on public.blog_posts
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy blog_posts_delete_admin on public.blog_posts
  for delete to authenticated using ((select public.is_admin()));

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.blog_posts from anon;
revoke truncate, references, trigger on public.blog_posts from authenticated;
