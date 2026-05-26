# N400 App — Phase 2: Audio Pipeline (Pre-Recorded Voices)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload owner's pre-recorded MP3 voice files to Supabase Storage and backfill `*_audio_url` columns across `n400_questions`, `n400_answers`, `n400_location_answers`, and `n400_representatives`.

> **Important change vs. earlier draft of this plan:** Audio is **NOT generated via Google Cloud TTS anymore.** The owner has personally recorded all voice files and stored them under `apps/website/N400_voice/`. Phase 2 is now an upload + DB-backfill job, not a synthesis job. All Google Cloud TTS dependencies, service-account setup, and synthesis scripts have been removed.

---

## v1 audio scope

| Source | Files | DB column | Status |
|---|---|---|---|
| `N400_voice/question/q001…q128.mp3` | 128 | `n400_questions.question_audio_url` | ✅ recorded |
| `N400_voice/answer/a###.mp3` (one canonical per question) | 79 | `n400_answers.answer_audio_url` (attached to first `is_correct=true` row, ordered by `display_order, id`) | ✅ recorded (sparse by design) |
| `N400_voice/State/<State>/Senator voice/<First_Last>.mp3` | 100 (50 × 2) | `n400_location_answers.answer_audio_url` (Q23) | ✅ recorded |
| `N400_voice/State/<State>/House of rep/<District>/<First_Last>.mp3` | 441 (435 House + 6 territorial delegates) | `n400_representatives.rep_audio_url` (Q29) | ✅ recorded |
| `N400_voice/State/<State>/Capital/capital-<XX>.mp3` | 50 | `n400_location_answers.answer_audio_url` (Q62) | ✅ recorded (all 50 states including Texas) |
| `N400_voice/State/<State>/Governor/<First_Last>.mp3` | 56 (50 states + 6 territories) | `n400_location_answers.answer_audio_url` (Q61) | ✅ recorded |

Total: 854 files, ~30–45 MB. Verified on disk 2026-05-21.

**Why answers are sparse (~79 instead of ~500):** owner records one canonical correct-answer audio per question (the most common phrasing), not every accepted answer variant. The quiz UI plays the canonical audio whenever any correct answer is selected. Storage column for non-canonical correct rows stays NULL.

---

## Architecture

- One-time upload script in `apps/website/scripts/n400/`.
- Files served from Supabase Storage bucket `n400-audio/` (public read, admin write).
- Storage layout mirrors source layout (flattened):
  - `questions/q001.mp3` … `q128.mp3`
  - `answers/a001.mp3` … `a128.mp3` (sparse)
  - `senators/{STATE_CODE}/{slug}.mp3`
  - `reps/{STATE_CODE}/{district_number}/{slug}.mp3`
  - `capitals/capital-{STATE_CODE}.mp3`
  - `governors/{STATE_CODE}/{slug}.mp3`
- Script is **idempotent** (`upsert: true` on storage; `UPDATE … WHERE id = …` on DB rows). Safe to re-run after adding/fixing files.

**Tech Stack:** `@supabase/supabase-js`, `tsx`, Node `fs`/`path`. **No Google Cloud SDK.**

**Prerequisite:** Phase 1 complete (128 questions + answers + 56 jurisdictions in `n400_state_data` + 441 reps in DB). Owner's recordings present in `apps/website/N400_voice/`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `scripts/n400/build-audio-manifest.ts` | Create | Walk `N400_voice/`, produce a manifest mapping each local MP3 → storage path → DB target. Reports missing/orphan files. |
| `scripts/n400/upload-audio.ts` | Create | Read manifest, upload each file to Supabase Storage, backfill the matching DB column. |
| `scripts/n400/audio-manifest.json` | Generated (gitignored) | Output of build step; input to upload step. |

---

## Task 1: Decide on `N400_voice/` storage policy + bucket setup

**Files:**
- Modify: `apps/website/.gitignore` (or root `.gitignore`)

- [x] **Step 1: Decide whether `N400_voice/` is committed**

