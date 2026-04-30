# Social Studio — Design Document

| Field | Value |
|---|---|
| **Date** | 2026-04-30 |
| **Status** | Approved (brainstorming complete) |
| **Owner** | Chris Nguyen |
| **Module** | `apps/internal_app/app/social-studio/` |
| **Track** | Track 1 (Internal App) — feature module |
| **Phase fit** | Phase 2 (Unit Tests) ongoing → Phase 3 (Integration Tests) baseline |
| **Estimate** | 5 sprints × 1 week (realistic 4-6 weeks solo) |
| **Annual cost** | ~$130 (gpt-image-2 dominant) |

---

## 1. Goals & Non-Goals

### Goals (MVP)
- Generate Instagram/Facebook/TikTok carousels with consistent brand theme.
- Apply per-service accent variations (8 services) while keeping brand identity stable.
- AI copy polish (Claude Sonnet) so writing doesn't feel "machine-like".
- Track API spend with hard monthly budget cap.
- Mobile-first UX (user checks/edits primarily on phone).
- Maintain a library of past generations for reuse and review.

### Non-Goals (MVP — deferred to Phase 2)
- Auto-posting to FB/IG/TikTok (will use N8N or similar later).
- PDF masterplan import (manual entry first 1-2 months to refine schema).
- Visual overlay editor (Konva/Fabric) — regenerate-only when AI text wrong.
- Multi-platform aspect ratios — single 4:5 size for all 3 platforms.
- Multi-user collaboration (schema-ready, UI deferred).
- Engagement tracking from social platforms.
- Custom domain `media.mannaos.com` — using `r2.dev` URLs initially.

---

## 2. User Context

