-- website_03: old links keep working after a published post's slug changes.
-- The admin editor appends each slug a public post gives up (Vietnamese or
-- English) to previous_slugs; the post page looks a slug up here only when no
-- post has it as its current slug, then permanently redirects to the current
-- one. Additive: the column inherits the blog_posts RLS policies and the
-- table-level grants from website_01, and the app works with or without it.

alter table public.blog_posts add column if not exists previous_slugs text[] not null default '{}';
