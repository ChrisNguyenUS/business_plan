// N-400 Filing Checklist content (spec §4.3). PLACEHOLDER COPY — every item
// below is a structural stand-in. The owner supplies the real steps/documents
// and reviews them BEFORE the `filing_checklist` flag flips (non-attorney
// disclosure applies, same as the website). Swapping in real content touches
// only this file.
//
// Content is bilingual data (like CTA copy in n400_cta_definitions), not UI
// chrome — so it lives here, not in the i18n dict.
//
// `id` is the localStorage tick key — stable forever once shipped. Renaming
// an id silently resets that item's tick on every device.

export interface ChecklistItem {
  id: string;
  title_vi: string;
  title_en: string;
  /** Optional one-line detail rendered under the title. */
  note_vi?: string;
  note_en?: string;
}

export interface ChecklistSection {
  id: string;
  title_vi: string;
  title_en: string;
  items: ChecklistItem[];
}

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: 'eligibility',
    title_vi: '[PLACEHOLDER] Kiểm tra điều kiện',
    title_en: '[PLACEHOLDER] Check your eligibility',
    items: [
      {
        id: 'elig-residency',
        title_vi: '[PLACEHOLDER] Đủ thời gian thường trú theo diện của bạn',
        title_en: '[PLACEHOLDER] Enough continuous residence for your category',
      },
      {
        id: 'elig-presence',
        title_vi: '[PLACEHOLDER] Đủ thời gian hiện diện thực tế tại Mỹ',
        title_en: '[PLACEHOLDER] Enough physical presence in the U.S.',
      },
      {
        id: 'elig-state',
        title_vi: '[PLACEHOLDER] Cư trú tại tiểu bang hiện tại đủ 3 tháng',
        title_en: '[PLACEHOLDER] 3 months of residence in your current state',
      },
    ],
  },
  {
    id: 'documents',
    title_vi: '[PLACEHOLDER] Chuẩn bị giấy tờ',
    title_en: '[PLACEHOLDER] Gather your documents',
    items: [
      {
        id: 'doc-green-card',
        title_vi: '[PLACEHOLDER] Bản sao thẻ xanh (2 mặt)',
        title_en: '[PLACEHOLDER] Copy of your green card (both sides)',
      },
      {
        id: 'doc-travel',
        title_vi: '[PLACEHOLDER] Danh sách các chuyến đi ra nước ngoài',
        title_en: '[PLACEHOLDER] List of trips outside the U.S.',
        note_vi: '[PLACEHOLDER] Ngày đi, ngày về, quốc gia — 5 năm gần nhất.',
        note_en: '[PLACEHOLDER] Departure/return dates and countries — last 5 years.',
      },
      {
        id: 'doc-photos',
        title_vi: '[PLACEHOLDER] Ảnh thẻ theo chuẩn USCIS',
        title_en: '[PLACEHOLDER] Passport-style photos per USCIS spec',
      },
    ],
  },
  {
    id: 'filing',
    title_vi: '[PLACEHOLDER] Nộp đơn N-400',
    title_en: '[PLACEHOLDER] File your N-400',
    items: [
      {
        id: 'file-review',
        title_vi: '[PLACEHOLDER] Rà soát toàn bộ câu trả lời trước khi nộp',
        title_en: '[PLACEHOLDER] Review every answer before submitting',
      },
      {
        id: 'file-fee',
        title_vi: '[PLACEHOLDER] Chuẩn bị lệ phí hoặc đơn miễn giảm',
        title_en: '[PLACEHOLDER] Prepare the fee or a fee-waiver request',
      },
      {
        id: 'file-copy',
        title_vi: '[PLACEHOLDER] Giữ một bản sao đầy đủ hồ sơ đã nộp',
        title_en: '[PLACEHOLDER] Keep a full copy of what you filed',
      },
    ],
  },
];

export const CHECKLIST_ITEM_IDS: readonly string[] = CHECKLIST_SECTIONS.flatMap(
  (s) => s.items.map((i) => i.id),
);