- **Primary user:** Chris Nguyen (single-user MVP, schema multi-user-ready).
- **Use device:** Phone primary, laptop secondary.
- **Posting cadence:** ~30 carousels/month estimated.
- **Brand:** MannaOS / Manna One Solution — Vietnamese-American immigration services in Houston, TX.
- **Visual style reference:** "White & Paper" aesthetic — cream paper background (#FAF7F0), dark teal primary (#1F4E47), serif display + sans-serif body, bilingual VI/EN with VI primary.
- **Pain point:** Existing AI-generated carousels feel "machine-like and hard to follow" — need better writing flow + brand consistency.

---

## 3. Decisions Summary

| # | Decision | Rationale |
|---|---|---|
| **D1** | App lives as module in `apps/internal_app/social-studio/` (not separate app) | Reuse existing auth, sidebar, Supabase project, mobile layout |
| **D2** | Workflow = Library-first (no auto-post in MVP) | Auto-post via N8N later when stable |
| **D3** | Composition = Hybrid (gpt-image-2 generates text-in-image, regenerate when wrong) | gpt-image-2 handles text well; overlay editor too complex for MVP |
| **D4** | Plan lives in app + future bulk import (Phase 2) | Manual entry first for 1-2 months refinement |
| **D5** | Copy workflow = D + B fallback (plan-driven AI polish, manual draft fallback) | Refines existing draft; works without plan too |
| **D6** | Brand voice = both samples + rules | Empirical exemplars + explicit constraints |
| **D7** | 8 service themes (Option B granular) | Visual differentiation in social feed |
| **D8** | Single aspect ratio 4:5 for all platforms | Cost = 1× per slide; works on FB/IG/TikTok |
| **D9** | Cost guardrails = monthly hard cap + dashboard tracking | Predictable spend, defense in depth |
| **D10** | Storage = Cloudflare R2 (not Supabase Storage) | Free egress, ~10× cheaper at scale |
| **D11** | Database = Supabase canonical (no Sheet sync MVP) | Single source of truth; mobile UI built into app |
| **D12** | Approach = Lean MVP (Approach 1) | Ship fast, iterate; doors open to Approach 2/3 later |
| **D13** | Static brand overlays (logo + slide indicator) via sharp | Pixel-perfect brand consistency, AI focuses on content |

### Critical fixes applied during design
- **C1** Replaced `slides.current_image_id` with `generated_images.is_current BOOLEAN` + partial unique index (avoids circular FK).
- **C2** Added `caption_vi`, `caption_en`, `hashtags[]`, `cta_text` to posts.
- **C3** Dropped overlay editor — regenerate only.
- **C4** Background job pattern with `generation_jobs` table + Vercel Cron (avoids 300s function timeout).
- **C5** Atomic budget reservation via DB `UPDATE ... WHERE` clause (no race condition).
- **C6** `idempotency_key` on jobs (prevents double-charge on duplicate clicks).
- **C7** `user_id` on all tables for RLS (multi-user-ready).

---

## 4. Architecture

### 4.1 Module placement
```
apps/internal_app/
├── app/
│   ├── social-studio/                    ← Pages (App Router)
│   │   ├── layout.tsx                    Tab nav sub-layout
│   │   ├── page.tsx                      Dashboard
│   │   ├── calendar/page.tsx             Plan list/calendar
│   │   ├── posts/
│   │   │   ├── new/page.tsx              Create post form
│   │   │   └── [id]/
│   │   │       ├── page.tsx              Edit post + slides
│   │   │       └── generate/page.tsx     Generate wizard
│   │   ├── library/page.tsx              Generated carousels
│   │   ├── themes/
│   │   │   ├── page.tsx                  List
│   │   │   └── [id]/page.tsx             Edit theme + services
│   │   └── cost/page.tsx                 Usage dashboard
│   └── api/
│       └── social-studio/                ← API routes
│           ├── jobs/
│           │   ├── route.ts              POST create job
│           │   └── [id]/route.ts         GET status
│           ├── polish/route.ts           POST AI copy polish
│           ├── upload/route.ts           POST R2 upload helper
│           └── cron/
│               ├── process-jobs/route.ts Job processor (1-min)
│               ├── reap-stuck/route.ts   Stuck job reaper (5-min)
│               ├── reap-r2/route.ts      Orphan R2 file reaper (nightly)
│               ├── archive/route.ts      Old image archive (nightly)
│               └── rollover/route.ts     Monthly budget rollover
└── lib/
    └── social-studio/
        ├── prompt-builder.ts             ⭐ quality core
        ├── theme-resolver.ts             Merge theme + service + post
        ├── image-generator.ts            gpt-image-2 client + retry
        ├── copy-polisher.ts              Sonnet client + caching
        ├── overlay-compositor.ts         sharp logo + slide-num overlay
        ├── r2-client.ts                  S3-compatible R2 wrapper
        ├── cost-tracker.ts               Atomic reserve + reconcile
        ├── caption-builder.ts            Caption + hashtag logic
        └── validation.ts                 Hex/contrast/file rules
```

### 4.2 Integration with existing internal_app
- **Auth:** Reuses Supabase auth + middleware.
- **Sidebar:** New entry "Social Studio" between Jobs and Notifications.
- **DB:** Same Supabase project `ffsrlmtqzlidnuitkdvw`. Tables prefix `social_studio_*`.
- **Storage:** Cloudflare R2 bucket `mannaos-social-studio` (separate from Supabase Storage to avoid egress costs).
- **No conflicts:** Module isolated from CRM / Cases / Filing.

### 4.3 External dependencies
| Service | Purpose | Auth | Cost |
|---|---|---|---|
| OpenAI gpt-image-2 | Image generation | API key (server-only) | ~$0.04/image |
| Anthropic Sonnet 4.6 | Copy polish | API key (server-only) | ~$0.001/polish |
| Cloudflare R2 | Image storage | S3-compat API | ~$0.10/mo |
| Supabase | DB + auth | Existing | $0 marginal |
| Vercel | Hosting + cron | Existing | $0 marginal |
| Sentry | Error monitoring | API key (free tier) | $0 |

### 4.4 Environment variables (new)
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=mannaos-social-studio
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev    # MVP; custom domain Phase 2
CRON_SECRET=...                            # for cron auth header
SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...                      # source maps upload
```

---

## 5. Data Model

All tables prefix `social_studio_`. RLS enforces `auth.uid() = user_id`. Soft-delete via `deleted_at TIMESTAMPTZ` on main entities.

### 5.1 Core tables

```sql
-- Theme: brand foundation, 1 default row
CREATE TABLE social_studio_themes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id),
  name                 TEXT NOT NULL,
  primary_color        TEXT NOT NULL,           -- '#1F4E47'
  background_color     TEXT NOT NULL,           -- '#FAF7F0'
  font_serif           TEXT,                    -- 'Playfair Display'
  font_sans            TEXT,                    -- 'Inter'
  logo_url             TEXT,
  style_descriptors    TEXT,                    -- prompt prefix
  reference_image_urls TEXT[] DEFAULT '{}',
  text_tone            TEXT,                    -- friendly|formal|educational
  default_aspect_ratio TEXT DEFAULT '4:5',
  voice_sample_posts   JSONB DEFAULT '[]',      -- [{title, body, image_url, notes}]
  voice_rules          TEXT,                    -- markdown
  is_active            BOOLEAN DEFAULT true,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Services: 8 accent variations per theme
CREATE TABLE social_studio_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id        UUID NOT NULL REFERENCES social_studio_themes(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  accent_color    TEXT NOT NULL,                -- hex
  icon            TEXT,                          -- lucide name or emoji
  display_order   INT DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Posts: 1 post = 1 carousel
CREATE TABLE social_studio_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  service_id      UUID REFERENCES social_studio_services(id),
  title           TEXT NOT NULL,
  topic           TEXT,
  audience        TEXT,
  total_slides    INT NOT NULL DEFAULT 7,
  scheduled_at    TIMESTAMPTZ,
  platforms       TEXT[] DEFAULT '{}',          -- ['facebook','instagram','tiktok']
  caption_vi      TEXT,
  caption_en      TEXT,
  hashtags        TEXT[] DEFAULT '{}',
  cta_text        TEXT,
  accent_override TEXT,                         -- per-post escape hatch
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN
                  ('draft','ready','generating','generated','posted','archived')),
  posted_at       TIMESTAMPTZ,
  notes           TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Slides: per-slide content within a post
CREATE TABLE social_studio_slides (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id              UUID NOT NULL REFERENCES social_studio_posts(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id),
  slide_index          INT NOT NULL,
  slide_type           TEXT CHECK (slide_type IN ('hook','body','summary','cta')),
  copy_text            TEXT,
  copy_text_polished   TEXT,
  english_caption      TEXT,
  visual_prompt        TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, slide_index)
);