The folder currently sits at `apps/website/N400_voice/` (~30–40 MB across ~790 MP3s).

Recommended: **commit the folder** for now. It's small enough, gives any contributor a reproducible upload step, and means re-running Phase 2 after a DB reset is one command. Revisit if the repo gets uncomfortably large.

If you'd rather keep it out of git, add to `.gitignore`:

```
apps/website/N400_voice/
```

- [x] **Step 2: Always-gitignore the manifest**

Add to `.gitignore`:

```
apps/website/scripts/n400/audio-manifest.json
```

The manifest is a derived artifact (rebuilt from `N400_voice/` on every run).

- [x] **Step 3: Create Supabase Storage bucket**

In Supabase dashboard for project `ffsrlmtqzlidnuitkdvw`:
1. Storage → New bucket
2. Name: `n400-audio`
3. Public: ✅ (files served via CDN)
4. File size limit: 1 MB
5. Allowed MIME types: `audio/mpeg`

- [x] **Step 4: Apply Storage RLS policies**

Run once in Supabase SQL Editor:

```sql
-- Public read for n400-audio bucket
CREATE POLICY "n400-audio public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'n400-audio');

-- Admin write only
CREATE POLICY "n400-audio admin write" ON storage.objects
  FOR ALL
  USING      (bucket_id = 'n400-audio' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (bucket_id = 'n400-audio' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
```

- [x] **Step 5: Commit `.gitignore` change**

```bash
git add apps/website/.gitignore   # or root .gitignore
git commit -m "chore(n400): gitignore audio manifest output"
```

---

## Task 2: Build audio manifest from local folder

**Files:**
- Create: `apps/website/scripts/n400/build-audio-manifest.ts`

This script walks `apps/website/N400_voice/`, matches every MP3 to a DB target, and writes `audio-manifest.json`. It also reports:
- **Missing** entries — DB rows that should have audio but no file was found (e.g., Texas capital).
- **Orphans** — files whose name doesn't match any DB row (typo, renamed politician, etc.).

The owner reviews the report before the upload step runs.

- [x] **Step 1: Add a small slug helper**

Create `apps/website/scripts/n400/slug.ts`:

```typescript
// Normalize a politician name to the filename slug convention used in N400_voice/.
// "Robert F. Kennedy Jr." → "Robert_F_Kennedy_Jr"
// "Mary O'Brien"          → "Mary_OBrien"
// "Jean-Pierre Smith"     → "Jean_Pierre_Smith"
export function nameToSlug(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^A-Za-z0-9]+/g, '_')                     // collapse non-alnum to _
    .replace(/^_+|_+$/g, '')                            // trim
}

// Inverse: filename stem → comparable name. Lowercased + collapsed for matching.
export function slugKey(s: string): string {
  return s.replace(/[^A-Za-z0-9]+/g, '').toLowerCase()
}

// Convert a House district folder name to a number.
// "1st" → 1, "2nd" → 2, "At_Large" / "At Large" → 0
export function districtFromFolder(name: string): number | null {
  const at = name.replace(/[_\s-]/g, '').toLowerCase()
  if (at === 'atlarge') return 0
  const m = name.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : null
}
```

- [x] **Step 2: Create manifest builder**

