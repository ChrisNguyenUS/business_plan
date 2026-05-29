// Phase 9 Task 1 — Audio verification (static-bundle path).
//
// The runtime serves audio from /n400-audio/* — a filesystem symlink to
// apps/website/N400_voice. So this script walks the same static bundles
// the app imports (N400_QUESTIONS, STATES, REPS) and checks for the
// presence + non-emptiness of the corresponding MP3s on disk under
// public/n400-audio.
//
// Why not check Supabase Storage URLs (the original Phase 9 plan):
// the app no longer reads audio from Storage. Storage URLs in DB are
// stale relics of an earlier seed flow. The runtime path is filesystem.
//
// Run:  npx tsx scripts/n400/verify-audio.ts
// Exit 1 if any required file is missing or empty.

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { N400_QUESTIONS } from '../../src/lib/n400/questions-data';
import { STATES, type StateCode } from '../../src/lib/n400/state-data';
import { REPS } from '../../src/lib/n400/reps-data';

const PUBLIC_AUDIO = join(process.cwd(), 'public', 'n400-audio');

interface Finding { kind: 'fail' | 'warn'; path: string; reason: string; }
const findings: Finding[] = [];
const fail = (path: string, reason: string) => findings.push({ kind: 'fail', path, reason });
const warn = (path: string, reason: string) => findings.push({ kind: 'warn', path, reason });

function checkFile(relPath: string, severity: 'fail' | 'warn' = 'fail'): boolean {
  // Strip URL-encoding (%20 etc.) and the leading /n400-audio so we can
  // resolve under the local public/n400-audio root.
  const decoded = decodeURIComponent(relPath).replace(/^\/n400-audio\//, '');
  const fsPath = join(PUBLIC_AUDIO, decoded);
  if (!existsSync(fsPath)) {
    (severity === 'fail' ? fail : warn)(relPath, 'missing');
    return false;
  }
  const size = statSync(fsPath).size;
  if (size === 0) {
    (severity === 'fail' ? fail : warn)(relPath, 'empty file');
    return false;
  }
  return true;
}

// ── Question audio: 128 files at /n400-audio/question/q001..q128.mp3 ──
function checkQuestions() {
  console.log(`\nQuestion audio (${N400_QUESTIONS.length} questions)…`);
  let ok = 0;
  for (const q of N400_QUESTIONS) {
    const id = String(q.id).padStart(3, '0');
    if (checkFile(`/n400-audio/question/q${id}.mp3`)) ok++;
  }
  console.log(`  ${ok}/${N400_QUESTIONS.length} present`);
}

// ── Answer audio: optional ── 79 of 128 questions have a canonical answer
// audio per spec. quiz-engine.ts says missing files fall back gracefully on
// the frontend — so a miss is a `warn`, not `fail`.
function checkAnswers() {
  console.log(`\nAnswer audio (best-effort — 79 of 128 expected)…`);
  let present = 0;
  for (const q of N400_QUESTIONS) {
    if (q.isLocationBased) continue; // location-based answers route to State/* below
    const id = String(q.id).padStart(3, '0');
    const rel = `/n400-audio/answer/a${id}.mp3`;
    const decoded = decodeURIComponent(rel).replace(/^\/n400-audio\//, '');
    if (existsSync(join(PUBLIC_AUDIO, decoded))) {
      checkFile(rel, 'warn'); // empty file is still a warn
      present++;
    }
  }
  console.log(`  ${present} answer files present`);
}

// ── Senator audio (Q23) ── State/<nameEn>/Senator voice/<First_Last>.mp3
function checkSenators() {
  let total = 0;
  let ok = 0;
  for (const s of STATES) {
    for (const senator of s.senators) {
      total++;
      const file = `${senator.replace(/\s+/g, '_')}.mp3`;
      const rel = `/n400-audio/State/${encodeURIComponent(s.nameEn)}/Senator voice/${encodeURIComponent(file)}`;
      if (checkFile(rel)) ok++;
    }
  }
  console.log(`\nSenator audio (Q23): ${ok}/${total} present`);
}

// ── Governor audio (Q61) ── State/<nameEn>/Governor/<First_Last>.mp3
function checkGovernors() {
  let total = 0;
  let ok = 0;
  for (const s of STATES) {
    total++;
    const file = `${s.governor.replace(/\s+/g, '_')}.mp3`;
    const rel = `/n400-audio/State/${encodeURIComponent(s.nameEn)}/Governor/${encodeURIComponent(file)}`;
    if (checkFile(rel)) ok++;
  }
  console.log(`Governor audio (Q61): ${ok}/${total} present`);
}

// ── Capital audio (Q62) ── State/<nameEn>/Capital/capital-<stateCode>.mp3
function checkCapitals() {
  let total = 0;
  let ok = 0;
  for (const s of STATES) {
    if (!s.capital) continue;
    total++;
    const rel = `/n400-audio/State/${encodeURIComponent(s.nameEn)}/Capital/capital-${s.code as StateCode}.mp3`;
    if (checkFile(rel)) ok++;
  }
  console.log(`Capital audio (Q62): ${ok}/${total} present`);
}

// ── Representative audio (Q29) ── REPS already carries the resolved URL
function checkReps() {
  let ok = 0;
  for (const r of REPS) {
    if (checkFile(r.audioUrl)) ok++;
  }
  console.log(`Representative audio (Q29): ${ok}/${REPS.length} present`);
}

async function main() {
  console.log('Verifying audio against static bundles + public/n400-audio…');
  checkQuestions();
  checkAnswers();
  checkSenators();
  checkGovernors();
  checkCapitals();
  checkReps();

  const fails = findings.filter((f) => f.kind === 'fail');
  const warns = findings.filter((f) => f.kind === 'warn');

  if (warns.length > 0) {
    console.log(`\n⚠ ${warns.length} warning(s):`);
    for (const f of warns.slice(0, 10)) console.log(`  ${f.path} — ${f.reason}`);
    if (warns.length > 10) console.log(`  …and ${warns.length - 10} more`);
  }

  if (fails.length > 0) {
    console.log(`\n❌ ${fails.length} required file(s) missing or empty:`);
    for (const f of fails.slice(0, 25)) console.log(`  ${f.path} — ${f.reason}`);
    if (fails.length > 25) console.log(`  …and ${fails.length - 25} more`);
    process.exit(1);
  }

  console.log('\n✅ All required audio files present and non-empty.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