-- Generated images: versioned per slide
CREATE TABLE social_studio_generated_images (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id             UUID NOT NULL REFERENCES social_studio_slides(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id),
  image_url            TEXT NOT NULL,
  thumbnail_url        TEXT,
  prompt_used          TEXT NOT NULL,
  prompt_template_version TEXT NOT NULL,        -- e.g. 'v1.0.0'
  is_current           BOOLEAN DEFAULT true,
  generation_cost_usd  NUMERIC(10,4) NOT NULL,
  archived_at          TIMESTAMPTZ,
  generated_at         TIMESTAMPTZ DEFAULT now()
);

-- Partial unique index: only ONE current image per slide
CREATE UNIQUE INDEX uniq_current_image_per_slide
  ON social_studio_generated_images(slide_id) WHERE is_current = true;

-- Generation jobs: background processing
CREATE TABLE social_studio_generation_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  post_id             UUID NOT NULL REFERENCES social_studio_posts(id) ON DELETE CASCADE,
  idempotency_key     UUID NOT NULL UNIQUE,
  status              TEXT NOT NULL CHECK (status IN
                      ('queued','processing','completed','failed','cancelled')),
  total_slides        INT NOT NULL,
  completed_slides    INT NOT NULL DEFAULT 0,
  reserved_cost_usd   NUMERIC(10,4) NOT NULL,
  actual_cost_usd     NUMERIC(10,4),
  theme_snapshot      JSONB,                    -- frozen at creation
  error_message       TEXT,
  retry_count         INT NOT NULL DEFAULT 0,
  last_processed_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_generation_jobs_status_created
  ON social_studio_generation_jobs(status, created_at)
  WHERE status IN ('queued','processing');

-- Usage logs: cost tracking
CREATE TABLE social_studio_usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  operation    TEXT NOT NULL CHECK (operation IN
               ('image_generate','copy_polish','overlay_render')),
  model        TEXT NOT NULL,                   -- 'gpt-image-2', 'claude-sonnet-4-6'
  cost_usd     NUMERIC(10,4) NOT NULL,
  tokens_in    INT,
  tokens_out   INT,
  metadata     JSONB,                           -- {post_id?, slide_id?, image_id?, retry_count?}
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_logs_user_month
  ON social_studio_usage_logs(user_id, date_trunc('month', created_at));

-- Settings: budget config (singleton per user)
CREATE TABLE social_studio_settings (
  user_id                    UUID PRIMARY KEY REFERENCES auth.users(id),
  monthly_budget_usd         NUMERIC(10,2) DEFAULT 30.00,
  hard_stop_enabled          BOOLEAN DEFAULT true,
  current_month_spend_cache  NUMERIC(10,4) DEFAULT 0,
  current_month              TEXT NOT NULL,     -- 'YYYY-MM'
  updated_at                 TIMESTAMPTZ DEFAULT now()
);

-- R2 audit: track uploads for orphan reaper
CREATE TABLE social_studio_r2_uploads_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key   TEXT NOT NULL UNIQUE,
  size_bytes   INT,
  uploaded_at  TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 RLS policies (sketch)
```sql
-- Example for posts; same pattern on all main tables
ALTER TABLE social_studio_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_select_own ON social_studio_posts
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY posts_insert_own ON social_studio_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY posts_update_own ON social_studio_posts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY posts_delete_own ON social_studio_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Service role bypasses RLS for cron jobs (uses service_role key)
```

### 5.3 R2 storage layout
```
mannaos-social-studio (R2 bucket, public)
├── themes/{theme_id}/logo.png
├── themes/{theme_id}/references/{n}.png
├── voice-samples/{theme_id}/{n}.png
└── slides/{post_id}/{slide_id}/
    ├── {image_id}.png            (full)
    └── {image_id}_thumb.webp     (400px webp for library grid)
```

URLs returned: `https://pub-xxxxx.r2.dev/{path}` (MVP). Custom domain Phase 2.

### 5.4 Migrations order
```
00X_social_studio_schema.sql        -- 8 tables + indexes
00X+1_social_studio_rls.sql         -- RLS policies
```

**Seeding is runtime, not migration.** Default theme + 8 services are user-scoped (require `user_id`), so they're seeded by `lib/social-studio/onboarding.ts` on first user access (Section 8.9). The SQL shown in Section 7.3 is illustrative of the seed function output, not a migration file.

`r2_uploads_audit` is **service-role-only** (no `user_id`, no RLS); accessed only by cron jobs and the saga compensating logic via the service role key. This is documented in the migration comment block.

---

## 6. Generation Pipeline & Prompt Builder

### 6.1 Background job flow

