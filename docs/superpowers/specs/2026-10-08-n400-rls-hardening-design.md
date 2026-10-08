# N400 RLS hardening — R3 chống giả điểm Civics + R2 hiệu năng RLS

**Ngày:** 2026-10-08
**Trạng thái:** Draft — chờ owner review
**Phạm vi:** `apps/website/` (thi thử Civics, Phỏng vấn đầy đủ, nút Reset) + 3 migration `n400_36`–`n400_38` trên Supabase dùng chung. Không đụng `apps/internal_app/`, không đụng bảng `profiles`.
**Đi trước:** R1 đã ship — `n400_35_function_grants` (main 230cb709, 2026-10-07): thu quyền gọi các hàm SECURITY DEFINER nội bộ.

## 0. Mục tiêu

- **R3:** mọi kết quả **thi thử Civics** (thi thử Civics riêng + phần Civics của Phỏng vấn đầy đủ) do **server** chấm. User không thể tự ghi kết quả hay verdict vào DB.
- **R2:** viết lại toàn bộ policy của các bảng `n400_*` để Postgres tính `auth.uid()`/helper **một lần mỗi query**, và mỗi (bảng, role, hành động) chỉ còn **một** policy; thêm index cho 4 khóa ngoại. **Không đổi** ai được đọc/ghi gì.
- **Kèm theo:** sửa nút Reset ở trang Tài khoản (bug có sẵn, §1.10).

### Quyết định đã chốt (owner)

| Quyết định | Chốt |
|---|---|
| Phạm vi | Làm R1 + R2 + R3 ngay; bỏ điều kiện "chờ xong OAuth Google/Facebook" (2026-10-07) |
| Kết quả phải không thể giả | **Mọi thi thử Civics.** Luyện tập, Speaking, Viết vẫn do client chấm |
| Phần Civics của Phỏng vấn đầy đủ | **Hướng A:** dùng chung đường của thi thử Civics riêng (`startMockAttempt` lúc bắt đầu, `finalize…` lúc xong phần) |
| CAPI `n400_mock_test_pass` | **Chỉ** thi thử Civics riêng, như hiện nay. Phỏng vấn đầy đủ không bắn |
| Nút Reset | Sửa bằng RPC xóa **toàn bộ** tiến độ của chính mình; không xóa lẻ từng bài |
| Thứ tự | R3 (bảo mật) trước, R2 (hiệu năng) sau; chung một spec |

### Mô hình đe dọa

- **Chặn:** user dùng session của chính mình gọi PostgREST để ghi thẳng kết quả, verdict hoặc đáp án vào DB (4 đường ở §1.5).
- **Không chặn (chủ ý):** script gửi toàn đáp án đúng qua đúng luồng thi. Đây là app học — đáp án nằm sẵn trong bundle. Kết quả đó vẫn là "trả lời đúng" theo server chấm.

### Ngoài phạm vi

- Luyện tập Civics, Speaking, Viết: vẫn self-reported. Bảng `n400_section_attempts`, `n400_section_mock_results` giữ quyền ghi của owner (R2 chỉ viết lại cho nhanh, không đổi quyền).
- `profiles`, bảng internal_app, `is_ultimate_admin`, `rls_auto_enable`, Leaked password protection (nút trong Dashboard).
- Giới hạn thời gian làm bài, chống replay seed, chống bot.

## 1. Bối cảnh đã xác minh

Kiểm tra trên prod và code `main` 230cb709, 2026-10-07/08 — không phải giả định:

