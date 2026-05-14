# N400 App — Phase 2: Audio Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate ~1,300 MP3 audio files using Google Cloud TTS for all 128 questions and their correct answers, upload to Supabase Storage, and backfill `question_audio_url` / `answer_audio_url` in the DB.

**Architecture:** One-time batch scripts in `apps/website/scripts/n400/`. Google Cloud TTS Neural2 voice (en-US-Neural2-F or similar). Files stored in Supabase Storage bucket `n400-audio/` with content-hashed filenames. Scripts are idempotent — safe to re-run.

**Tech Stack:** `@google-cloud/text-to-speech`, `@supabase/supabase-js`, `tsx`, Node.js `crypto` for content hashing.

**Prerequisite:** Phase 1 complete (128 questions + correct answers in DB). Google Cloud project with TTS API enabled. Service account JSON key.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `scripts/n400/generate-audio.ts` | Create | Call Google Cloud TTS, save MP3s locally |
| `scripts/n400/upload-audio.ts` | Create | Upload local MP3s to Supabase Storage, backfill DB URLs |
| `scripts/n400/audio-manifest.json` | Create (generated) | Maps question/answer IDs to file hashes — gitignored |

---

## Task 1: Setup Google Cloud TTS + install dependencies

**Files:**
- Modify: `apps/website/package.json`

- [ ] **Step 1: Install Google Cloud TTS SDK**

```bash
cd apps/website && npm install --save-dev @google-cloud/text-to-speech@5.3.0
```

- [ ] **Step 2: Enable TTS API in Google Cloud Console**

1. Go to https://console.cloud.google.com
2. Create or select a project
3. Enable "Cloud Text-to-Speech API"
4. Create a Service Account → download JSON key
5. Save key as `apps/website/scripts/n400/gcloud-key.json` (gitignored)

Add to `.gitignore`:
```
scripts/n400/gcloud-key.json
scripts/n400/audio-manifest.json
scripts/n400/audio-output/
```

- [ ] **Step 3: Commit dependency update**

```bash
git add apps/website/package.json apps/website/package-lock.json
git commit -m "chore(n400): add Google Cloud TTS dependency for audio generation"
```

---

## Task 2: Generate audio files locally

**Files:**
- Create: `apps/website/scripts/n400/generate-audio.ts`

- [ ] **Step 1: Create generator script**

Create `apps/website/scripts/n400/generate-audio.ts`:

