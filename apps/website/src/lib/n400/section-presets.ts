// Practice presets for the Speaking sections. Same 4 tier ids as civics
// (PracticeSessionPicker keys its icons/colors off these ids) with counts
// scaled to each pool — the spec's "one practice theme across the app".
// Writing presets land with the Writing section (Plan 3).

import type { PracticePreset } from './quiz-engine';

export const WHATMEAN_PRESETS: PracticePreset[] = [
  { id: 'quick', titleVi: 'Luyện nhanh', titleEn: 'Quick Practice', descVi: 'Ôn nhanh trong vài phút.', count: 5, minutes: 3 },
  { id: 'standard', titleVi: 'Tiêu chuẩn', titleEn: 'Standard Practice', descVi: 'Bài luyện vừa sức mỗi ngày.', count: 15, minutes: 8 },
  { id: 'deep', titleVi: 'Chuyên sâu', titleEn: 'Deep Practice', descVi: 'Ghi nhớ kỹ hơn, nhớ lâu hơn.', count: 30, minutes: 15 },
  { id: 'full', titleVi: 'Ôn toàn bộ', titleEn: 'Full Review', descVi: 'Ôn toàn bộ 62 từ vựng.', count: null, minutes: 30 },
];

export const YESNO_PRESETS: PracticePreset[] = [
  { id: 'quick', titleVi: 'Luyện nhanh', titleEn: 'Quick Practice', descVi: 'Ôn nhanh trong vài phút.', count: 5, minutes: 3 },
  { id: 'standard', titleVi: 'Tiêu chuẩn', titleEn: 'Standard Practice', descVi: 'Bài luyện vừa sức mỗi ngày.', count: 10, minutes: 5 },
  { id: 'deep', titleVi: 'Chuyên sâu', titleEn: 'Deep Practice', descVi: 'Ghi nhớ kỹ hơn, nhớ lâu hơn.', count: 20, minutes: 10 },
  { id: 'full', titleVi: 'Ôn toàn bộ', titleEn: 'Full Review', descVi: 'Ôn toàn bộ 37 câu hỏi.', count: null, minutes: 20 },
];

export const WRITING_PRESETS: PracticePreset[] = [
  { id: 'quick', titleVi: 'Luyện nhanh', titleEn: 'Quick Practice', descVi: 'Nghe và gõ nhanh vài câu.', count: 5, minutes: 4 },
  { id: 'standard', titleVi: 'Tiêu chuẩn', titleEn: 'Standard Practice', descVi: 'Bài luyện vừa sức mỗi ngày.', count: 10, minutes: 8 },
  { id: 'deep', titleVi: 'Chuyên sâu', titleEn: 'Deep Practice', descVi: 'Viết nhiều hơn, nhớ lâu hơn.', count: 20, minutes: 15 },
  { id: 'full', titleVi: 'Ôn toàn bộ', titleEn: 'Full Review', descVi: 'Ôn toàn bộ 45 câu viết.', count: null, minutes: 30 },
];
