# N400 App — Phase 7: Admin Panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build admin UI for managing 128 questions, answers, audio uploads, and location data (state data, representatives). Reuse existing admin layout pattern from Phase 3 website.

**Architecture:** New routes under `/[locale]/admin/n400/`. Server Actions for CRUD. Cache invalidation via `revalidateTag('n400-content')` on every save. Audio upload goes directly to Supabase Storage via signed upload URL.

**Tech Stack:** Next.js 16 Server Actions, Supabase Storage, Radix UI, existing admin layout.

**Prerequisite:** Phase 1 complete (DB tables exist). Existing admin layout at `src/app/[locale]/admin/layout.tsx`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/app/[locale]/admin/n400/page.tsx` | Create | Admin N400 index — list 128 questions |
| `src/app/[locale]/admin/n400/[questionId]/page.tsx` | Create | Edit question + answers + audio |
| `src/app/[locale]/admin/n400/[questionId]/actions.ts` | Create | Server actions: update question, answer, upload audio |
| `src/app/[locale]/admin/n400/state-data/page.tsx` | Create | Edit 50-state data |
| `src/app/[locale]/admin/n400/state-data/actions.ts` | Create | Update state data |
| `src/app/[locale]/admin/n400/representatives/page.tsx` | Create | Edit congressional reps |
| `src/app/[locale]/admin/n400/representatives/actions.ts` | Create | Update reps |

---

## Task 1: Admin N400 index page

**Files:**
- Create: `apps/website/src/app/[locale]/admin/n400/page.tsx`

- [ ] **Step 1: Create index page**

Create `apps/website/src/app/[locale]/admin/n400/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

export const revalidate = 0

async function getQuestions() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data } = await supabase
    .from('n400_questions')
    .select('id, question_en, category, question_audio_url, is_location_based')
    .order('id')
  return data ?? []
}

