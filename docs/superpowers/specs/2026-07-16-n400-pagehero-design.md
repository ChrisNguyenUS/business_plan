# N400 PageHero Consistency + Việt hóa Greeting — Design Spec

**Ngày:** 2026-07-16 · **Trạng thái:** Đã duyệt (hướng A — recipe-only) · **App:** `apps/website` (n400app)

## Bối cảnh

Sau khi chuẩn hóa CTA verb system (merge `1f7bb16a`), còn 3 điểm lệch nhất quán giữa 4 trang chính (Tổng quan / Học tập / Thi thử / Tiến độ):

1. Container mỗi trang một khổ: Tổng quan `max-w-[1400px]`, Học tập + Thi thử `max-w-6xl`, Tiến độ `max-w-[900px]`.
2. Hero Thi thử lạc loài: nền gradient teal, ảnh đóng khung inset 42%, viền teal, không có eyebrow badge — trong khi hero Tổng quan và Tiến độ đã cùng một recipe (Card trắng, ảnh phủ mép phải ~44%, gradient trắng blend, eyebrow pill).
3. Header Tổng quan chào bằng tiếng Anh giữa app toàn tiếng Việt; chip "Khoảng 15–18 phút" ở hero Thi thử trông như button (false affordance).

## Quyết định

**Hướng A — recipe-only.** Không tạo component hero chung. Lý do: hero Tổng quan có geometry torch được bảo vệ (recipe `--pop`/padding/blend đã duyệt — xem memory `n400-dashboard-hero-card-geometry`), ép chung component sẽ cần escape hatch ngay → abstraction giả. Recipe được văn bản hóa tại đây; chỉ cân nhắc extract component nếu xuất hiện hero thứ 4.

## Hero recipe chuẩn (nguồn chân lý)

Mọi hero card trên trang hub phải theo khung này (nội dung bên trong tự do):

- **Khung:** `Card` trắng, `!p-0 relative overflow-hidden border-slate-200/60 shadow-sm` (Tổng quan dùng `!overflow-visible` — ngoại lệ duy nhất, cho torch overflow).
- **Ảnh:** absolute phủ mép phải, `inset-y-0 right-0 w-[44%]`, `object-cover`, kèm gradient blend mép trái vào nền trắng (`bg-gradient-to-r from-white via-white/80 to-transparent`, bề rộng w-28–w-32). Ẩn ảnh ở breakpoint nhỏ nếu nội dung cần chỗ.
- **Nội dung:** cột trái `relative z-[1]`, chiếm ~56–62%, padding chuẩn `p-5 sm:p-8` (ngoại lệ: ReadinessHero giữ `p-3 sm:p-6` vì contract compact — phải chia 1 màn mobile với SkillsCard + StatsRow).
- **Eyebrow badge:** pill `rounded-full border-slate-100 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-700 shadow-sm` + icon Star amber, đặt trên title.
- **Container trang:** mọi trang hub dùng `max-w-6xl` + `mx-auto`.

## Thay đổi cụ thể

### 1. Container (2 dòng)
- `app/[locale]/n400app/(app)/dashboard-client.tsx:232`: `max-w-[1400px]` → `max-w-6xl`.
- `app/[locale]/n400app/(app)/progress/page.tsx:187`: `max-w-[900px]` → `max-w-6xl`.
- Không đụng gì khác ở 2 file này. Học tập + Thi thử đã đúng.

### 2. Hero Thi thử (`app/[locale]/n400app/(app)/mock-test/page.tsx`, section hero ~dòng 107–160)
- Khung: `<section>` gradient teal (`border-teal-100 bg-gradient-to-r from-teal-50 via-white to-sky-50`) → khung recipe chuẩn (Card trắng như trên).
- Ảnh `Hero bar thumbnail.png`: từ khung inset bo góc `lg:w-[42%]` → tràn mép phải `w-[44%]` + gradient blend trái theo recipe (copy từ ReadinessHero). Vẫn `hidden lg:block`.
- Thêm eyebrow badge: `★ THI NHƯ THẬT` theo style pill chuẩn.
- Chip "Khoảng 15–18 phút": bỏ `border bg-white rounded-xl shadow-sm px-4 py-2.5` → text thường: icon Clock + `text-xs font-semibold text-gray-500`, không nền không viền.
- **Giữ nguyên:** title "Thi thử như phỏng vấn thật!", subtitle, 4 feature chips (HERO_FEATURES), CTA "Bắt đầu thi thử đầy đủ", mọi `clamp()` spacing và cấu trúc `lg:h-full lg:justify-center` của trang (trang này thiết kế fit viewport — không được làm tràn scroll).

### 3. Greeting (`components/n400/Header.tsx:123–126`)
- `Good morning/afternoon/evening` → `Chào buổi sáng` (<12h) / `Chào buổi chiều` (<18h) / `Chào buổi tối`.
- Title: `${greeting}, ${getShortName(profile)}! 👋` (giữ nguyên cấu trúc).
- Subtitle: `Ready to continue your citizenship journey?` → `Sẵn sàng tiếp tục hành trình chinh phục quốc tịch Mỹ chưa?`

## Không làm (out of scope)
- Không đổi ReadinessHero (padding, ring, milestones giữ nguyên).
- Không đổi hero Tổng quan ngoài container bọc ngoài.
- Không đụng luật filled vs tinted accent của card grid (việc riêng, làm sau).
- Không thêm i18n framework — hard-code tiếng Việt như phần còn lại của app.

## Kiểm chứng
- `pnpm --filter website test` (baseline main hiện tại: 349 test / 38 file) — một số test đọc source trang; nếu có assert dính `max-w-[900px]`, `Good evening`… thì sửa assertion theo giá trị mới.
- `pnpm --filter website exec tsc --noEmit` sạch.
- Screenshot 4 trang (theo memory `n400-visual-verification-recipe`) so trước/sau: hero cùng bề ngang, hero Thi thử cùng khung trắng, trang Thi thử vẫn không scroll ở desktop, torch dashboard vẫn overflow đúng.

## Rủi ro
- Dashboard co 1400→1152: hero torch geometry %-based nên recipe không đổi, nhưng cột phải ("Gợi ý dành cho bạn") hẹp lại — chấp nhận, verify bằng mắt.
- Tiến độ nới 900→1152: SkillsCard 4 cột giãn nhẹ — chấp nhận.
- Trang Thi thử fit-viewport: đổi khung hero không được thêm chiều cao đáng kể (ảnh tràn mép thay khung inset không thêm height; badge pill thêm ~28px — bù bằng việc title không cần margin-top lớn; verify no-scroll).
