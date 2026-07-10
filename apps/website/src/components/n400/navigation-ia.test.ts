import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('N400 information architecture contracts', () => {
  test('flashcards page offers cards and list view modes', () => {
    const page = source('src/app/[locale]/n400app/flashcards/page.tsx');

    expect(page).toContain("'cards' | 'list'");
    expect(page).toContain('QuestionList');
    expect(page).toContain('Flashcard');
    expect(page).toContain('List');
  });

  test('bookmark is no longer a navigation destination', () => {
    expect(source('src/components/n400/Sidebar.tsx')).not.toContain("'bookmark'");
    expect(source('src/components/n400/AvatarMenu.tsx')).not.toContain('/bookmark');
    expect(source('src/components/n400/Header.tsx')).not.toContain('bookmark:');
  });

  test('old bookmark route redirects into flashcards list view', () => {
    const page = source('src/app/[locale]/n400app/bookmark/page.tsx');

    expect(page).toContain('redirect(');
    expect(page).toContain('view=list&filter=bookmarks');
  });

  test('study picker links to all four skills', () => {
    const page = source('src/app/[locale]/n400app/study/page.tsx');

    expect(page).toContain('study/civics');
    expect(page).toContain('speaking/what-mean');
    expect(page).toContain('speaking/yes-no');
    expect(page).toContain('{base}/writing');
  });

  test('civics hub uses the hub module and deep-links methods', () => {
    const page = source('src/app/[locale]/n400app/study/civics/page.tsx');

    expect(page).toContain('HubContinueCard');
    expect(page).toContain('HubStudyCardsCard');
    expect(page).toContain('HubPracticeCard');
    expect(page).toContain('HubWeakAreasCard');
    expect(page).toContain('PracticeModesSheet');
    expect(page).toContain('flashcards?filter=');
    expect(page).toContain('practice?start=');
  });

  test('desktop sidebar collapses to four top-level areas with subtitles', () => {
    const sidebar = source('src/components/n400/Sidebar.tsx');
    const desktop = sidebar.slice(sidebar.indexOf('DESKTOP_MENU'), sidebar.indexOf('MOBILE_MENU'));

    expect(desktop).toContain("href: 'study'");
    expect(desktop).toContain("href: 'mock-test'");
    expect(desktop).toContain("href: 'statistic'");
    expect(desktop).toContain('subtitle:');
    // Individual skills are no longer desktop nav destinations:
    expect(desktop).not.toContain("href: 'study/civics'");
    expect(desktop).not.toContain("href: 'speaking/what-mean'");
    expect(desktop).not.toContain("href: 'speaking/yes-no'");
    expect(desktop).not.toContain("href: 'writing'");
    // Learning methods are no longer nav destinations:
    expect(sidebar).not.toContain("href: 'practice'");
    expect(sidebar).not.toContain("href: 'flashcards'");
    // One merged progress entry, pointing at statistic:
    expect(sidebar).not.toContain("href: 'progress'");
  });

  test('mobile nav is Home / Học tập / Thi thử / Tiến độ', () => {
    const sidebar = source('src/components/n400/Sidebar.tsx');
    const mobile = sidebar.slice(sidebar.indexOf('MOBILE_MENU'));

    expect(mobile).toContain("href: 'study'");
    expect(mobile).toContain("href: 'mock-test'");
    expect(mobile).toContain("href: 'statistic'");
  });

  test('header knows the new sections and parents', () => {
    const header = source('src/components/n400/Header.tsx');

    expect(header).toContain("study:");
    expect(header).toContain("speaking:");
    expect(header).toContain("writing:");
    expect(header).toContain("practice: 'study/civics'");
    expect(header).toContain("flashcards: 'study/civics'");
  });

  test('both progress pages render the shared tab bar', () => {
    expect(source('src/app/[locale]/n400app/statistic/page.tsx')).toContain('ProgressTabs');
    expect(source('src/app/[locale]/n400app/progress/page.tsx')).toContain('ProgressTabs');
  });

  test('hub module exists with the four cards and the bottom sheet', () => {
    const cards = source('src/components/n400/hub/HubCards.tsx');
    const sheet = source('src/components/n400/hub/PracticeModesSheet.tsx');

    expect(cards).toContain('HubContinueCard');
    expect(cards).toContain('HubStudyCardsCard');
    expect(cards).toContain('HubPracticeCard');
    expect(cards).toContain('HubWeakAreasCard');
    expect(sheet).toContain('Chế độ luyện tập');
    expect(sheet).toContain('role="dialog"');
  });

  test('practice page is quiz-only, driven by ?start=', () => {
    const page = source('src/app/[locale]/n400app/practice/page.tsx');

    expect(page).not.toContain('PracticeSessionPicker');
    expect(page).toContain("get('start')");
    expect(page).toContain('study/civics');
  });

  test('section landings use the shared hub module', () => {
    for (const path of [
      'src/app/[locale]/n400app/speaking/what-mean/page.tsx',
      'src/app/[locale]/n400app/speaking/yes-no/page.tsx',
      'src/app/[locale]/n400app/writing/page.tsx',
    ]) {
      const page = source(path);
      expect(page).toContain('HubContinueCard');
      expect(page).toContain('PracticeModesSheet');
      expect(page).not.toContain('PracticeSessionPicker');
    }
    // Writing has no flashcards → no Thẻ học card:
    expect(source('src/app/[locale]/n400app/writing/page.tsx')).not.toContain('HubStudyCardsCard');
  });

  test('PracticeSessionPicker is fully retired', () => {
    expect(existsSync(join(root, 'src/components/n400/PracticeSessionPicker.tsx'))).toBe(false);
  });

  test('SectionMCQuiz supports orchestrated (summary-less) runs', () => {
    const quiz = source('src/components/n400/speaking/SectionMCQuiz.tsx');

    expect(quiz).toContain('skipSummary');
    expect(quiz).toContain('onComplete');
  });

  test('full interview chains the three parts and records results', () => {
    const page = source('src/app/[locale]/n400app/mock-test/full/page.tsx');

    expect(page).toContain('buildCivicsPhase');
    expect(page).toContain('buildSpeakingPhase');
    expect(page).toContain('buildWritingPhase');
    expect(page).toContain('recordMockResult');
    expect(page).toContain("recordSectionMockResult('speaking'");
    expect(page).toContain("recordSectionMockResult('writing'");
  });

  test('mock test picker offers the full interview', () => {
    const page = source('src/app/[locale]/n400app/mock-test/page.tsx');

    expect(page).toContain("'full'");
    expect(page).toContain('Thi thử đầy đủ (Full Interview)');
  });
});
