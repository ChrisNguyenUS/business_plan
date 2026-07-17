# N400 Ready — URL `/n400ready` + song ngữ VI/EN (cookie-based, không locale trong URL)

**Date:** 2026-07-17
**Status:** Approved design, pending implementation plan
**Scope:** `apps/website` — routing/middleware, toàn bộ khu `n400app` (~70 file), 1 migration nhỏ trên `n400_user_profile`. KHÔNG đụng bảng chung `profiles`, KHÔNG đụng `apps/internal_app`.

## 1. Vấn đề

1. **URL app đang là `/en/n400app/...`** — middleware ép mọi URL có prefix locale (`defaultLocale = 'en'`), nút "N400 Ready" trên navbar đi theo locale của website. User muốn URL sạch: `mannaos.com/n400ready/login`.
2. **Chọn ngôn ngữ trong Profile không có tác dụng** — màn Chỉnh sửa hồ sơ lưu `profiles.preferred_language` nhưng không có code nào đọc lại; UI không đổi, URL không đổi.
3. **`/en/n400app` và `/vi/n400app` giống hệt nhau** — toàn bộ UI app là tiếng Việt hardcode (65/70 file), không dùng dictionary. Chưa có bản tiếng Anh.

## 2. Quyết định kiến trúc (đã chốt với user)

| Quyết định | Lựa chọn |
|---|---|
| URL | `/n400ready/*` — **không có** locale segment. Chữ thường; `/N400Ready` (mọi biến thể hoa/thường) redirect về chữ thường. |
| Nguồn ngôn ngữ | Cookie `n400_lang` + cột DB `n400_user_profile.ui_language`. Đổi ngôn ngữ → UI đổi ngay, URL giữ nguyên. |
| Landing login | Mặc định tiếng Việt, toggle VI/EN ngay trên trang. |
| User mới | Popup chọn ngôn ngữ sau login lần đầu, Tiếng Việt được chọn sẵn. |
| Phạm vi EN | Toàn bộ app UI (4 đợt). |
| EN mode | 100% tiếng Anh — ẩn toàn bộ phần dịch nghĩa/giải thích tiếng Việt (câu hỏi civics, flashcards, learning tips). Data song ngữ giữ nguyên, chỉ ẩn khi render. |
| Thư viện | Không cài next-intl. Dictionary tự quản theo pattern repo. |

## 3. Routing & Middleware

- Di chuyển `src/app/[locale]/n400app/` → `src/app/n400ready/` (ngoài `[locale]`). Giữ nguyên 2 route group `(app)` / `(auth)` và toàn bộ cấu trúc con.
- `src/middleware.ts`:
  - Bước ép locale-prefix bỏ qua `/n400ready` (thêm vào nhánh skip, như `/api`).
  - Redirect case-insensitive: `^/n400ready`i với path khác chữ thường → 308 về chữ thường.
  - Redirect legacy: `^/(en|vi)/n400app(/.*)?$` → 308 `/n400ready$2` (bookmark/link cũ sống tiếp).
  - Các regex guard N400 (`N400_RE`, `N400_PUBLIC_RE`, `N400_NO_PROFILE_GATE_RE`) đổi từ `/[a-z]{2}/n400app` → `/n400ready`, các URL redirect trong guard bỏ `/${locale}`.
  - Guard `/admin`, `/portal` và phần website marketing giữ nguyên locale flow như cũ.
- Sweep **47 file** tham chiếu `n400app` path: mọi `href`/`router.push` dạng `/${locale}/n400app/...` → `/n400ready/...`; các component app bỏ dependency vào `params.locale`.
- `src/app/api/auth/callback/route.ts:61-63`: default `next` `/n400app` → `/n400ready`.
- Navbar (`src/components/layout/Navbar.tsx:34`): href → `/n400ready`.
- **Root layout riêng cho segment** (phát hiện khi thi công Đợt 1): app không có root layout dùng chung — `src/app/[locale]/layout.tsx` chính là root layout (`<html>/<body>` + `AuthProvider` + GA/MetaPixel/Vercel Analytics). Move ra ngoài `[locale]` nghĩa là `src/app/n400ready/layout.tsx` phải tự làm root layout: shell + `AuthProvider` + `N400UserStateProvider` + analytics như cũ; KHÔNG mang theo Navbar/Footer/ConditionalChrome và JSON-LD marketing. `<html lang="vi">` cứng ở Đợt 1; Đợt 2 đổi theo cookie `n400_lang`.
- Tests: bộ test đọc source theo path (navigation-ia, mobile-layout, entrypoint-branding…) và e2e `e2e/n400` cập nhật path mới. Repo dùng **vitest**.
- SEO: app sau login nên không cần hreflang; trang `/n400ready/login` là trang public duy nhất — meta/OG song ngữ đặt ngay trong page. Redirect 308 bảo toàn link cũ. Sitemap không liệt kê route app (giữ nguyên hiện trạng).
- Service worker `public/sw-n400.js` chỉ cache `/n400-audio/*` — không dính path app, không cần sửa.

## 4. Nguồn ngôn ngữ

- **Cookie `n400_lang`** (`vi` | `en`): đọc được từ server component ngay lần render đầu; dùng cho cả người chưa login (trang login). Không có cookie → `vi`. `path=/; maxAge=1 năm; SameSite=Lax`.
- **`n400_user_profile.ui_language`** (`text NULL CHECK (ui_language IN ('vi','en'))` — migration mới): nguồn chuẩn sau login. `NULL` = chưa từng chọn → trigger popup.
- Đồng bộ: layout server của `(app)` đọc DB; nếu DB có giá trị và khác cookie → set lại cookie theo DB. Đổi ngôn ngữ ở bất kỳ đâu (popup, profile, toggle) = ghi DB (nếu đã login) + ghi cookie + `router.refresh()`.
- **KHÔNG đụng `profiles.preferred_language`** (bảng chung với internal_app, `DEFAULT 'en' NOT NULL` — không phân biệt được "chưa chọn"). Màn Chỉnh sửa hồ sơ repoint select "Ngôn ngữ / Language" sang `ui_language`; `profiles.preferred_language` để nguyên cho internal_app/portal.