Create `apps/website/scripts/n400/build-audio-manifest.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { existsSync, readdirSync, statSync, writeFileSync } from 'fs'
import { resolve, basename, extname } from 'path'
import { nameToSlug, slugKey, districtFromFolder } from './slug'

const VOICE_ROOT = resolve(__dirname, '..', '..', 'N400_voice')
const MANIFEST_PATH = resolve(__dirname, 'audio-manifest.json')

type Entry =
  | { kind: 'question'; questionId: number; localPath: string; storagePath: string }
  | { kind: 'answer';   questionId: number; localPath: string; storagePath: string }
  | { kind: 'location_answer'; locationAnswerId: string; localPath: string; storagePath: string }
  | { kind: 'representative';  stateCode: string; districtNumber: number; localPath: string; storagePath: string }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function listMp3(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => extname(f).toLowerCase() === '.mp3')
}

function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => statSync(resolve(dir, f)).isDirectory())
}

async function main() {
  const entries: Entry[] = []
  const missing: string[] = []
  const orphans: string[] = []

  // ── 1. Questions: q001.mp3 … q128.mp3 ──
  const { data: questions, error: qErr } = await supabase
    .from('n400_questions')
    .select('id')
    .order('id')
  if (qErr || !questions) throw new Error(`Load questions failed: ${qErr?.message}`)

  const qDir = resolve(VOICE_ROOT, 'question')
  const qFiles = new Set(listMp3(qDir))
  for (const q of questions) {
    const fname = `q${String(q.id).padStart(3, '0')}.mp3`
    if (qFiles.has(fname)) {
      entries.push({
        kind: 'question',
        questionId: q.id,
        localPath: resolve(qDir, fname),
        storagePath: `questions/${fname}`,
      })
      qFiles.delete(fname)
    } else {
      missing.push(`question Q${q.id} → expected ${fname}`)
    }
  }
  for (const leftover of qFiles) orphans.push(`question/${leftover}`)

  // ── 2. Answers: a###.mp3 keyed by question_id (sparse — one canonical per question) ──
  const aDir = resolve(VOICE_ROOT, 'answer')
  const aFiles = new Set(listMp3(aDir))
  for (const q of questions) {
    const fname = `a${String(q.id).padStart(3, '0')}.mp3`
    if (!aFiles.has(fname)) continue   // sparse by design
    aFiles.delete(fname)

    // Attach to first is_correct=true row for this question (excluding location-based).
    const { data: row } = await supabase
      .from('n400_answers')
      .select('id')
      .eq('question_id', q.id)
      .eq('is_correct', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!row) {
      orphans.push(`answer/${fname} — no is_correct row in n400_answers for Q${q.id}`)
      continue
    }
    entries.push({
      kind: 'answer',
      questionId: q.id,
      localPath: resolve(aDir, fname),
      storagePath: `answers/${fname}`,
    })
    // We stash the n400_answers.id on the entry via storagePath; upload step re-resolves
    // by question_id + same ordering for idempotence (no need to embed the row id here).
  }
  for (const leftover of aFiles) orphans.push(`answer/${leftover}`)

  // ── 3. Senators (Q23) + 4. Capitals (Q62) + 5. House reps (Q29) ──
  // n400_state_data drives state_code ↔ state name. Build a name-to-code lookup.
  const { data: states } = await supabase
    .from('n400_state_data')
    .select('state_code, state_name_en, senator_1, senator_2')
  if (!states) throw new Error('Load n400_state_data failed')

  const nameToCode = new Map<string, string>()
  for (const s of states) nameToCode.set(s.state_name_en, s.state_code)

  // Q23 senator location_answers → match by (state_code, answer_en)
  const { data: senatorRows } = await supabase
    .from('n400_location_answers')
    .select('id, state_code, answer_en')
    .eq('question_id', 23)
  const senatorLookup = new Map<string, string>() // `${state}:${slugKey}` → location_answer.id
  for (const r of senatorRows ?? []) {
    senatorLookup.set(`${r.state_code}:${slugKey(nameToSlug(r.answer_en))}`, r.id)
  }

  // Q61 governor location_answers → match by (state_code, answer_en). 56 jurisdictions.
  const { data: governorRows } = await supabase
    .from('n400_location_answers')
    .select('id, state_code, answer_en')
    .eq('question_id', 61)
  const governorLookup = new Map<string, string>() // `${state}:${slugKey}` → location_answer.id
  for (const r of governorRows ?? []) {
    governorLookup.set(`${r.state_code}:${slugKey(nameToSlug(r.answer_en))}`, r.id)
  }

  // Q62 capital location_answers → match by state_code (one row per state)
  const { data: capitalRows } = await supabase
    .from('n400_location_answers')
    .select('id, state_code, answer_en')
    .eq('question_id', 62)
  const capitalLookup = new Map<string, string>() // state_code → location_answer.id
  for (const r of capitalRows ?? []) capitalLookup.set(r.state_code, r.id)

  // Reps → match by (state_code, district_number)
  const { data: repRows } = await supabase
    .from('n400_representatives')
    .select('state_code, district_number, rep_name')
  const repLookup = new Map<string, { repName: string }>() // `${state}:${district}` → row
  for (const r of repRows ?? []) {
    repLookup.set(`${r.state_code}:${r.district_number}`, { repName: r.rep_name })
  }

  // Walk N400_voice/State/<StateName>/{Senator voice,House of rep,Capital,Governor}/...
  const stateRoot = resolve(VOICE_ROOT, 'State')
  for (const stateFolder of listSubdirs(stateRoot)) {
    const code = nameToCode.get(stateFolder)
    if (!code) {
      // 6 territories (DC, AS, GU, MP, PR, VI) appear here. After Phase 1 was extended to
      // seed all 56 jurisdictions, they should resolve via nameToCode. If `code` is still
      // undefined, the territory is missing from `n400_state_data` — log it as a hard miss.
      missing.push(`state folder "${stateFolder}" not found in n400_state_data — extend Phase 1 seed`)
    }

    const stateDir = resolve(stateRoot, stateFolder)

    // Senators
    const senDir = resolve(stateDir, 'Senator voice')
    for (const fname of listMp3(senDir)) {
      const stem = basename(fname, '.mp3')
      const localPath = resolve(senDir, fname)
      const storagePath = `senators/${code ?? 'XX'}/${fname}`
      const id = code ? senatorLookup.get(`${code}:${slugKey(stem)}`) : undefined
      if (id) {
        entries.push({ kind: 'location_answer', locationAnswerId: id, localPath, storagePath })
      } else {
        orphans.push(`State/${stateFolder}/Senator voice/${fname}`)
      }
    }

    // Governor (Q61) — 56 jurisdictions, one file each
    const govDir = resolve(stateDir, 'Governor')
    for (const fname of listMp3(govDir)) {
      const stem = basename(fname, '.mp3')
      const localPath = resolve(govDir, fname)
      const storagePath = `governors/${code ?? 'XX'}/${fname}`
      const id = code ? governorLookup.get(`${code}:${slugKey(stem)}`) : undefined
      if (id) {
        entries.push({ kind: 'location_answer', locationAnswerId: id, localPath, storagePath })
      } else {
        orphans.push(`State/${stateFolder}/Governor/${fname}`)
      }
    }
    if (code && !listMp3(govDir).length && governorLookup.has(`${code}:`) === false) {
      // Cheap presence check — flag missing governor recording (every jurisdiction has one in v1).
      const expectedHasRow = (governorRows ?? []).some(g => g.state_code === code)
      if (expectedHasRow) missing.push(`governor ${code} → expected file in State/${stateFolder}/Governor/`)
    }

    // Capital
    const capDir = resolve(stateDir, 'Capital')
    const capFiles = listMp3(capDir)
    if (code) {
      const expected = `capital-${code}.mp3`
      if (!capFiles.includes(expected)) {
        if (capitalLookup.has(code)) missing.push(`capital ${code} → expected ${expected}`)
      }
    }
    for (const fname of capFiles) {
      const localPath = resolve(capDir, fname)
      const storagePath = `capitals/${fname}`
      const id = code ? capitalLookup.get(code) : undefined
      if (id) {
        entries.push({ kind: 'location_answer', locationAnswerId: id, localPath, storagePath })
      } else {
        orphans.push(`State/${stateFolder}/Capital/${fname}`)
      }
    }

    // House of rep
    const repRoot = resolve(stateDir, 'House of rep')
    for (const distFolder of listSubdirs(repRoot)) {
      const districtNumber = districtFromFolder(distFolder)
      if (districtNumber == null) {
        orphans.push(`State/${stateFolder}/House of rep/${distFolder} — unparseable district`)
        continue
      }
      const dDir = resolve(repRoot, distFolder)
      for (const fname of listMp3(dDir)) {
        const stem = basename(fname, '.mp3')
        const localPath = resolve(dDir, fname)
        const storagePath = `reps/${code ?? 'XX'}/${districtNumber}/${fname}`
        if (!code) { orphans.push(`State/${stateFolder}/House of rep/${distFolder}/${fname}`); continue }

        const row = repLookup.get(`${code}:${districtNumber}`)
        if (!row) {
          orphans.push(`State/${stateFolder}/House of rep/${distFolder}/${fname} — no n400_representatives row`)
          continue
        }
        // Sanity-check the slug matches the DB rep_name (warn but accept).
        if (slugKey(stem) !== slugKey(nameToSlug(row.repName))) {
          console.warn(`⚠️  Rep name mismatch: file "${stem}" vs DB "${row.repName}" (${code} ${districtNumber}) — uploading anyway`)
        }
        entries.push({ kind: 'representative', stateCode: code, districtNumber, localPath, storagePath })
      }
    }
  }

  // Report
  console.log(`Manifest: ${entries.length} entries`)
  if (missing.length) {
    console.log(`\n❌ ${missing.length} expected files missing:`)
    for (const m of missing) console.log(`  - ${m}`)
  }
  if (orphans.length) {
    console.log(`\n⚠️  ${orphans.length} orphan files (no DB target):`)
    for (const o of orphans) console.log(`  - ${o}`)
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2))
  console.log(`\nWrote ${MANIFEST_PATH}`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [x] **Step 3: Run the manifest build**

```bash
cd apps/website
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/build-audio-manifest.ts
```

Expected output:

```
Manifest: ~854 entries

