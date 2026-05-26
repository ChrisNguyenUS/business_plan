// Reads scripts/n400/audio-manifest.json, uploads each MP3 to Supabase Storage
// bucket `n400-audio`, and backfills the matching DB column with the public URL.
// Idempotent: storage uploads use upsert=true; DB rows are addressed by primary
// key (or unique state_code+district_number for reps), so re-running is safe.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

type Entry =
  | { kind: 'question'; questionId: number; localPath: string; storagePath: string }
  | { kind: 'answer'; questionId: number; localPath: string; storagePath: string }
  | { kind: 'location_answer'; locationAnswerId: string; locationKind: 'senator' | 'governor' | 'capital'; localPath: string; storagePath: string }
  | { kind: 'representative'; stateCode: string; districtNumber: number; localPath: string; storagePath: string }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}
const supabase = createClient(supabaseUrl, supabaseKey)

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
    const { error } = await supabase
      .from('n400_questions')
      .update({ question_audio_url: publicUrl })
      .eq('id', entry.questionId)
    if (error) throw new Error(`Backfill question Q${entry.questionId}: ${error.message}`)
  } else if (entry.kind === 'answer') {
    // Re-resolve to first is_correct row, same ordering as the manifest builder.
    const { data: row, error: selErr } = await supabase
      .from('n400_answers')
      .select('id')
      .eq('question_id', entry.questionId)
      .eq('is_correct', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (selErr || !row) throw new Error(`No is_correct row for Q${entry.questionId}: ${selErr?.message ?? 'not found'}`)
    const { error } = await supabase
      .from('n400_answers')
      .update({ answer_audio_url: publicUrl })
      .eq('id', row.id)
    if (error) throw new Error(`Backfill answer Q${entry.questionId}: ${error.message}`)
  } else if (entry.kind === 'location_answer') {
    const { error } = await supabase
      .from('n400_location_answers')
      .update({ answer_audio_url: publicUrl })
      .eq('id', entry.locationAnswerId)
    if (error) throw new Error(`Backfill location_answer ${entry.locationAnswerId}: ${error.message}`)
  } else if (entry.kind === 'representative') {
    const { error } = await supabase
      .from('n400_representatives')
      .update({ rep_audio_url: publicUrl })
      .eq('state_code', entry.stateCode)
      .eq('district_number', entry.districtNumber)
    if (error) throw new Error(`Backfill rep ${entry.stateCode} D${entry.districtNumber}: ${error.message}`)
  }
}

async function main() {
  const manifestPath = resolve(__dirname, 'audio-manifest.json')
  const entries: Entry[] = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  if (!entries.length) {
    console.error('Manifest is empty — run build-audio-manifest.ts first')
    process.exit(1)
  }

  console.log(`Uploading ${entries.length} files to Supabase Storage bucket "${BUCKET}"…`)
  let done = 0
  const failures: Array<{ entry: Entry; error: string }> = []
  for (const entry of entries) {
    try {
      const publicUrl = await uploadFile(entry.localPath, entry.storagePath)
      await backfill(entry, publicUrl)
    } catch (e) {
      failures.push({ entry, error: (e as Error).message })
    }
    done++
    process.stdout.write(`\rUploaded ${done}/${entries.length}`)
  }
  process.stdout.write('\n')

  if (failures.length) {
    console.error(`\n❌ ${failures.length} failures:`)
    for (const f of failures) console.error(`  - ${f.entry.storagePath}: ${f.error}`)
    process.exit(1)
  }
  console.log('✅ Upload + backfill complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