export default async function AdminN400Page() {
  const questions = await getQuestions()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">N400 Questions ({questions.length})</h1>
        <div className="flex gap-3">
          <Link href="/admin/n400/state-data" className="border rounded-lg px-4 py-2 text-sm">State Data</Link>
          <Link href="/admin/n400/representatives" className="border rounded-lg px-4 py-2 text-sm">Representatives</Link>
        </div>
      </div>

      <div className="space-y-1">
        {questions.map(q => (
          <Link key={q.id} href={`/admin/n400/${q.id}`}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
            <span className="text-xs font-mono text-gray-400 w-8">#{q.id}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{q.question_en}</p>
              <p className="text-xs text-gray-400">{q.category}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {q.is_location_based && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">location</span>}
              {q.question_audio_url ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">🔊</span>
                : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">no audio</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/app/[locale]/admin/n400/page.tsx
git commit -m "feat(n400): add admin N400 questions index page"
```

---

## Task 2: Edit question server actions

**Files:**
- Create: `apps/website/src/app/[locale]/admin/n400/[questionId]/actions.ts`

- [ ] **Step 1: Create actions**

Create `apps/website/src/app/[locale]/admin/n400/[questionId]/actions.ts`:

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAdminSupabase() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')
  return supabase
}

export async function updateQuestion(questionId: number, formData: FormData) {
  const supabase = await getAdminSupabase()
  const { error } = await supabase.from('n400_questions').update({
    question_en: formData.get('question_en') as string,
    question_vi: formData.get('question_vi') as string,
    category: formData.get('category') as string,
    updated_at: new Date().toISOString(),
  }).eq('id', questionId)
  if (error) return { error: error.message }
  revalidateTag('n400-content')
  return { success: true }
}

export async function updateAnswer(answerId: string, formData: FormData) {
  const supabase = await getAdminSupabase()
  const { error } = await supabase.from('n400_answers').update({
    answer_en: formData.get('answer_en') as string,
    answer_vi: formData.get('answer_vi') as string,
    is_correct: formData.get('is_correct') === 'true',
  }).eq('id', answerId)
  if (error) return { error: error.message }
  revalidateTag('n400-content')
  return { success: true }
}

export async function addAnswer(questionId: number, formData: FormData) {
  const supabase = await getAdminSupabase()
  const { error } = await supabase.from('n400_answers').insert({
    question_id: questionId,
    answer_en: formData.get('answer_en') as string,
    answer_vi: formData.get('answer_vi') as string,
    is_correct: formData.get('is_correct') === 'true',
    display_order: 999,
  })
  if (error) return { error: error.message }
  revalidateTag('n400-content')
  return { success: true }
}

export async function deleteAnswer(answerId: string) {
  const supabase = await getAdminSupabase()
  const { error } = await supabase.from('n400_answers').delete().eq('id', answerId)
  if (error) return { error: error.message }
  revalidateTag('n400-content')
  return { success: true }
}

export async function getAudioUploadUrl(questionId: number, type: 'question' | 'answer', answerId?: string) {
  const supabase = await getAdminSupabase()
  const path = type === 'question'
    ? `questions/q${String(questionId).padStart(3, '0')}-${Date.now()}.mp3`
    : `answers/q${String(questionId).padStart(3, '0')}-a-${Date.now()}.mp3`

  const { data, error } = await supabase.storage.from('n400-audio').createSignedUploadUrl(path)
  if (error) return { error: error.message }
  return { signedUrl: data.signedUrl, path, token: data.token }
}

export async function saveAudioUrl(questionId: number, type: 'question' | 'answer', publicUrl: string, answerId?: string) {
  const supabase = await getAdminSupabase()
  if (type === 'question') {
    await supabase.from('n400_questions').update({ question_audio_url: publicUrl }).eq('id', questionId)
  } else if (answerId) {
    await supabase.from('n400_answers').update({ answer_audio_url: publicUrl }).eq('id', answerId)
  }
  revalidateTag('n400-content')
  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/app/[locale]/admin/n400/[questionId]/actions.ts
git commit -m "feat(n400): add admin server actions for question/answer CRUD and audio upload"
```

---

## Task 3: Edit question UI page

**Files:**
- Create: `apps/website/src/app/[locale]/admin/n400/[questionId]/page.tsx`

- [ ] **Step 1: Create edit page**

Create `apps/website/src/app/[locale]/admin/n400/[questionId]/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { updateQuestion, updateAnswer, addAnswer, deleteAnswer } from './actions'

export const revalidate = 0

async function getQuestion(id: number) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: question } = await supabase.from('n400_questions')
    .select('*').eq('id', id).single()
  const { data: answers } = await supabase.from('n400_answers')
    .select('*').eq('question_id', id).order('is_correct', { ascending: false }).order('display_order')
  return { question, answers: answers ?? [] }
}

export default async function EditQuestionPage({ params }: { params: { questionId: string } }) {
  const id = parseInt(params.questionId, 10)
  const { question, answers } = await getQuestion(id)
  if (!question) return <div className="p-6">Question not found</div>

  const updateQ = updateQuestion.bind(null, id)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/n400" className="text-blue-600 text-sm">← Back</Link>
        <h1 className="text-xl font-bold">Question #{id}</h1>
        {question.is_location_based && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">location-based</span>}
      </div>

      {/* Edit question text */}
      <form action={updateQ} className="border rounded-xl p-4 mb-6 space-y-3">
        <h2 className="font-semibold">Question Text</h2>
        <div>
          <label className="text-sm text-gray-500">English</label>
          <textarea name="question_en" defaultValue={question.question_en}
            className="w-full border rounded-lg p-2 text-sm mt-1" rows={2} />
        </div>
        <div>
          <label className="text-sm text-gray-500">Vietnamese</label>
          <textarea name="question_vi" defaultValue={question.question_vi}
            className="w-full border rounded-lg p-2 text-sm mt-1" rows={2} />
        </div>
        <div>
          <label className="text-sm text-gray-500">Category</label>
          <input name="category" defaultValue={question.category}
            className="w-full border rounded-lg p-2 text-sm mt-1" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Save Question</button>
          <span className="text-xs text-gray-400">Audio: {question.question_audio_url ? '✅' : '❌ missing'}</span>
        </div>
      </form>

      {/* Answers */}
      <div className="border rounded-xl p-4 mb-6">
        <h2 className="font-semibold mb-3">Answers ({answers.length})</h2>
        <div className="space-y-3">
          {answers.map(a => {
            const updateA = updateAnswer.bind(null, a.id)
            const deleteA = deleteAnswer.bind(null, a.id)
            return (
              <div key={a.id} className={`border rounded-lg p-3 ${a.is_correct ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                <form action={updateA} className="space-y-2">
                  <div className="flex gap-2">
                    <input name="answer_en" defaultValue={a.answer_en} className="flex-1 border rounded p-1 text-sm" />
                    <input name="answer_vi" defaultValue={a.answer_vi} className="flex-1 border rounded p-1 text-sm" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-sm">
                      <input type="checkbox" name="is_correct" value="true" defaultChecked={a.is_correct} />
                      Correct
                    </label>
                    <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Save</button>
                    <span className="text-xs text-gray-400">Audio: {a.answer_audio_url ? '✅' : '❌'}</span>
                  </div>
                </form>
                <form action={deleteA} className="mt-1">
                  <button type="submit" className="text-xs text-red-500 hover:underline">Delete</button>
                </form>
              </div>
            )
          })}
        </div>

        {/* Add new answer */}
        <form action={addAnswer.bind(null, id)} className="mt-4 border-t pt-4 space-y-2">
          <h3 className="text-sm font-medium">Add Answer</h3>
          <div className="flex gap-2">
            <input name="answer_en" placeholder="English" className="flex-1 border rounded p-1 text-sm" />
            <input name="answer_vi" placeholder="Vietnamese" className="flex-1 border rounded p-1 text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="is_correct" value="true" />
              Correct answer
            </label>
            <button type="submit" className="text-xs bg-green-600 text-white px-3 py-1 rounded">Add</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/website/src/app/[locale]/admin/n400/[questionId]/page.tsx
git commit -m "feat(n400): add admin edit question page with answer CRUD"
```

---

## Task 4: State data + representatives admin pages

**Files:**
- Create: `apps/website/src/app/[locale]/admin/n400/state-data/page.tsx`
- Create: `apps/website/src/app/[locale]/admin/n400/state-data/actions.ts`
- Create: `apps/website/src/app/[locale]/admin/n400/representatives/page.tsx`
- Create: `apps/website/src/app/[locale]/admin/n400/representatives/actions.ts`

- [ ] **Step 1: Create state data actions**

Create `apps/website/src/app/[locale]/admin/n400/state-data/actions.ts`:

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAdminSupabase() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')
  return supabase
}

export async function updateStateData(stateCode: string, formData: FormData) {
  const supabase = await getAdminSupabase()
  const { error } = await supabase.from('n400_state_data').update({
    governor_name: formData.get('governor_name') as string,
    senator_1: formData.get('senator_1') as string,
    senator_2: formData.get('senator_2') as string,
    capital_city: formData.get('capital_city') as string,
  }).eq('state_code', stateCode)
  if (error) return { error: error.message }
  revalidateTag('n400-content')
  return { success: true }
}
```

- [ ] **Step 2: Create state data page**

Create `apps/website/src/app/[locale]/admin/n400/state-data/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { updateStateData } from './actions'

export const revalidate = 0

export default async function StateDataPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: states } = await supabase.from('n400_state_data').select('*').order('state_code')

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">State Data (50 states)</h1>
      <div className="space-y-3">
        {(states ?? []).map(s => {
          const update = updateStateData.bind(null, s.state_code)
          return (
            <form key={s.state_code} action={update} className="border rounded-xl p-4">
              <h2 className="font-semibold mb-3">{s.state_name_en} ({s.state_code})</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Governor</label>
                  <input name="governor_name" defaultValue={s.governor_name} className="w-full border rounded p-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Capital</label>
                  <input name="capital_city" defaultValue={s.capital_city} className="w-full border rounded p-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Senator 1</label>
                  <input name="senator_1" defaultValue={s.senator_1} className="w-full border rounded p-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Senator 2</label>
                  <input name="senator_2" defaultValue={s.senator_2} className="w-full border rounded p-2 text-sm mt-1" />
                </div>
              </div>
              <button type="submit" className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Save</button>
            </form>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create representatives actions + page**

Create `apps/website/src/app/[locale]/admin/n400/representatives/actions.ts`:

```typescript
'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAdminSupabase() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')
  return supabase
}

export async function updateRep(stateCode: string, districtNumber: number, formData: FormData) {
  const supabase = await getAdminSupabase()
  const { error } = await supabase.from('n400_representatives').update({
    rep_name: formData.get('rep_name') as string,
  }).eq('state_code', stateCode).eq('district_number', districtNumber)
  if (error) return { error: error.message }
  revalidateTag('n400-content')
  return { success: true }
}
```

Create `apps/website/src/app/[locale]/admin/n400/representatives/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { updateRep } from './actions'

export const revalidate = 0

export default async function RepsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: reps } = await supabase.from('n400_representatives')
    .select('*').order('state_code').order('district_number')

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Congressional Representatives ({reps?.length ?? 0})</h1>
      <div className="space-y-2">
        {(reps ?? []).map(r => {
          const update = updateRep.bind(null, r.state_code, r.district_number)
          return (
            <form key={`${r.state_code}-${r.district_number}`} action={update}
              className="flex items-center gap-3 border rounded-lg p-3">
              <span className="text-sm font-mono text-gray-400 w-16">{r.state_code}-{r.district_number}</span>
              <input name="rep_name" defaultValue={r.rep_name} className="flex-1 border rounded p-1 text-sm" />
              <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Save</button>
            </form>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/app/[locale]/admin/n400/
git commit -m "feat(n400): add admin pages for state data and congressional representatives"
```

---

## Phase 7 Complete ✅

Admin can edit all 128 questions, answers, audio URLs, state data, and representatives without redeploy. Cache invalidated on every save.

**Next:** Proceed to [Phase 8 — Analytics + Monitoring](2026-05-13-n400app-phase-8-analytics.md).