```
USER (browser/phone)
  │
  │ POST /api/social-studio/jobs
  │ body: { post_id, idempotency_key (UUID) }
  ▼
API ROUTE (sync, < 1s)
  │ 1. Idempotency check (SELECT WHERE key = ?)
  │ 2. Atomic budget reserve (UPDATE WHERE cache + cost <= budget)
  │ 3. INSERT generation_jobs (status='queued', theme_snapshot)
  │ 4. Return { job_id, status: 'queued' }
  ▼
CLIENT polls /api/social-studio/jobs/[id] every 5s

VERCEL CRON every 1min → /api/social-studio/cron/process-jobs
  │ 1. SELECT ... FOR UPDATE SKIP LOCKED LIMIT 5
  │    WHERE status IN ('queued','processing')
  │ 2. For each job, process up to 2 slides per tick:
  │    a. Build prompt (Section 6.2)
  │    b. Call gpt-image-2 with retry
  │    c. Sharp: composite logo + slide indicator overlay
  │    d. Upload to R2 (record in r2_uploads_audit)
  │    e. Sharp thumbnail → R2
  │    f. BEGIN TX:
  │         INSERT generated_images (is_current=true, others false)
  │         INSERT usage_log
  │         UPDATE jobs.completed_slides
  │       COMMIT (compensate R2 delete on rollback)
  │    g. Update jobs.last_processed_at
  │ 3. When completed_slides == total_slides:
  │    - status='completed', UPDATE post.status='generated'
  │    - Reconcile reserved vs actual cost
```

**Why background not sync:** 8 slides × ~30-60s each = 240-480s, exceeds Vercel function 300s timeout. Cron 1-min ticks processing 2 slides each stays under timeout.

### 6.2 Prompt builder template

File: `lib/social-studio/prompt-builder.ts`

Function signature:
```ts
buildSlidePrompt({
  theme: ThemeRow,
  service: ServiceRow,
  post: PostRow,
  slide: SlideRow,
  previousSlideImageUrl?: string,
}): { prompt: string, referenceImageUrls: string[] }
```

Template structure (5 blocks):
```
[STYLE BLOCK — from theme.style_descriptors]
A 4:5 aspect ratio social media slide. White & Paper aesthetic:
cream paper texture background ({theme.background_color}), minimalist,
clean lines, professional, calm. Mix of {theme.font_serif} display
font for emphasis numbers and {theme.font_sans} sans-serif for body.

[LAYOUT BLOCK — varies by slide.slide_type]
{LAYOUT_TEMPLATES[slide.slide_type]}

[CONTENT BLOCK]
Vietnamese headline (large serif, color {theme.primary_color}):
"{slide.copy_text_polished}"

English caption (small italic sans-serif, bottom of slide, muted gray):
"{slide.english_caption}"

[VISUAL BLOCK]
{slide.visual_prompt or layout-default}
Use accent color {resolvedAccentColor} for icon, emphasis numbers,
decorative elements. Title in {theme.primary_color}.

[NEGATIVE BLOCK]
Leave top-left and top-right corners CLEAR — logo and slide number
will be added later. NO watermarks. NO stock-photo people unless
visual_prompt requests. NO English in headline. NO heavy gradients.
NO neon. NO 3D. Maintain paper-flat aesthetic.
```

Layout templates per `slide_type`:
- **hook:** Large emphasis number or question top-left, supporting text below. Small relevant icon. White space dominant.
- **body:** Icon + title at top, body text middle, large emphasis number on right when present.
- **summary:** Table-style 2-column comparison or checklist. Header row primary color, data rows on cream.
- **cta:** Full logo prominent left/center. Tagline. Checkmark list 3-5 items. Contact icons (Messenger/Web/Location). City visible.

Reference images injection:
```ts
referenceImageUrls = [
  theme.logo_url,                              // brand
  ...theme.reference_image_urls.slice(0, 2),   // style
  ...(previousSlideImageUrl ? [previousSlideImageUrl] : []), // continuity
]
```

Versioned via `prompt_template_version` constant; bumped when template changes. Stored in `generated_images` for traceability.

### 6.3 Static brand overlay