```typescript
import textToSpeech from '@google-cloud/text-to-speech'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: resolve(__dirname, 'gcloud-key.json'),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OUTPUT_DIR = resolve(__dirname, 'audio-output')
const VOICE = { languageCode: 'en-US', name: 'en-US-Neural2-F' }
const AUDIO_CONFIG = { audioEncoding: 'MP3' as const }

function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 12)
}

async function synthesize(text: string, outputPath: string): Promise<void> {
  if (existsSync(outputPath)) return // idempotent

  const [response] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: VOICE,
    audioConfig: AUDIO_CONFIG,
  })

  writeFileSync(outputPath, response.audioContent as Buffer)
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  mkdirSync(resolve(OUTPUT_DIR, 'questions'), { recursive: true })
  mkdirSync(resolve(OUTPUT_DIR, 'answers'), { recursive: true })

  const manifest: Record<string, string> = {}

  // Fetch all questions
  const { data: questions } = await supabase
    .from('n400_questions')
    .select('id, question_en')
    .order('id')

  if (!questions) throw new Error('No questions found')

  console.log(`Generating audio for ${questions.length} questions...`)
  for (const q of questions) {
    const hash = contentHash(q.question_en)
    const filename = `q${String(q.id).padStart(3, '0')}-${hash}.mp3`
    const outputPath = resolve(OUTPUT_DIR, 'questions', filename)
    await synthesize(q.question_en, outputPath)
    manifest[`question:${q.id}`] = `questions/${filename}`
    process.stdout.write(`\rQuestions: ${q.id}/${questions.length}`)
  }

  // Fetch all correct answers
  const { data: answers } = await supabase
    .from('n400_answers')
    .select('id, question_id, answer_en')
    .eq('is_correct', true)
    .order('question_id')

  if (!answers) throw new Error('No answers found')

  console.log(`\nGenerating audio for ${answers.length} correct answers...`)
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i]
    const hash = contentHash(a.answer_en)
    const filename = `q${String(a.question_id).padStart(3, '0')}-a-${hash}.mp3`
    const outputPath = resolve(OUTPUT_DIR, 'answers', filename)
    await synthesize(a.answer_en, outputPath)
    manifest[`answer:${a.id}`] = `answers/${filename}`
    process.stdout.write(`\rAnswers: ${i + 1}/${answers.length}`)
  }

  // Save manifest
  writeFileSync(resolve(__dirname, 'audio-manifest.json'), JSON.stringify(manifest, null, 2))
  console.log('\nDone. Manifest saved to audio-manifest.json')
  console.log(`Total files: ${Object.keys(manifest).length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run generator**

```bash
cd apps/website
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/generate-audio.ts
```

Expected output:
```
Generating audio for 128 questions...
Questions: 128/128
Generating audio for ~500 correct answers...
Answers: 500/500
Done. Manifest saved to audio-manifest.json
Total files: ~628
```

This will take ~10-15 minutes. Google Cloud TTS free tier covers 1M characters/month — the full batch is well within this limit.

- [ ] **Step 3: Commit script**

```bash
git add apps/website/scripts/n400/generate-audio.ts
git commit -m "feat(n400): add Google Cloud TTS audio generation script"
```

---

## Task 3: Upload audio to Supabase Storage + backfill DB URLs

**Files:**
- Create: `apps/website/scripts/n400/upload-audio.ts`

- [ ] **Step 1: Create Supabase Storage bucket**

In Supabase dashboard for project `ffsrlmtqzlidnuitkdvw`:
1. Go to Storage → New bucket
2. Name: `n400-audio`
3. Public: ✅ (files served via CDN)
4. File size limit: 1MB
5. Allowed MIME types: `audio/mpeg`

- [ ] **Step 2: Create upload script**

Create `apps/website/scripts/n400/upload-audio.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { resolve, basename } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OUTPUT_DIR = resolve(__dirname, 'audio-output')
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

async function main() {
  const manifest: Record<string, string> = JSON.parse(
    readFileSync(resolve(__dirname, 'audio-manifest.json'), 'utf-8')
  )

  let uploaded = 0
  const total = Object.keys(manifest).length

  // Upload questions
  const questionFiles = readdirSync(resolve(OUTPUT_DIR, 'questions'))
  for (const filename of questionFiles) {
    const localPath = resolve(OUTPUT_DIR, 'questions', filename)
    const storagePath = `questions/${filename}`
    const publicUrl = await uploadFile(localPath, storagePath)

    // Find question id from manifest
    const entry = Object.entries(manifest).find(([k, v]) => v === storagePath)
    if (entry) {
      const questionId = parseInt(entry[0].replace('question:', ''), 10)
      await supabase.from('n400_questions')
        .update({ question_audio_url: publicUrl })
        .eq('id', questionId)
    }
    uploaded++
    process.stdout.write(`\rUploaded ${uploaded}/${total}`)
  }

  // Upload answers
  const answerFiles = readdirSync(resolve(OUTPUT_DIR, 'answers'))
  for (const filename of answerFiles) {
    const localPath = resolve(OUTPUT_DIR, 'answers', filename)
    const storagePath = `answers/${filename}`
    const publicUrl = await uploadFile(localPath, storagePath)

    const entry = Object.entries(manifest).find(([k, v]) => v === storagePath)
    if (entry) {
      const answerId = entry[0].replace('answer:', '')
      await supabase.from('n400_answers')
        .update({ answer_audio_url: publicUrl })
        .eq('id', answerId)
    }
    uploaded++
    process.stdout.write(`\rUploaded ${uploaded}/${total}`)
  }

  console.log('\nDone. All audio uploaded and DB URLs backfilled.')
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Run upload**

```bash
cd apps/website
NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
  npx tsx scripts/n400/upload-audio.ts
```

Expected: `Uploaded ~628/628 ... Done.`

- [ ] **Step 4: Verify in DB**

```sql
SELECT COUNT(*) FROM n400_questions WHERE question_audio_url IS NOT NULL;  -- expect 128
SELECT COUNT(*) FROM n400_answers WHERE is_correct = true AND answer_audio_url IS NOT NULL;  -- expect ~500
-- Spot check
SELECT id, question_audio_url FROM n400_questions WHERE id = 1;
```

- [ ] **Step 5: Commit**

```bash
git add apps/website/scripts/n400/upload-audio.ts
git commit -m "feat(n400): add audio upload script with Supabase Storage backfill"
```

---

## Phase 2 Complete ✅

~1,300 MP3 files generated via Google Cloud TTS, uploaded to Supabase Storage `n400-audio/` bucket, and all `question_audio_url` / `answer_audio_url` fields populated in DB.

**Next:** Proceed to [Phase 3 — Auth + Setup Flow](2026-05-13-n400app-phase-3-auth-setup.md).
