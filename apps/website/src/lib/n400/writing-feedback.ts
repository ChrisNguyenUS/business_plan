// Annotation/guidance box builder for writing feedback.
//
// Formats grading annotations into UI-friendly feedback blocks and hints.
// Used by the DictationQuiz component to display guidance and feedback
// to the user after they complete a writing exercise.

import { WordAnnotation } from './writing-grader';
import type { N400Dict } from './i18n/vi';
import { tFormat } from './i18n/format';

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
export function buildFeedbackBlocks(annotations: WordAnnotation[], dict: N400Dict): FeedbackBlock[] {
  const blocks: FeedbackBlock[] = [];

  // First block: guidance box with USCIS rules (always shown)
  blocks.push({
    type: 'guidance',
    content: dict.writing.guidanceContent,
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
export function formatAnnotationHint(annotation: WordAnnotation, dict: N400Dict): string {
  if (annotation.type === 'capitalization') {
    return tFormat(dict.writing.annotationCapitalization, { word: annotation.canonicalWord });
  } else if (annotation.type === 'spelling') {
    return tFormat(dict.writing.annotationSpelling, { word: annotation.canonicalWord });
  }
  return annotation.hint;
}
