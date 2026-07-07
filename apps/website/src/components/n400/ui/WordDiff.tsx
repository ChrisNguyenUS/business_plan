'use client';

import type { WordResult } from '@/lib/n400/writing-grader';

interface WordDiffProps {
  wordResults: WordResult[];
  showAnnotations?: boolean;
}

/**
 * Renders a per-word comparison from grading results with color coding.
 *
 * - Green: correct words
 * - Yellow: spelling/capitalization slips (annotation present)
 * - Red: wrong words / missing words
 */
export function WordDiff({ wordResults, showAnnotations = true }: WordDiffProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {wordResults.map((result, idx) => {
        const isDifferent = result.userWord !== result.canonicalWord;
        const isCorrect = result.isCorrect;
        const hasAnnotation = result.annotation !== null;

        // Determine color class
        let bgClass: string;
        let textClass: string;

        if (hasAnnotation) {
          // Yellow: spelling/capitalization slip
          bgClass = 'bg-yellow-100';
          textClass = 'text-yellow-800';
        } else if (isCorrect) {
          // Green: correct
          bgClass = 'bg-green-100';
          textClass = 'text-green-800';
        } else {
          // Red: wrong
          bgClass = 'bg-red-100';
          textClass = 'text-red-800';
        }

        return (
          <div
            key={idx}
            className={`${bgClass} ${textClass} rounded-lg px-3 py-2 text-sm`}
          >
            <div className="font-medium">{result.userWord}</div>
            {isDifferent && (
              <div className="text-xs italic opacity-75">
                {result.canonicalWord}
              </div>
            )}
            {showAnnotations && hasAnnotation && result.annotation && (
              <div className="text-xs italic opacity-75 mt-0.5">
                {result.annotation.type === 'capitalization'
                  ? 'capitalization'
                  : 'spelling'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
