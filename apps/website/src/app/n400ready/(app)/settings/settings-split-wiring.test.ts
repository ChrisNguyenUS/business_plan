import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Owner decision 2026-10-08 (option B): Tài khoản (/profile) = who you are and your
// badges; Cài đặt (/settings) = how the app works for you (address & district,
// audio, Reset). No DOM harness in this app: the split is pinned by source.
const source = (p: string) => {
  const file = join(process.cwd(), p);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
};
const settings = source('src/app/n400ready/(app)/settings/page.tsx');
const profile = source('src/app/n400ready/(app)/profile/page.tsx');

describe('Tài khoản vs Cài đặt (owner decision 2026-10-08)', () => {
  it('Cài đặt holds the address editor, audio and Reset', () => {
    expect(settings).toContain('<EditAddressModal');
    expect(settings).toContain('updateSettings({ audioEnabled: !state.settings.audioEnabled })');
    expect(settings).toContain('resetAll();');
  });

  it('saving the address comes back to Cài đặt and reloads it (?updated=1)', () => {
    expect(settings).toContain("get('updated') !== '1'");
    expect(settings).toContain("window.history.replaceState(null, '', '/n400ready/settings');");
    expect(source('src/app/n400ready/(app)/settings/EditAddressModal.tsx')).toContain(
      '<input type="hidden" name="from" value="settings" />',
    );
    expect(source('src/app/n400ready/(app)/setup/actions.ts')).toContain("'/n400ready/settings?updated=1'");
  });

  it('Tài khoản keeps identity and badges only', () => {
    expect(profile).toContain('<BadgeGallery');
    expect(profile).not.toContain('EditAddressModal');
    expect(profile).not.toContain('resetAll');
    expect(profile).not.toContain('audioEnabled');
  });

  it('every Settings entry opens Cài đặt; Tài khoản stays on /profile', () => {
    const avatar = source('src/components/n400/AvatarMenu.tsx');
    expect(avatar).toContain('href={`${base}/settings`}');
    expect(avatar).toContain('href={`${base}/profile`}');
    expect(source('src/components/n400/Sidebar.tsx')).toContain('href={`${base}/settings`}');
  });

  it('the header titles Cài đặt and sends Back to the dashboard', () => {
    const header = source('src/components/n400/Header.tsx');
    expect(header).toContain('settings: { title: dict.header.settings },');
    expect(header).toContain("  settings: '',");
  });
});