1. **`n400_quiz_attempts`** có 3 policy: `n400 attempts own insert` (INSERT, `WITH CHECK (auth.uid() = user_id)` — ghi được **mọi cột**: `score`, `passed`, `completed_at`, `slide_manifest`), `n400 attempts own select`, `n400 attempts admin read`. Owner **không** có UPDATE/DELETE.
2. **`n400_question_attempts`** có `n400 question attempts own` **FOR ALL** (sở hữu qua attempt cha) → owner INSERT/UPDATE/DELETE được mọi `was_correct`/`transcript`; cộng `admin read`.
3. **Thi thử Civics riêng** (`mock-test/civics/actions.ts`):
   - `startMockAttempt` insert attempt **bằng session của user** (đi qua policy #1) và lưu `slide_manifest` = answer key dựng từ seed.
   - `finalize_mock_attempt_batch` chấm picks theo manifest, nhưng `NOT EXISTS` **giữ nguyên** các dòng câu trả lời đã có ("partial v1 submit"); `n400_finalize_mock_core` đếm **mọi** dòng; **không** kiểm tra `mode`.
   - Đường giọng nói: server action chấm transcript (`gradeVoiceMock`) rồi gọi `finalize_mock_attempt_voice_batch` bằng service_role; hàm này **có** kiểm tra `mode = 'mock_test'`.
4. **Phỏng vấn đầy đủ** (`mock-test/full/page.tsx`): `buildCivicsPhase` (`lib/n400/full-interview.ts:32`) dựng câu hỏi; client tự chấm; `recordMockResult` (`lib/n400/user-state.tsx`) insert một dòng `mock_test` đã hoàn tất + các dòng câu trả lời (`mockQuizAttemptRow`/`mockQuestionAttemptRows` trong `attempt-row.ts`), đi qua policy #1 và #2.
5. **Bốn đường giả "đậu Civics"** hiện có:
   - (a) insert thẳng dòng `mock_test` với `passed = true`;
   - (b) bắt đầu thi thật, insert 20 dòng `was_correct = true`, rồi finalize → **đậu + CAPI**;
   - (c) insert attempt có `slide_manifest` tự chế, finalize với picks khớp → **đậu + CAPI**;
   - (d) tạo attempt `practice` có ≥ 12 dòng đúng, gọi `finalize_mock_attempt_batch` với id đó → **đậu + CAPI**.
6. **CAPI** `n400_mock_test_pass` chỉ bắn trong `evaluateMockUnlocks` (`actions.ts`) khi `passed`, từ cả hai finalize action. Phỏng vấn đầy đủ hiện không bắn.
7. **Kết quả giả lan vào:** lead score (`mock_avg_above_90` đọc `n400_quiz_attempts`), badge, readiness "thi thử gần nhất", và CAPI (b–d).
8. **Hai bộ dựng đáp án:**
   - Thi riêng: `selectMockTestQuestions(seed)`, **bỏ Q29** khi chưa có district, option seed `` `mock-${seed}-${q.id}` ``. Code này được **chép ở 2 nơi**: `civics/page.tsx` (startNew) và `actions.ts` (startMockAttempt).
   - Phỏng vấn đầy đủ: `buildCivicsPhase(seed)` với seed `` `full-${n}` ``, **giữ Q29**, option seed `` `full-${seed}-${i}` `` (i = vị trí).
   - `buildOptions` luôn có một lựa chọn đúng: Q29 thiếu district thì chấp nhận mọi dân biểu của tiểu bang.
9. **Câu trả lời của Phỏng vấn đầy đủ** đến qua `SectionMCQuiz.onAnswer(itemId, ok, selected?: MCOption, via?, spoken?: SpokenMockAnswer)`. `MCOption` có `id` (A–D); `SpokenMockAnswer` đúng là kiểu `VoiceMockAnswer` mà `gradeVoiceMock` nhận.
10. **Nút Reset** (`resetAll`, `user-state.tsx`) xóa `n400_quiz_attempts`, nhưng bảng này không có policy DELETE cho owner → lệnh không có tác dụng và **không báo lỗi**; reload thì lịch sử Civics quay lại. Bookmarks và hai bảng section có owner FOR ALL nên xóa được.
11. **RPC app không gọi trực tiếp** nhưng `authenticated` vẫn gọi được: `finalize_mock_attempt` (chỉ được gọi bên trong batch), `submit_mock_answer` (luồng v1), `finalize_practice_attempt`.
12. `is_admin()` / `is_staff_or_admin()`: SECURITY DEFINER, STABLE, `search_path=public`, đọc `profiles` theo `auth.uid()` — **cùng định nghĩa** với điều kiện `EXISTS (… FROM profiles … role = 'admin')` viết inline trong các policy admin. `anon` không có EXECUTE trên hai hàm này.
13. Service role đã được dùng trên prod (`finalizeVoiceMockAttempt` gọi `createServerSupabaseClient()`).
14. Migration mới nhất đã apply: `n400_35_function_grants`. 22 bảng `n400_*`, tất cả bật RLS, không FORCE.
15. `components/n400/navigation-ia.test.ts:175` đọc source trang Phỏng vấn đầy đủ và assert có chuỗi `recordMockResult`.

## 2. R3a — code app (ship + deploy TRƯỚC `n400_37`)

### 2.1 Một bộ dựng đáp án chung

Module mới `apps/website/src/lib/n400/civics-mock-slides.ts` (pure, dùng được cả client lẫn server):

```ts
export type CivicsMockKind = 'civics' | 'full';
export interface CivicsMockSlide { question: N400Question; options: QuizOption[] }

export function civicsMockSlides(
  kind: CivicsMockKind, seed: string, stateCode: StateCode, districtNumber: number | null,
): CivicsMockSlide[];

export function civicsMockAnswerKey(slides: readonly CivicsMockSlide[]): { qid: number; correct: QuizOption['id'] }[];
```

- `civics`: `selectMockTestQuestions(seed)` bỏ Q29 khi `districtNumber === null`; options `buildOptions(q, stateCode, \`mock-${seed}-${q.id}\`, districtNumber)`.
- `full`: `selectMockTestQuestions(seed)` giữ nguyên; options `buildOptions(q, stateCode, \`full-${seed}-${i}\`, districtNumber)`.
- Ba nơi dùng chung: `civics/page.tsx` (startNew), `buildCivicsPhase` (map slide → `MCQuestion`), `startMockAttempt` (answer key).
- **Cùng seed → cùng câu hỏi, cùng lựa chọn như hôm nay.** Test đặc tả (characterization) viết **trước** khi refactor, so bản mới với code cũ trên nhiều seed × tiểu bang × có/không district.

### 2.2 `startMockAttempt({ kind, seed, stateCode, districtNumber })`

- Xác thực user bằng `getUser()` (như hiện nay).
- Kiểm tra đầu vào: `kind ∈ {'civics','full'}`; seed là chuỗi 1–64 ký tự; district là số nguyên hoặc `null` (như hiện nay); **mới:** `stateCode` phải có trong `STATES_BY_CODE`.
- Insert attempt bằng **service-role client** với `user_id` đã xác thực: `{ user_id, mode: 'mock_test', total_questions: key.length, slide_manifest: key, started_at }`. Sau `n400_37`, đây là **cách duy nhất** để có dòng `mock_test`.
- Trả về `{ attemptId, startedAt }` như cũ.

### 2.3 Hai finalize action

- `finalizeMockAttempt(attemptId, picks, kind = 'civics')` và `finalizeVoiceMockAttempt(attemptId, answers, kind = 'civics')`. Server kiểm tra `kind ∈ {'civics','full'}`.
- `kind` **chỉ** quyết định CAPI: `evaluateMockUnlocks` bắn `n400_mock_test_pass` khi `passed && kind === 'civics'`. Badge được xét cho cả hai.
- `kind` do client gửi, **không phải ranh giới bảo mật**: "giả" `kind` vẫn phải thật sự đậu bài do server chấm.

### 2.4 Trang Phỏng vấn đầy đủ (`mock-test/full/page.tsx`)

- **Bắt đầu:** `begin()` tính giá trị seed mới **một lần**, dùng cho cả `setSeed` lẫn `startMockAttempt({ kind: 'full', seed: \`full-${next}\`, stateCode, districtNumber })` chạy ngầm. Giữ `attemptIdPromise` + `pendingStart` để retry một lần, giống `civics/page.tsx`.
- **Lưu đủ dữ liệu cho finalize:** `CivicsAnswer` giữ thêm `selectedId` và nguyên object `spoken`.
- **Xong phần Civics:** vẫn hiện kết quả client và chuyển ngay sang phần tiếp như hôm nay; song song chạy `finalizeCivics()`:
  1. lấy `attemptId` (await promise; hỏng thì gọi lại `startMockAttempt` một lần);
  2. run giọng nói → `finalizeVoiceMockAttempt(id, answers, 'full')`, với `answers` = `spoken ?? { qid, selected: selectedId }` (bỏ câu không có cả hai — server chấm sai, như thi riêng); run trắc nghiệm → `finalizeMockAttempt(id, picks, 'full')`;
  3. thành công → điểm, `passed` và đúng/sai từng câu lấy theo **server** (giọng nói: `answers`; trắc nghiệm: so pick với `manifest`); ghi kết quả vào state local (`noteMockResult`); cập nhật streak bằng `applyStreak` (đã có trong `user-state.tsx`, hiện chưa ai gọi).
- **Lỗi:** khi mở màn hình kết quả cuối, finalize còn đang chạy thì **chờ** nó; nếu nó đã lỗi thì retry **một** lần (vẫn dùng `attemptId` cũ; finalize là idempotent khi attempt đã hoàn tất). Vẫn lỗi → vẫn hiện kết quả client, kèm một dòng ghi chú (câu chữ owner duyệt):
  - VI: *"Chưa lưu được kết quả phần Civics, nên kết quả này sẽ không có trong lịch sử."*
  - EN: *"Your Civics result couldn't be saved, so it won't appear in your history."*
- **`recordMockResult` thành `noteMockResult`:** chỉ cập nhật state local, không ghi DB. Xóa `mockQuizAttemptRow`, `mockQuestionAttemptRows` và test của chúng. Sửa assert ở `navigation-ia.test.ts:175` theo wiring mới.

### 2.5 Thi thử Civics riêng (`mock-test/civics/page.tsx`)

`startNew` dùng `civicsMockSlides('civics', …)` thay đoạn chép, gửi `kind: 'civics'`. Không đổi hành vi.

### 2.6 Nút Reset (`resetAll`, `user-state.tsx`)

Reset state local như hiện nay, rồi `await supabase.rpc('n400_reset_my_progress')` thay cho 4 lệnh xóa + upsert streak. Lỗi → `console.error` (như các lỗi ghi khác trong file).

## 3. Migrations

Thứ tự apply là bắt buộc — xem §5.

### 3.1 `n400_36_reset_my_progress` — chỉ thêm mới, apply TRƯỚC khi deploy R3a

```sql
CREATE OR REPLACE FUNCTION public.n400_reset_my_progress()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  DELETE FROM n400_quiz_attempts        WHERE user_id = v_user;  -- question rows cascade
  DELETE FROM n400_section_attempts     WHERE user_id = v_user;
  DELETE FROM n400_section_mock_results WHERE user_id = v_user;
  DELETE FROM n400_bookmarks            WHERE user_id = v_user;
  UPDATE n400_user_profile
     SET current_streak = 0, longest_streak = 0, last_activity_date = NULL, updated_at = now()
   WHERE user_id = v_user;
  PERFORM recompute_n400_lead_score(v_user);
END $$;

REVOKE EXECUTE ON FUNCTION public.n400_reset_my_progress() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.n400_reset_my_progress() TO authenticated;
```

- **Giữ lại:** badge đã đạt (`n400_user_badges.trigger_attempt_id` tự về NULL theo FK), growth event (lịch sử cho nhân viên), lead profile (được tính lại), consultation request, profiling prompt, các field khác của `n400_user_profile` (địa chỉ, cài đặt).
- Xóa attempt không bắn trigger growth nào (chỉ có trigger AFTER INSERT/UPDATE).

### 3.2 `n400_37_civics_mock_lockdown` — R3b, apply SAU khi R3a đã deploy và đã kiểm tra trên prod

```sql
-- n400_quiz_attempts: owner chỉ còn ghi envelope luyện tập
DROP POLICY "n400 attempts own insert" ON public.n400_quiz_attempts;
CREATE POLICY "n400 attempts own practice insert" ON public.n400_quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid())
              AND mode IN ('practice', 'flashcard')
              AND slide_manifest IS NULL);

-- n400_question_attempts: đọc của mình; chỉ ghi dưới attempt luyện tập của mình, không transcript
DROP POLICY "n400 question attempts own" ON public.n400_question_attempts;
CREATE POLICY "n400 question attempts own select" ON public.n400_question_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.n400_quiz_attempts a
                 WHERE a.id = attempt_id AND a.user_id = (select auth.uid())));
CREATE POLICY "n400 question attempts own practice insert" ON public.n400_question_attempts
  FOR INSERT TO authenticated
  WITH CHECK (transcript IS NULL
              AND EXISTS (SELECT 1 FROM public.n400_quiz_attempts a
                          WHERE a.id = attempt_id AND a.user_id = (select auth.uid())
                            AND a.mode IN ('practice', 'flashcard')));
```

- **`finalize_mock_attempt_batch` và `finalize_mock_attempt`:** `CREATE OR REPLACE` từ **thân hàm đang chạy trên prod** (`pg_proc.prosrc`, không lấy từ file migration cũ — `n400_33` đã viết lại core). Thêm đọc `mode`; `RAISE EXCEPTION 'unauthorized'` khi user khác `auth.uid()` **hoặc** `mode IS DISTINCT FROM 'mock_test'`. Phần còn lại giữ nguyên từng chữ. `CREATE OR REPLACE` giữ nguyên quyền đã cấp (R1).
- `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` trên `finalize_mock_attempt(uuid)`, `submit_mock_answer(uuid, integer, text)`, `finalize_practice_attempt(uuid)`.
- **Sau migration này:** mọi dòng `mock_test` do server tạo; mọi verdict của thi thử do RPC finalize ghi. Bốn đường ở §1.5 đều bị chặn: (a), (c) bởi policy INSERT mới; (b) vì owner không ghi được câu trả lời dưới attempt thi thử; (d) bởi kiểm tra `mode`.
- Owner vẫn không có UPDATE/DELETE trên hai bảng (Reset đi qua RPC §3.1).

### 3.3 `n400_38_rls_perf` — R2, apply SAU `n400_37`

Quy tắc viết lại, áp cho mọi policy trên 22 bảng `n400_*`:

1. `auth.uid()` → `(select auth.uid())`; `is_admin()` → `(select public.is_admin())`; `is_staff_or_admin()` → `(select public.is_staff_or_admin())`.
2. `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')` → `(select public.is_admin())` (§1.12).
3. `USING (auth.role() = 'authenticated')` → `TO authenticated USING (true)`.
4. Một policy cho mỗi (bảng, role, hành động): gộp "own read" với "admin/staff read" thành một SELECT; tách admin `FOR ALL` thành INSERT / UPDATE (USING + WITH CHECK) / DELETE.
5. Policy gọi helper luôn `TO authenticated` (anon không có EXECUTE → nếu anon phải đánh giá policy đó sẽ lỗi 42501, bài học `n400_31`).

Policy đích:

| Bảng | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `n400_questions`, `n400_answers` | anon: `deleted_at IS NULL` · authenticated: `deleted_at IS NULL OR admin` | admin | admin | admin |
| `n400_location_answers`, `n400_state_data`, `n400_representatives`, `n400_badges` | public: `true` (giữ nguyên) | admin | admin | admin |
| `n400_feature_flags`, `n400_growth_rules`, `n400_cta_definitions`, `n400_prompt_definitions` | authenticated: `true` | admin | admin | admin |
| `n400_bookmarks`, `n400_section_attempts`, `n400_section_mock_results` | own OR admin | own | own | own |
| `n400_user_profile` | own OR staff/admin | own | own | own |
| `n400_user_badges` | own OR admin | — | — | — |
| `n400_quiz_attempts` | own OR admin | giữ từ `n400_37` | — | — |
| `n400_question_attempts` | own (qua attempt cha) OR admin | giữ từ `n400_37` | — | — |
| `n400_growth_events` | own OR staff/admin | own + `event_type IN ('checklist_viewed','consultation_form_opened')` (giữ nguyên) | — | — |
| `n400_lead_profiles`, `n400_profile_prompts` | own OR staff/admin | — | — | — |
| `n400_consultation_requests` | own OR staff/admin | own | admin | — |
| `n400_cta_decision_log` | staff/admin | — | — | — |

"own" = `user_id = (select auth.uid())`; "admin" = `(select public.is_admin())`; "staff/admin" = `(select public.is_staff_or_admin())`; "—" = không có policy (như hiện nay). Ghi chú: `checklist_viewed` đã thuộc tính năng bị bỏ ở G3c — giữ nguyên vì R2 không đổi quyền.

Index cho khóa ngoại (bảng nhỏ, không cần `CONCURRENTLY`):

```sql
CREATE INDEX IF NOT EXISTS n400_bookmarks_question_id_idx           ON public.n400_bookmarks (question_id);
CREATE INDEX IF NOT EXISTS n400_consultation_requests_user_id_idx   ON public.n400_consultation_requests (user_id);
CREATE INDEX IF NOT EXISTS n400_user_badges_slug_idx                ON public.n400_user_badges (slug);
CREATE INDEX IF NOT EXISTS n400_user_badges_trigger_attempt_id_idx  ON public.n400_user_badges (trigger_attempt_id);
```

## 4. Kiểm chứng

Mọi kiểm chứng trên prod dùng **một khối `DO` tự rollback**: chạy câu lệnh migration, đổi role bằng `set_config('role', …)` + `request.jwt.claims`, thử từng thao tác trong `begin … exception`, rồi `RAISE EXCEPTION` mang kết quả ra ngoài — không để lại gì. Sau mỗi lần apply thật, chạy lại khối kiểm tra (không kèm DDL) và xác nhận không có dữ liệu thừa.

- **`n400_36`:** user test có envelope luyện tập + câu trả lời, section attempt, bookmark, streak > 0 → gọi RPC → tất cả bị xóa, streak = 0, badge còn nguyên; anon gọi → bị chặn.
- **`n400_37`:** (a)–(d) ở §1.5 đều bị chặn; owner insert dòng câu trả lời có `transcript` → bị chặn; `authenticated` gọi `finalize_mock_attempt` / `submit_mock_answer` / `finalize_practice_attempt` → bị chặn. Đường hợp lệ vẫn chạy: envelope luyện tập + 1 dòng; attempt `mock_test` tạo bằng quyền server rồi `finalize_mock_attempt_batch` bằng picks; `finalize_mock_attempt_voice_batch` bằng service_role; `n400_reset_my_progress`.
- **`n400_38` — ma trận tương đương:** role {anon, client A (có dữ liệu), client B, staff, admin} × 22 bảng; mỗi ô = số dòng thấy được + kết quả thử INSERT / UPDATE / DELETE (`ok` / `denied`). Tính ma trận với policy cũ → áp policy mới → tính lại → hai ma trận phải **trùng khớp**. Staff/admin giả lập bằng `UPDATE profiles SET role = …` bên trong khối rollback. Sau khi apply: advisor `auth_rls_initplan`, `multiple_permissive_policies`, `unindexed_foreign_keys` không còn dòng nào cho bảng `n400_*`.
- **R3a (code):** vitest (test đặc tả bộ dựng đáp án; kiểm tra đầu vào `startMockAttempt`; `kind` chỉ ảnh hưởng CAPI; quy tắc ghép `answers`/picks và verdict từ kết quả server), `tsc`, eslint, build. Sau deploy: owner chạy 1 Phỏng vấn đầy đủ trắc nghiệm + 1 bằng giọng nói; mình kiểm tra DB: attempt có `slide_manifest`, `answer_mode` đúng, dòng câu trả lời có transcript ở run giọng nói, không có event CAPI; thi thử Civics riêng vẫn chạy; Reset xóa được lịch sử Civics sau reload.

## 5. Triển khai và gate

| # | Bước | Điều kiện đi tiếp |
|---|---|---|
| 1 | Apply `n400_36` (RPC Reset) | Khối kiểm tra §4 đạt |
| 2 | R3a: code §2, merge + push → Vercel deploy | Build trên Vercel xanh; owner chạy thử theo §4; DB đúng như mô tả |
| 3 | Apply `n400_37` (khóa quyền ghi) | Khối kiểm tra §4 đạt; Phỏng vấn đầy đủ + thi riêng + luyện tập vẫn ghi được |
| 4 | Apply `n400_38` (hiệu năng) | Ma trận tương đương trùng khớp; advisor sạch |
| 5 | ROADMAP: thêm dòng RLS hardening | — |

Mỗi migration và mỗi thay đổi logic là commit riêng.

## 6. Rủi ro

- **Apply `n400_37` trước khi deploy R3a** → code cũ trên prod không lưu được kết quả Phỏng vấn đầy đủ. Gate ở bước 2 chặn chuyện này.
- **Tab cũ còn mở qua lúc deploy** vẫn chạy code cũ → sau `n400_37`, lượt Phỏng vấn đầy đủ đó không được lưu (console có lỗi). Chấp nhận: lượng user rất nhỏ.
- **Đáp án client và server lệch nhau** → một bộ dựng chung + test đặc tả.
- **Verdict giọng nói khác nhau giữa client và server** (client lấy tiểu bang từ `settings`, server lấy từ profile). Server thắng; màn hình kết quả hiện verdict của server.
- **Ma trận tương đương bỏ sót một ô** → ma trận phủ đủ 22 bảng × 5 role × 4 hành động.
- **Rollback:** mỗi migration kèm đoạn SQL đảo ngược trong plan (policy cũ lấy từ `pg_policies`, thân hàm cũ lấy từ `pg_proc` ngay trước khi apply).

## 7. Việc của owner

- Duyệt câu chữ ghi chú "Chưa lưu được kết quả phần Civics" (EN/VI, §2.4).
- Chạy thử Phỏng vấn đầy đủ sau khi deploy R3a (§4).
- Các Gate S2/S3/S4 về giọng nói vẫn đang chờ, độc lập với spec này.