(no missing files — all 50 states + 6 territories covered)

Wrote scripts/n400/audio-manifest.json
```

If Phase 1 has *not* been extended to seed the 6 territories yet, you will instead see ~7 orphan lines for territory governor + at-large rep files. Run the updated Phase 1 seed first; the manifest should then resolve cleanly.

- [x] **Step 4: Commit the builder**

```bash
git add apps/website/scripts/n400/build-audio-manifest.ts \
        apps/website/scripts/n400/slug.ts
git commit -m "feat(n400): add audio manifest builder for pre-recorded voices"
```

---

## Task 3: Upload audio to Supabase Storage + backfill DB URLs

**Files:**
- Create: `apps/website/scripts/n400/upload-audio.ts`

- [x] **Step 1: Create upload script**

Create `apps/website/scripts/n400/upload-audio.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

type Entry =
  | { kind: 'question'; questionId: number; localPath: string; storagePath: string }
  | { kind: 'answer';   questionId: number; localPath: string; storagePath: string }
  | { kind: 'location_answer'; locationAnswerId: string; localPath: string; storagePath: string }
  | { kind: 'representative';  stateCode: string; districtNumber: number; localPath: string; storagePath: string }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'n400-audio'

async function uploadFile(localPath: string, storagePath: string): Promise<string> {
  const file = readFileSync(localPath)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error(`Upload failed ${storagePath}: ${error.message}`)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

async function backfill(entry: Entry, publicUrl: string): Promise<void> {
  if (entry.kind === 'question') {
    await supabase.from('n400_questions')
      .update({ question_audio_url: publicUrl })
      .eq('id', entry.questionId)
  } else if (entry.kind === 'answer') {
    // Attach to first is_correct=true row, ordered by display_order, id (matches builder).
    const { data: row } = await supabase
      .from('n400_answers')
      .select('id')
      .eq('question_id', entry.questionId)
      .eq('is_correct', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!row) throw new Error(`No is_correct row for Q${entry.questionId}`)
    await supabase.from('n400_answers')
      .update({ answer_audio_url: publicUrl })
      .eq('id', row.id)
  } else if (entry.kind === 'location_answer') {
    await supabase.from('n400_location_answers')
      .update({ answer_audio_url: publicUrl })
      .eq('id', entry.locationAnswerId)
  } else if (entry.kind === 'representative') {
    await supabase.from('n400_representatives')
      .update({ rep_audio_url: publicUrl })
      .eq('state_code', entry.stateCode)
      .eq('district_number', entry.districtNumber)
  }
}

async function main() {
  const manifestPath = resolve(__dirname, 'audio-manifest.json')
  const entries: Entry[] = JSON.parse(readFileSync(manifestPath, 'utf-8'))

  console.log(`Uploading ${entries.length} files to Supabase Storage…`)
  let done = 0
  for (const entry of entries) {
    const publicUrl = await uploadFile(entry.localPath, entry.storagePath)
    await backfill(entry, publicUrl)
    done++
    process.stdout.write(`\rUploaded ${done}/${entries.length}`)
  }
  console.log('\n✅ Upload + backfill complete.')
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [x] **Step 2: Run upload**

```bash
cd apps/website
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/upload-audio.ts
```

Expected: `Uploaded ~854/854 ... ✅ Upload + backfill complete.`

- [x] **Step 3: Verify in DB**

```sql
-- Questions: all 128 should have audio
SELECT COUNT(*) FROM n400_questions WHERE question_audio_url IS NOT NULL;
-- expect 128

-- Answers: 79 canonical answers attached
SELECT COUNT(*) FROM n400_answers WHERE answer_audio_url IS NOT NULL;
-- expect 79

-- Q23 senators: 100
SELECT COUNT(*) FROM n400_location_answers
WHERE question_id = 23 AND answer_audio_url IS NOT NULL;
-- expect 100

-- Q61 governors: 56 (50 states + 6 territories)
SELECT COUNT(*) FROM n400_location_answers
WHERE question_id = 61 AND answer_audio_url IS NOT NULL;
-- expect 56

-- Q62 capitals: 50 (all 50 states recorded, including Texas)
SELECT COUNT(*) FROM n400_location_answers
WHERE question_id = 62 AND answer_audio_url IS NOT NULL;
-- expect 50

-- Reps: 441 (435 House + 6 territorial delegates)
SELECT COUNT(*) FROM n400_representatives WHERE rep_audio_url IS NOT NULL;
-- expect 441

-- Spot check
SELECT id, question_audio_url FROM n400_questions WHERE id = 1;
SELECT state_code, rep_name, rep_audio_url FROM n400_representatives
WHERE state_code = 'TX' ORDER BY district_number LIMIT 3;
```

- [x] **Step 4: Commit**

```bash
git add apps/website/scripts/n400/upload-audio.ts
git commit -m "feat(n400): upload pre-recorded audio + backfill Supabase Storage URLs"
```

---

## Task 4 (optional): Re-run after fixing missing files

If the manifest builder ever reports a missing or mis-named file (e.g., a politician changes mid-cycle):

1. Drop or replace the MP3 in the matching `apps/website/N400_voice/...` folder.
2. Re-run the manifest builder — it should report 0 missing.
3. Re-run the upload script — only the new/changed files actually transfer (everything else is upserted with the same content), and the matching DB row is updated.

No code changes needed. The pipeline is idempotent by design.

---

## Phase 2 Complete ✅

854 owner-recorded MP3s uploaded to Supabase Storage `n400-audio/` bucket. DB columns populated:

- `n400_questions.question_audio_url` — 128
- `n400_answers.answer_audio_url` — 79 (canonical correct-answer per question)
- `n400_location_answers.answer_audio_url` — 100 senators (Q23) + 56 governors (Q61) + 50 capitals (Q62)
- `n400_representatives.rep_audio_url` — 441 (435 House + 6 territorial delegates) (Q29)

Storage RLS applied (public read, admin write).

**Next:** Proceed to [Phase 3 — Auth + Setup Flow](2026-05-13-n400app-phase-3-auth-setup.md).