After gpt-image-2 returns raw PNG, sharp pipeline:
1. Load raw PNG buffer.
2. Composite logo at top-right (fixed offset, scaled to 8% of canvas width).
3. Composite slide indicator text "{idx+1}/{total}" at top-left (fixed font: Inter 14px, color #888).
4. Generate 400px webp thumbnail.
5. Upload composite + thumbnail to R2.

Cost: $0 (sharp local), latency ~50ms/slide.

**Why this matters:** Reference image showed pixel-identical logo + slide number across all 8 slides. AI generation drifts. Static overlay = brand consistency 100%.

### 6.4 AI copy polish (Sonnet)

File: `lib/social-studio/copy-polisher.ts`

```ts
polishCopy({
  raw_copy, slide_type, service, theme,
}): Promise<{ polished_text: string; alternatives: string[] }>
```

Sonnet system prompt:
```
You are a Vietnamese-American social media copywriter for an immigration
services brand (MannaOS / Manna One Solution).

VOICE REFERENCE (mimic style):
{theme.voice_sample_posts as text}

RULES:
{theme.voice_rules}

CONTEXT: Service={service.name}, SlideType={slide_type}

TASK: Rewrite the input copy to be:
- Less robotic, more natural Vietnamese
- Easier to follow flow (hook = clear question, body = step-by-step)
- Maintain factual accuracy (no embellishment)
- Stay under 40 words for body, 20 for hook
- Match voice samples' tone

Return JSON: {"polished_text":"...","alternatives":["...","..."]}
```

Cache key: `SHA256(raw_copy + voice_samples_hash + voice_rules_hash + slide_type + service.id)`. Hit = $0. Service id included because polish output depends on service-context system prompt.

### 6.5 Cost model

| Operation | Model | Cost/call | Per 8-slide carousel |
|---|---|---|---|
| Image gen | gpt-image-2 high quality 4:5 | ~$0.04 | $0.32 |
| Copy polish | Claude Sonnet 4.6 | ~$0.001 | ~$0.008 |
| Thumbnail | sharp local | $0 | $0 |
| Overlay | sharp local | $0 | $0 |
| **Total** | | | **~$0.33** |

30 carousels/month × $0.33 = **~$10/mo**. Well under default $30 budget.

### 6.6 Vercel Cron schedule (`vercel.ts`)

```ts
crons: [
  { path: '/api/social-studio/cron/process-jobs', schedule: '*/1 * * * *' },
  { path: '/api/social-studio/cron/reap-stuck',   schedule: '*/5 * * * *' },
  { path: '/api/social-studio/cron/reap-r2',      schedule: '0 3 * * *' },
  { path: '/api/social-studio/cron/archive',      schedule: '0 4 * * *' },
  { path: '/api/social-studio/cron/rollover',     schedule: '0 0 1 * *' },
]
```

All cron handlers verify `Authorization: Bearer ${CRON_SECRET}` header.

---

## 7. Theme Application & Service Variations

### 7.1 Three-layer inheritance

```
Theme (1 main)         ← brand-locked: colors, fonts, logo, voice, style
   ↓
Service (8 variations) ← accent_color override, icon hint
   ↓
Post (optional)        ← accent_override escape hatch (rare campaigns)
```

`resolveThemeContext()` merges these into a flat `ThemeContext` consumed by `prompt-builder`.

### 7.2 Accent application — exactly what changes

**Changes (4 things):**
- Title text color
- Icon color
- Large emphasis number color
- Decorative dividers/lines color

**Stays identical** (brand consistency):
- Background paper texture (#FAF7F0)
- Body text color (dark gray)
- English caption (muted gray italic)
- Logo (static overlay, identical)
- Slide indicator (static overlay, identical font/color/position)
- Layout structure
- Font family

Result: feed scrolling identifies brand instantly via paper+layout+logo, accent tells user **which service** in <0.3s.

### 7.3 Default seed (8 services)

```sql
INSERT INTO social_studio_services (slug, name, accent_color, icon, display_order) VALUES
  ('brand',               'Brand / Personal',          '#1F4E47', 'sparkles',     1),
  ('citizenship',         'Citizenship (N-400)',       '#B5392C', 'flag',         2),
  ('green-card',          'Green Card / Family',       '#7A8B3F', 'home-heart',   3),
  ('work-travel',         'Work / Travel Permit',      '#D4942A', 'briefcase',    4),
  ('general-immigration', 'General Immigration',       '#1F4E47', 'globe',        5),
  ('tax',                 'Tax Service',               '#8B5A3C', 'receipt',      6),
  ('insurance',           'Insurance',                 '#2C4A6B', 'shield-check', 7),
  ('ai',                  'AI Services',               '#5A4A9B', 'cpu',          8);
```

### 7.4 Voice training

Voice samples + rules stored on `social_studio_themes`. Passed verbatim to Sonnet for every polish call. Cost ~500 tokens × $0.003/1k = $0.0015/polish, cached aggressively.

### 7.5 Validation rules
- `accent_color`: valid hex, contrast ratio ≥3.0 vs background (warn, not block).
- `reference_image_urls`: max 5, each ≤5MB.
- `voice_sample_posts`: max 10 entries.
- `voice_rules`: max 2000 chars.
- `default_aspect_ratio`: in {'4:5','1:1','9:16'}.
- Logo upload: PNG with transparent bg required (sharp alpha-channel check).

### 7.6 Edge cases

| Case | Behavior |
|---|---|
| Service deleted while post references it | Soft-delete only (`deleted_at`); post keeps reference, accent still resolved |
| Theme updated after carousel generated | Old generations keep their original prompt (logged); future use new theme |
| Service `accent_color` changed | Future generations only; UI banner: "Regenerate posts to apply" |
| Voice samples updated | Cache key includes hash → invalidates that family |
| Reference image 404 on next gen | Log warning, skip that ref, continue with remaining |
| Logo upload without transparent bg | Reject on upload with clear error |
| Accent color contrast < 3.0 | Warn (yellow banner), allow if user confirms |

---

## 8. Error Handling & Reliability

### 8.1 External API failures

| Class | Strategy | Cost impact |
|---|---|---|
| Rate limit (429) | Exponential backoff: 5s/15s/45s, max 3 retries; then fail + refund | Refund |
| Transient network/5xx | Same retry policy | Refund |
| Safety refusal (400) | NO retry; surface reason to user; "edit copy & retry" UX | Refund |
| Invalid prompt (our bug) | NO retry; log Sentry; alert | Refund |
| Slow but successful | No retry; accept latency | Charged once |
| Sonnet invalid JSON | Retry once with stricter system prompt; fallback to raw copy | $0.001 wasted |

### 8.2 Stuck jobs (heartbeat + reaper)

- Each cron tick processing a job: `UPDATE last_processed_at = now()`.
- Reaper cron (5 min): `UPDATE jobs SET status='queued', retry_count++ WHERE status='processing' AND last_processed_at < now() - INTERVAL '3 minutes' AND retry_count < 3`.
- After 3 reaper retries: `status='failed'` with error "stuck — exceeded retry limit"; refund unused budget.

### 8.3 Data consistency (saga pattern)

R2 + DB ordering for each slide:
```
1. Generate (gpt-image-2)              → in-memory PNG
2. Sharp composite (logo + indicator)   → in-memory PNG
3. Upload composite to R2              → record in r2_uploads_audit
4. Upload thumbnail to R2              → record in r2_uploads_audit
5. BEGIN TX
6.   INSERT generated_images (is_current=true)
7.   UPDATE other rows is_current=false
8.   INSERT usage_log
9.   UPDATE jobs.completed_slides += 1
10. COMMIT
11. On COMMIT failure: delete R2 objects (compensating)
```

Nightly orphan reaper finds R2 objects in audit table without matching DB row > 24h old → deletes from R2.

### 8.4 Race conditions

| Race | Fix |
|---|---|
| 2 cron ticks pick same job | `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 5` |
| User regenerates while job running | UI disables Generate when `job.status IN ('queued','processing')`; server validates same |
| User deletes post mid-generation | Soft-delete; processor checks `deleted_at IS NULL` before each slide; cancel job + refund if deleted |
| Theme update mid-generation | `theme_snapshot JSONB` frozen at job creation |
| Idempotency replay | UNIQUE constraint on `idempotency_key` |
| Budget cap | Atomic `UPDATE ... WHERE cache + cost <= budget` |

### 8.5 Cost reconciliation

- Reserve = `total_slides × $0.04` at job creation.
- Each slide success: actual_cost += real cost; refund unused at slide level if failed.
- Job complete: reconcile reserved vs actual; refund delta.
- Monthly rollover (1st 00:00 UTC): reset `current_month_spend_cache=0`, update `current_month`.
- Cross-month edge case: bill against `usage_log.created_at` month, not `job.created_at`.

### 8.6 User-facing error UX

Every route has 3 states: loading (skeleton), empty (illustration + CTA), error (red banner + retry button).

Generation-specific:
- "Budget exceeded" → modal: spent / total + [Increase budget] [Wait until {next_month}]
- "AI refused content" → slide-level: reason + [Edit copy & retry] [Skip]
- "Generation failed (3 retries)" → [Retry] [Report bug]
- "Network offline" → toast: "Generation paused, will resume."

### 8.7 Security boundaries

| Threat | Mitigation |
|---|---|
| Cron endpoint hit externally | `Authorization: Bearer ${CRON_SECRET}` header check |
| R2 public bucket — PII leak | Insert/update validation: regex blocks SSN, A-number, DOB patterns; warn on voice samples upload |
| XSS in copy text | React auto-escape; never `dangerouslySetInnerHTML` on user content |
| SQL injection | Supabase client / parameterized queries only |
| R2 credential leak | Server-only env vars; never returned in API responses |
| Idempotency replay | UUID v4 keys; collision negligible |

### 8.8 Monitoring

Sentry from MVP (free tier 5k events/month). Instrument:
- All API route exceptions
- Cron job exceptions
- Job failure transitions
- R2 upload failures
- Performance: track p50/p95 of `gpt-image-2` calls

Alerts:
- Unhandled exceptions
- Job failure rate > 20% / 1h
- gpt-image-2 p95 latency > 90s
- Budget hit hard cap (info)

### 8.9 Onboarding (first-run)

1. Check `social_studio_themes WHERE user_id = auth.uid()` count = 0 → seed default theme + 8 services.
2. Redirect to `/social-studio/themes/{default_id}` with banner: "Welcome! Configure your brand below."
3. Required fields highlighted (logo, voice samples, voice rules) — must fill before first generation.
4. After save → `/social-studio/posts/new`.

---

## 9. Testing Strategy

### 9.1 Pyramid

- ~80 unit tests (pure functions, mocked APIs)
- ~30 integration tests (real local Supabase, mocked external APIs)
- 1 manual visual QA corpus (5-10 prompts, ~$0.30/run, weekly)
- 0 E2E (deferred to Phase 5 per CLAUDE.md phase boundaries)

Tools: **Vitest** + Supabase local instance + MSW for fetch mocking.

### 9.2 Critical unit tests

```
prompt-builder.test.ts
  - all 5 blocks present
  - accent_color substituted correctly
  - corner-clear negative block included
  - slide N-1 ref injected for N>1
  - deterministic snapshot for fixed input

theme-resolver.test.ts
  - post.accent_override > service.accent_color > theme.primary_color
  - voice fields always from theme

cost-tracker.test.ts (uses real Postgres)
  - atomicReserve true when budget allows
  - atomicReserve false at boundary
  - concurrent reservations respect cap (key test for C5)
  - refund reverses reservation
  - monthly rollover resets cache
```

### 9.3 Critical integration tests

```
jobs-lifecycle.test.ts        full flow queued→processing→completed
idempotency.test.ts           duplicate key returns same job (C6)
budget-race-condition.test.ts 10 concurrent reservations, only some accepted (C5)
saga-rollback.test.ts         R2 cleanup when DB insert fails
rls-isolation.test.ts         user A cannot see user B posts (C7)
stuck-job-reaper.test.ts      processing > 3min → re-queued
monthly-rollover.test.ts      cron resets cache correctly
soft-delete-cascade.test.ts   service soft-delete preserves post FK
```

### 9.4 Manual visual QA process (per release, ~1 hour)

1. Run script `pnpm test:visual-qa` → generates 5-10 reference prompts → real gpt-image-2 calls (~$0.30 total).
2. Eyeball output against `__tests__/visual-corpus/reference-images/`:
   - Layout match
   - Accent color correct
   - Corners empty (logo/slide-num overlay space)
   - Text quality (Vietnamese chars correct, no typos)
   - Bilingual structure correct
3. Pass/fail per prompt. Fail → freeze release, iterate prompt template.

### 9.5 Coverage targets (soft, not CI gates)

- prompt-builder: 90%+
- cost-tracker: 95%+
- theme-resolver: 90%+
- API routes: 70%+
- Cron handlers: 80%+
- UI components: not measured

### 9.6 Skipped (MVP)

E2E (Playwright), visual regression, snapshot tests, perf benchmarks, load tests, cross-browser. Add when use proves a category needs it.

---

## 10. Implementation Plan

### 10.1 Pre-flight checklist (before Sprint 1 start)

| # | Item | Owner |
|---|---|---|
| 1 | Cloudflare R2 bucket `mannaos-social-studio` | User |
| 2 | R2 API token (read+write) | User |
| 3 | OpenAI API key with gpt-image-2 access | User |
| 4 | Anthropic API key (Sonnet) | User |
| 5 | Sentry project `mannaos-internal-app` | User |
| 6 | Logo PNG (transparent bg, ≥1024px wide) | User |
| 7 | 5-10 voice sample posts (text + screenshots) | User |
| 8 | Voice rules drafted (1-page markdown) | User |
| 9 | 2-3 reference style images | User |
| 10 | Vercel staging vs prod env vars plan | User |

### 10.2 Sprint 1 — Foundation (Week 1-2)

**Goal:** Module accessible, can create + save + list posts; no AI yet.

- Migration 1: schema (8 tables + indexes)
- Migration 2: RLS policies
- Migration 3: seed (default theme + 8 services)
- R2 client wrapper + smoke test
- Sidebar nav entry; `/social-studio` dashboard placeholder; auth gate
- New post form (`/posts/new`)
- Posts list (dashboard + simple list)
- Edit post page stub
- Unit tests for theme-resolver, validation

**DoD:** Login → Social Studio → empty list → create → edit → save → reflected. Migrations clean on staging. No Sentry errors.

### 10.3 Sprint 2 — Theme + Generation Core (Week 3)

**Goal:** Generate ONE slide successfully with theme.

- Theme editor UI (collapsible sections)
- Service variations subsection (8 accent pickers)
- Voice samples upload + voice rules editor
- `prompt-builder.ts` (full template + unit tests)
- gpt-image-2 client (`image-generator.ts`) + retry
- `overlay-compositor.ts` (sharp logo + slide indicator)
- Slide editor on post page
- "Generate this slide" sync flow
- Visual QA corpus v1 (5 references)

**DoD:** Click Generate on slide → 30-60s → image with logo+indicator overlaid; accent color visible; manual QA 4/5 pass.

**Risk:** Prompt quality. Buffer 2 days. Iterate before Sprint 3.

### 10.4 Sprint 3 — Background Jobs + Cost (Week 4)

**Goal:** Reliable carousel generation with cost guardrails.

- Migration: `generation_jobs` + `r2_uploads_audit`
- `POST /api/jobs` (idempotency + atomic budget reserve)
- `/cron/process-jobs` (1-min tick, 2 slides/iteration)
- Saga rollback + R2 reaper
- Heartbeat reaper for stuck jobs
- `GET /api/jobs/[id]` polling
- Generate wizard UI (cost preview + progress)
- Cost dashboard page
- Integration tests (lifecycle, idempotency, races, saga)

**DoD:** Click Generate carousel → preview cost → progress 1/8...8/8 → review screen. Concurrent gen → only 1 job (idempotency). Budget=$1 → 4 carousels later blocked. Refund correct on partial fail.

### 10.5 Sprint 4 — UX Completion (Week 5)

**Goal:** Full daily workflow polished.

- Calendar/list view (mobile-first)
- Library grid + thumbnails
- Carousel viewer (swipeable full-screen)
- AI copy polish integration (per-slide + polish-all)
- Caption + hashtag fields + AI suggest captions
- "Mark as posted" + status transitions
- PWA manifest + offline awareness
- Image regeneration (slide + carousel level)
- Empty states + skeletons
- A11y pass

**DoD:** End-to-end create→polish→generate→review→fix→post in ≤5 min (excluding gen wait). Mobile Lighthouse Perf ≥85, A11y ≥90. PWA installable on iOS Safari.

### 10.6 Sprint 5 — Hardening + Launch (Week 6)

**Goal:** Production-ready.

- Sentry instrumentation (API, cron, UI error boundary)
- Error states across all routes
- Visual QA corpus v2 (10-prompt suite + procedure docs)
- Bug bash (full workflow on real device)
- Bug fixes
- Performance review (bundle size, lazy load)
- Ops runbook (theme update, monthly reset, manual job retry)
- Production env vars + deploy
- Smoke test on prod
- Update `docs/ROADMAP.md`

**DoD:** Deployed to prod. 0 P0 bugs. Sentry receiving. Cost dashboard shows real spend. User can create carousel from phone end-to-end.

### 10.7 Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| gpt-image-2 prompt quality below expectation | Medium | High | Sprint 2 buffer; manual QA early |
| R2 setup friction | Low | Medium | Pre-flight forces verify |
| Vercel cron frequency limit | Low | Medium | Test in Sprint 1; plan B Supabase pg_cron |
| Cost spike from regeneration | Medium | Medium | Hard cap default $30; alerts at 80% |
| Scope gap discovered during use | High | Variable | Phase 2 backlog open; MVP focuses core |
| Sonnet polish too aggressive | Medium | Low | Show diff, user rejects; iterate rules |
| Safety refusal on legal content | Low | Medium | Test corpus includes immigration; add safety-soft phrasing rules |
| Mobile UX falls short | Medium | High | Real device testing each sprint; Lighthouse mobile ≥85 |

---

## 11. Costs

### 11.1 Annual operating cost

| Category | Monthly | Annual |
|---|---|---|
| gpt-image-2 (~30 carousels × $0.32) | ~$10 | $120 |
| Sonnet polish (~30 × $0.008) | ~$0.25 | $3 |
| R2 storage (year-1 accumulation) | ~$0.10-0.50 | $5 |
| R2 ops | ~$0.10 | $1 |
| Cloudflare account | $0 | $0 |
| Sentry free tier | $0 | $0 |
| Supabase / Vercel marginal | $0 | $0 |
| **TOTAL** | **~$10-12** | **~$130** |

### 11.2 Test/QA cost

| | Cost | Frequency |
|---|---|---|
| Unit tests | $0 | Every commit |
| Integration tests | $0 | Every commit |
| Manual visual QA | ~$0.30 | Per release |
| Real API smoke before deploy | ~$0.05 | Optional |

Annual test cost ~$15-30.

---

## 12. Phase 2 Backlog

Build only when triggered by real usage signal.

| Item | Trigger | Effort |
|---|---|---|
| PDF masterplan import | Bulk import 10+ posts needed | 3-5 days |
| Google Sheet 1-way export | VA hire / heavy phone-check | 1-2 days |
| Visual overlay editor (Konva) | Regenerate cost ≥ $5/mo from text errors | 7-10 days |
| Multi-platform aspect ratios | Serious TikTok or IG Story | 3-4 days |
| N8N auto-post integration | Daily manual posting tedious | Outside this app |
| Engagement tracking | Iterate based on FB/IG analytics | 5-7 days |
| Custom domain `media.mannaos.com` | URL pretty-up | 2 hours |
| Multi-user collaboration | VA joins workflow | ~3 days UI |
| Theme A/B testing | Want to test variations | 1 week |
| Auto-translate VI→EN | Caption typing tedious | 1-2 days |

---

## 13. Open Items

None blocking. Pre-flight checklist (Section 10.1) must be completed before Sprint 1 begins.

---

## 14. Success Definition

End of Sprint 5:

User opens phone Saturday morning, taps "MannaOS Internal" PWA on home screen, taps "Social Studio". Sees 3 posts scheduled this week. Taps N-400 post — AI has polished copy. Skims, tweaks one line, taps Generate. Cost preview $0.32. Confirms. 5 minutes later, 8 slides ready. Swipes through review, regenerates slide 4 (Vietnamese typo), waits 30s, OK now. Taps Mark as Posted (will post FB/IG/TikTok manually for now; N8N automation later). Carousel saved to library tagged with red N-400 accent for fast retrieval. Total active time: 5 minutes. Brand consistency: 100%. Budget: $9.60/$30 used.

That's the win.

---

## Appendix A — Reference image analysis (user-supplied)

The 7-slide visa overstay carousel established baseline brand:
- Background: cream paper texture
- Primary: dark teal (~#1F4E47, matches logo "M")
- Typography: serif display for emphasis numbers ("10 NĂM", "180 NGÀY"); sans-serif body
- Layout pattern: slide # top-left, logo top-right, icon + title, body, English italic caption bottom
- Final slide: full logo + checkmark list + contact methods (Messenger/Web/Location)
- Bilingual: VI primary, EN italic secondary

User feedback: writing felt machine-like, slide flow hard to follow → motivated AI copy polish + slide_type templates.

## Appendix B — Decision log

| Date | Decision | Override / Rationale |
|---|---|---|
| 2026-04-30 | All 13 decisions D1-D13 | See Section 3 |
| 2026-04-30 | Senior-engineer self-review identified 7 critical + 6 major + 8 minor issues; all resolved before doc finalization | See Section 3 critical fixes summary |
