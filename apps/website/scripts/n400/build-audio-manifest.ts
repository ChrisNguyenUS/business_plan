// Walks apps/website/N400_voice/ and produces audio-manifest.json: a list of
// { localPath, storagePath } pairs annotated with which DB row they should backfill.
// Reports orphans (files with no DB target) and missing (DB rows expecting a file).

import { createClient } from '@supabase/supabase-js'
import { existsSync, readdirSync, statSync, writeFileSync } from 'fs'
import { resolve, basename, extname } from 'path'
import { nameToSlug, nameToSlugAscii, slugKey, districtFromFolder } from './slug'

const VOICE_ROOT = resolve(__dirname, '..', '..', 'N400_voice')
const MANIFEST_PATH = resolve(__dirname, 'audio-manifest.json')

export type Entry =
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

function listMp3(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => extname(f).toLowerCase() === '.mp3')
}

function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => statSync(resolve(dir, f)).isDirectory())
}

async function main() {
  const entries: Entry[] = []
  const missing: string[] = []
  const orphans: string[] = []

  // ── Questions: q001.mp3 … q128.mp3 ──
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

  // ── Answers (sparse: one canonical per question) ──
  const aDir = resolve(VOICE_ROOT, 'answer')
  const aFiles = new Set(listMp3(aDir))
  for (const q of questions) {
    const fname = `a${String(q.id).padStart(3, '0')}.mp3`
    if (!aFiles.has(fname)) continue
    aFiles.delete(fname)

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
  }
  for (const leftover of aFiles) orphans.push(`answer/${leftover}`)

  // ── State-scoped audio: senators (Q23), governors (Q61), capitals (Q62), reps (Q29) ──
  const { data: states } = await supabase
    .from('n400_state_data')
    .select('state_code, state_name_en')
  if (!states) throw new Error('Load n400_state_data failed')
  const nameToCode = new Map<string, string>()
  for (const s of states) nameToCode.set(s.state_name_en, s.state_code)

  const { data: senatorRows } = await supabase
    .from('n400_location_answers')
    .select('id, state_code, answer_en')
    .eq('question_id', 23)
  const senatorLookup = new Map<string, string>()
  for (const r of senatorRows ?? []) {
    // Accept both slug variants: NFD-stripped and raw ASCII-only.
    senatorLookup.set(`${r.state_code}:${slugKey(nameToSlug(r.answer_en))}`, r.id)
    senatorLookup.set(`${r.state_code}:${slugKey(nameToSlugAscii(r.answer_en))}`, r.id)
  }

  const { data: governorRows } = await supabase
    .from('n400_location_answers')
    .select('id, state_code, answer_en')
    .eq('question_id', 61)
  const governorLookup = new Map<string, string>()
  for (const r of governorRows ?? []) {
    governorLookup.set(`${r.state_code}:${slugKey(nameToSlug(r.answer_en))}`, r.id)
    governorLookup.set(`${r.state_code}:${slugKey(nameToSlugAscii(r.answer_en))}`, r.id)
  }

  const { data: capitalRows } = await supabase
    .from('n400_location_answers')
    .select('id, state_code')
    .eq('question_id', 62)
  const capitalLookup = new Map<string, string>()
  for (const r of capitalRows ?? []) capitalLookup.set(r.state_code, r.id)

  const { data: repRows } = await supabase
    .from('n400_representatives')
    .select('state_code, district_number, rep_name')
  const repLookup = new Map<string, { repName: string }>()
  for (const r of repRows ?? []) {
    repLookup.set(`${r.state_code}:${r.district_number}`, { repName: r.rep_name })
  }

  // Track which DB rows we backfilled, so we can compute "missing" by set difference.
  const backfilledSenators = new Set<string>()
  const backfilledGovernors = new Set<string>()
  const backfilledCapitals = new Set<string>()
  const backfilledReps = new Set<string>()

  const stateRoot = resolve(VOICE_ROOT, 'State')
  for (const stateFolder of listSubdirs(stateRoot)) {
    const code = nameToCode.get(stateFolder)
    if (!code) {
      missing.push(`state folder "${stateFolder}" not found in n400_state_data — extend Phase 1 seed`)
    }
    const stateDir = resolve(stateRoot, stateFolder)

    // Senators (Q23)
    const senDir = resolve(stateDir, 'Senator voice')
    for (const fname of listMp3(senDir)) {
      const stem = basename(fname, '.mp3')
      const localPath = resolve(senDir, fname)
      const storagePath = `senators/${code ?? 'XX'}/${fname}`
      const id = code ? senatorLookup.get(`${code}:${slugKey(stem)}`) : undefined
      if (id) {
        entries.push({ kind: 'location_answer', locationAnswerId: id, locationKind: 'senator', localPath, storagePath })
        backfilledSenators.add(id)
      } else {
        orphans.push(`State/${stateFolder}/Senator voice/${fname}`)
      }
    }

    // Governor (Q61)
    const govDir = resolve(stateDir, 'Governor')
    for (const fname of listMp3(govDir)) {
      const stem = basename(fname, '.mp3')
      const localPath = resolve(govDir, fname)
      const storagePath = `governors/${code ?? 'XX'}/${fname}`
      const id = code ? governorLookup.get(`${code}:${slugKey(stem)}`) : undefined
      if (id) {
        entries.push({ kind: 'location_answer', locationAnswerId: id, locationKind: 'governor', localPath, storagePath })
        backfilledGovernors.add(id)
      } else {
        orphans.push(`State/${stateFolder}/Governor/${fname}`)
      }
    }

    // Capital (Q62) — `capital-{CODE}.mp3` per state (50 states; territories don't have one)
    const capDir = resolve(stateDir, 'Capital')
    for (const fname of listMp3(capDir)) {
      const localPath = resolve(capDir, fname)
      const storagePath = `capitals/${fname}`
      const id = code ? capitalLookup.get(code) : undefined
      if (id) {
        entries.push({ kind: 'location_answer', locationAnswerId: id, locationKind: 'capital', localPath, storagePath })
        backfilledCapitals.add(id)
      } else {
        orphans.push(`State/${stateFolder}/Capital/${fname}`)
      }
    }

    // House of rep (Q29)
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
        if (!code) {
          orphans.push(`State/${stateFolder}/House of rep/${distFolder}/${fname}`)
          continue
        }
        const row = repLookup.get(`${code}:${districtNumber}`)
        if (!row) {
          orphans.push(`State/${stateFolder}/House of rep/${distFolder}/${fname} — no n400_representatives row`)
          continue
        }
        if (slugKey(stem) !== slugKey(nameToSlug(row.repName)) && slugKey(stem) !== slugKey(nameToSlugAscii(row.repName))) {
          console.warn(`⚠️  Rep name mismatch: file "${stem}" vs DB "${row.repName}" (${code} ${districtNumber}) — uploading anyway`)
        }
        entries.push({ kind: 'representative', stateCode: code, districtNumber, localPath, storagePath })
        backfilledReps.add(`${code}:${districtNumber}`)
      }
    }
  }

  // Compute "missing" by DB row → file set difference.
  for (const r of senatorRows ?? []) {
    if (!backfilledSenators.has(r.id)) missing.push(`senator ${r.state_code} "${r.answer_en}" — no matching MP3`)
  }
  for (const r of governorRows ?? []) {
    if (!backfilledGovernors.has(r.id)) missing.push(`governor ${r.state_code} "${r.answer_en}" — no matching MP3`)
  }
  for (const r of capitalRows ?? []) {
    if (!backfilledCapitals.has(r.id)) missing.push(`capital ${r.state_code} → expected capital-${r.state_code}.mp3`)
  }
  for (const r of repRows ?? []) {
    if (!backfilledReps.has(`${r.state_code}:${r.district_number}`)) {
      missing.push(`rep ${r.state_code} D${r.district_number} "${r.rep_name}" — no matching MP3`)
    }
  }

  console.log(`Manifest: ${entries.length} entries`)
  const byKind = entries.reduce<Record<string, number>>((acc, e) => {
    const k = e.kind === 'location_answer' ? `location_answer:${e.locationKind}` : e.kind
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  for (const [k, v] of Object.entries(byKind).sort()) console.log(`  ${k}: ${v}`)

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

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
