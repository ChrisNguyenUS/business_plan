import { describe, expect, it } from 'vitest';
import { DEFAULT_N400_LANG, N400_LANGUAGES, isN400Lang } from './config';
import { vi as viDict } from './vi';
import { en as enDict } from './en';

type Tree = { [k: string]: string | Tree };

function keyPaths(obj: Tree, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keyPaths(v as Tree, `${prefix}${k}.`)
  );
}

describe('n400 i18n config', () => {
  it('vi là mặc định và nằm trong danh sách', () => {
    expect(DEFAULT_N400_LANG).toBe('vi');
    expect(N400_LANGUAGES).toContain('vi');
    expect(N400_LANGUAGES).toContain('en');
  });

  it('isN400Lang chỉ nhận giá trị hợp lệ', () => {
    expect(isN400Lang('vi')).toBe(true);
    expect(isN400Lang('en')).toBe(true);
    expect(isN400Lang('es')).toBe(false);
    expect(isN400Lang('')).toBe(false);
    expect(isN400Lang(undefined)).toBe(false);
  });
});

describe('n400 dictionaries', () => {
  it('en có đúng tập key của vi (không thiếu, không thừa)', () => {
    expect(keyPaths(enDict as unknown as Tree).sort()).toEqual(
      keyPaths(viDict as unknown as Tree).sort()
    );
  });

  it('không có giá trị rỗng', () => {
    for (const dict of [viDict, enDict]) {
      for (const path of keyPaths(dict as unknown as Tree)) {
        const val = path.split('.').reduce<unknown>((o, k) => (o as Tree)[k], dict);
        expect(val, path).toBeTruthy();
      }
    }
  });
});
