// Practice presets for the Speaking/Writing sections. Same 4 tier ids as
// civics (PracticeModesSheet keys its icons/colors off these ids) with counts
// scaled to each pool — the spec's "one practice theme across the app".

import type { PracticePreset } from './quiz-engine';

export const WHATMEAN_PRESETS: PracticePreset[] = [
  { id: 'quick', titleVi: 'Ôn nhanh', titleEn: 'Quick Review', descVi: 'Ôn nhanh để làm mới trí nhớ.', count: 5, minutes: 3 },
  { id: 'standard', titleVi: 'Luyện hằng ngày', titleEn: 'Daily Practice', descVi: 'Bài luyện đề xuất cho hôm nay.', count: 10, minutes: 5 },
  { id: 'deep', titleVi: 'Thử thách', titleEn: 'Challenge', descVi: 'Thử thách bản thân và lên trình.', count: 20, minutes: 10 },
  { id: 'full', titleVi: 'Ôn toàn bộ', titleEn: 'Master Review', descVi: 'Ôn toàn bộ 62 từ vựng.', count: null, minutes: 30 },
];

export const YESNO_PRESETS: PracticePreset[] = [
  { id: 'quick', titleVi: 'Ôn nhanh', titleEn: 'Quick Review', descVi: 'Ôn nhanh để làm mới trí nhớ.', count: 5, minutes: 3 },
  { id: 'standard', titleVi: 'Luyện hằng ngày', titleEn: 'Daily Practice', descVi: 'Bài luyện đề xuất cho hôm nay.', count: 10, minutes: 5 },
  { id: 'deep', titleVi: 'Thử thách', titleEn: 'Challenge', descVi: 'Thử thách bản thân và lên trình.', count: 20, minutes: 10 },
  { id: 'full', titleVi: 'Ôn toàn bộ', titleEn: 'Master Review', descVi: 'Ôn toàn bộ 37 câu hỏi.', count: null, minutes: 20 },
];

export const WRITING_PRESETS: PracticePreset[] = [
  { id: 'quick', titleVi: 'Ôn nhanh', titleEn: 'Quick Review', descVi: 'Nghe và gõ nhanh vài câu.', count: 5, minutes: 3 },
  { id: 'standard', titleVi: 'Luyện hằng ngày', titleEn: 'Daily Practice', descVi: 'Bài luyện đề xuất cho hôm nay.', count: 10, minutes: 5 },
  { id: 'deep', titleVi: 'Thử thách', titleEn: 'Challenge', descVi: 'Viết nhiều hơn, nhớ lâu hơn.', count: 20, minutes: 10 },
  { id: 'full', titleVi: 'Ôn toàn bộ', titleEn: 'Master Review', descVi: 'Ôn toàn bộ 45 câu viết.', count: null, minutes: 30 },
];
