// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { BadgeUnlockToast } from './BadgeUnlockToast';
import { N400LangProvider } from '@/lib/n400/i18n/provider';
import { vi as viDict } from '@/lib/n400/i18n/vi';

// Records which badge icons render, so a test can see a render with stale data.
const iconRenders = vi.hoisted(() => [] as string[]);
vi.mock('./BadgeIcon', () => ({
  BadgeIcon: ({ slug }: { slug: string }) => {
    iconRenders.push(slug);
    return <span />;
  },
}));
vi.mock('@/lib/analytics/events', () => ({ trackBadgeUnlocked: vi.fn() }));

const catalog = {
  a: { slug: 'a', title_vi: 'Huy hiệu A', title_en: 'Badge A', description_vi: 'Mô tả A', description_en: 'A' },
  b: { slug: 'b', title_vi: 'Huy hiệu B', title_en: 'Badge B', description_vi: 'Mô tả B', description_en: 'B' },
};

const toast = (slugs: string[]) => (
  <N400LangProvider lang="vi" dict={viDict}>
    <BadgeUnlockToast slugs={slugs} catalog={catalog} trigger="session_complete" />
  </N400LangProvider>
);

// Vitest runs without globals, so testing-library cannot unmount by itself.
afterEach(cleanup);

describe('BadgeUnlockToast', () => {
  it('shows new unlocks when slugs change, without rendering the old ones again', () => {
    const { rerender } = render(toast(['a']));
    expect(screen.getByText('Huy hiệu A')).toBeTruthy();

    iconRenders.length = 0;
    rerender(toast(['b']));
    expect(screen.getByText('Huy hiệu B')).toBeTruthy();
    expect(screen.queryByText('Huy hiệu A')).toBeNull();
    expect(iconRenders).not.toContain('a');
  });

  it('closes one card with its button', () => {
    render(toast(['a', 'b']));
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.queryByText('Huy hiệu A')).toBeNull();
    expect(screen.getByText('Huy hiệu B')).toBeTruthy();
  });
});
