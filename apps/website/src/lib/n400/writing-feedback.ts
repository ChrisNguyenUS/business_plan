// Annotation/guidance box builder for writing feedback.
//
// Formats grading annotations into UI-friendly feedback blocks and hints.
// Used by the DictationQuiz component to display guidance and feedback
// to the user after they complete a writing exercise.

import { WordAnnotation } from './writing-grader';

export interface FeedbackBlock {
  type: 'guidance' | 'annotation' | 'hint';
  title?: string;
  content: string;
  severity?: 'info' | 'warning' | 'error';
}

/**
 * Builds an array of feedback blocks from annotations.
 *
 * Always includes a guidance block with USCIS writing rules as the first block,
 * followed by one block per annotation (capitalization/spelling slip).
 * Each annotation block has type='annotation', content=hint, and severity='warning'.
 */
export function buildFeedbackBlocks(annotations: WordAnnotation[]): FeedbackBlock[] {
  const blocks: FeedbackBlock[] = [];

  // First block: guidance box with USCIS rules (always shown)
  blocks.push({
    type: 'guidance',
    content: `✍️ Quy tắc viết: **viết hoa** tên người và tên địa danh (Washington, New York City).
**Không viết tắt** — viết "New York City" chứ không "NYC", "United States" chứ không "U.S.".`,
    severity: 'info',
  });

  // Following blocks: one per annotation
  for (const annotation of annotations) {
    blocks.push({
      type: 'annotation',
      content: annotation.hint,
      severity: 'warning',
    });
  }

  return blocks;
}

/**
 * Formats a single annotation hint for display.
 *
 * Generates a user-friendly hint message based on the annotation type:
 * - Capitalization: "Nhớ viết hoa: {canonicalWord}"
 * - Spelling: "Kiểm tra chính tả: {canonicalWord}"
 */
export function formatAnnotationHint(annotation: WordAnnotation): string {
  if (annotation.type === 'capitalization') {
    return `Nhớ viết hoa: ${annotation.canonicalWord}`;
  } else if (annotation.type === 'spelling') {
    return `Kiểm tra chính tả: ${annotation.canonicalWord}`;
  }
  return annotation.hint;
}