## 5. Trang login (`/n400ready/login`)

- Render tiếng Việt mặc định (theo cookie, không cookie = vi).
- Toggle **VI / EN** trên trang: ghi cookie + refresh — đổi tại chỗ, URL giữ nguyên.
- Nội dung login page (labels, nút, tagline) đi qua dictionary từ Đợt 2.

## 6. Popup chọn ngôn ngữ lần đầu

- Điều kiện hiện: user đã login, có row `n400_user_profile`, và `ui_language IS NULL`.
- Render từ layout `(app)` — mọi trang trong app đều có thể hiện popup (kể cả `/setup` vì setup không hỏi ngôn ngữ).
- Nội dung: 2 lựa chọn "Tiếng Việt" (chọn sẵn) / "English", nút xác nhận. Không có nút đóng-mà-không-chọn (chọn xong mới vào app; bấm xác nhận với mặc định = 1 tap).
- Ghi `ui_language` + cookie → popup không bao giờ hiện lại. **User cũ** (toàn bộ row hiện tại có `ui_language NULL` sau migration) sẽ thấy popup đúng 1 lần — chấp nhận được, coi như migration UX.

## 7. Hạ tầng i18n của app (Đợt 2)

- `src/lib/n400/i18n/`:
  - `config.ts`: `export const N400_LANGUAGES = ['vi', 'en'] as const;` + type `N400Lang` + `DEFAULT_N400_LANG = 'vi'` + tên cookie. **Mọi nơi khác đọc từ đây** (popup, toggle, profile select, provider).
  - `vi.ts`, `en.ts`: dictionary chia namespace theo màn hình (`common`, `nav`, `login`, `dashboard`, `study`, `practice`, `flashcards`, `mockTest`, `speaking`, `writing`, `progress`, `profile`, `setup`, `help`…). `en.ts` typed theo shape của `vi.ts` để miss key là lỗi compile.
  - `server.ts`: `getN400Lang()` đọc cookie (server), `getN400Dict()`.
  - `N400LangProvider` (client): nhận `lang` + dict từ layout server, cấp hook `useN400T()` cho client components.
- Server components đọc trực tiếp; client components qua hook. Không context ngoài khu `n400ready`.

## 8. EN mode = 100% tiếng Anh (Đợt 3–4, theo màn hình)

- Khi `lang === 'en'`: không render các block nghĩa/giải thích tiếng Việt (bản dịch câu hỏi civics, nghĩa flashcard, learning tips VI, guidance VI). Câu hỏi/đáp án gốc tiếng Anh giữ nguyên.
- Data không đổi schema trong scope này; chỉ điều kiện render.

## 9. Extensibility: ngôn ngữ thứ 3 (ví dụ Spanish)

Thiết kế để thêm ngôn ngữ sau này chỉ tốn phần dịch, không tốn kiến trúc:

1. Thêm `'es'` vào `N400_LANGUAGES` + nới CHECK constraint `ui_language`.
2. Thêm `es.ts` mirror `en.ts` (typed — thiếu key không compile).
3. Popup/toggle/profile select tự render theo danh sách — không sửa component.
4. Phần nặng (ngoài scope, sau này): dịch nghĩa nội dung học (128 câu civics, vocabulary, tips) sang ngôn ngữ mới. Mô hình render tổng quát: UI tiếng X → giải nghĩa tiếng X; riêng EN → thuần Anh.

## 10. Lộ trình 4 đợt (mỗi đợt 1 nhánh, commit atomic)

| Đợt | Nội dung | Kết quả thấy được |
|---|---|---|
| 1 | Move route `/n400ready`, middleware (skip locale + 308 legacy + case-insensitive), sweep 47 file path, auth callback, navbar, sửa tests | App chạy y hệt (vẫn tiếng Việt), chỉ URL mới; link cũ redirect |
| 2 | Migration `ui_language`, i18n infra (config/dict/provider), login toggle VI-EN, popup lần đầu, profile select repoint + có tác dụng thật | Đổi ngôn ngữ là khung đổi ngay (dict mới phủ login + vài chuỗi common) |
| 3 | Dịch: Sidebar, Header, dashboard, study hub, profile, setup, help | Khung + hub hoàn chỉnh EN |
| 4 | Dịch: practice, flashcards, mock test, speaking, writing, progress, statistic + ẩn nội dung VI ở EN mode | Toàn app 100% EN |

## 11. Rủi ro / lưu ý

- **47 file** tham chiếu path — Đợt 1 phải sweep bằng grep `n400app` đến 0 kết quả (trừ redirect legacy trong middleware + tài liệu).
- Bộ test đọc source theo path và e2e sẽ vỡ nếu quên — nằm trong definition-of-done Đợt 1.
- OAuth redirect URL cấu hình phía Supabase/Google/Facebook trỏ `/api/auth/callback` — không chứa `n400app`, không cần đổi ở dashboard; chỉ đổi param `next` phía client.
- Không đổi `profiles.preferred_language` — tránh ảnh hưởng internal_app (bảng chung, xem memory `supabase-migrations-layout`).
- Route group `(auth)` login là N400_PUBLIC — sau move, regex public phải khớp path mới trước khi deploy, nếu không sẽ loop redirect ở login.
