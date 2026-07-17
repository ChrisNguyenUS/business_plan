import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('N400 Ready public entry points and branding', () => {
  test('marketing nav exposes N400 Ready to guests', () => {
    const navbar = source('src/components/layout/Navbar.tsx');

    expect(navbar).toContain('N400 Ready');
    expect(navbar).toContain('href: "/n400ready"');
  });

  test('homepage hero has a N400 Ready App CTA', () => {
    const hero = source('src/components/home/HeroSection.tsx');

    expect(hero).toContain('N400 Ready App');
    expect(hero).toContain('href="/n400ready"');
  });

  test('N400 app shell uses N400 Ready branding', () => {
    const sidebar = source('src/components/n400/Sidebar.tsx');

    expect(sidebar).toContain('N400 Ready');
    expect(sidebar).not.toContain('Gamify N400');
  });
});
