import { describe, expect, it } from 'vitest';
import { civicsMockAnswerKey, civicsMockSlides, type CivicsMockKind } from './civics-mock-slides';
import type { StateCode } from './state-data';

// Golden answer keys captured on 2026-10-08 from the pre-refactor builders
// (civics/page.tsx startNew for 'civics', buildCivicsPhase for 'full'):
// `${qid}${correct option id}` per slide, in order. Same seed → same questions
// and the same correct option as before (RLS hardening spec §2.1).
const GOLDEN: { kind: CivicsMockKind; seed: string; state: StateCode; district: number | null; key: string[] }[] = [
  {
    kind: 'civics', seed: 'golden-1', state: 'TX', district: null,
    key: ['55D', '42B', '57B', '53B', '47A', '49B', '3D', '59D', '87B', '56D', '128A', '111D', '46C', '78D', '100C', '17B', '83B', '8A', '15A', '16C'],
  },
  {
    kind: 'civics', seed: 'golden-2', state: 'CA', district: 12,
    key: ['73A', '76B', '33B', '90A', '69A', '86A', '111B', '7B', '71D', '46A', '105A', '39C', '16A', '54D', '70D', '37D', '22C', '77C', '59C', '80B'],
  },
  {
    kind: 'civics', seed: 'golden-q29-2', state: 'TX', district: null,
    key: ['114C', '11D', '25A', '59D', '78C', '76C', '61D', '45B', '49C', '69A', '115D', '44B', '9C', '81B', '80C', '43C', '22B', '38D', '88D'],
  },
  {
    kind: 'full', seed: 'full-101', state: 'TX', district: null,
    key: ['68D', '34A', '57A', '121B', '26B', '86C', '23C', '89D', '113B', '93C', '29D', '90D', '65C', '75C', '95C', '94A', '55D', '16C', '27A', '74C'],
  },
  {
    kind: 'full', seed: 'full-202', state: 'CA', district: 12,
    key: ['128D', '60B', '63D', '109D', '51C', '103B', '87B', '12D', '90C', '17B', '108B', '9C', '45B', '126C', '79B', '27C', '48B', '36A', '65C', '95C'],
  },
  {
    kind: 'full', seed: 'full-1', state: 'TX', district: null,
    key: ['86C', '36C', '56C', '65C', '29C', '99C', '57B', '28B', '7D', '3D', '69B', '2B', '67D', '80D', '100B', '87C', '116C', '42B', '6D', '122B'],
  },
];

function flatKey(kind: CivicsMockKind, seed: string, state: StateCode, district: number | null): string[] {
  return civicsMockAnswerKey(civicsMockSlides(kind, seed, state, district)).map((k) => `${k.qid}${k.correct}`);
}

describe('civicsMockSlides + civicsMockAnswerKey (RLS hardening spec §2.1)', () => {
  it.each(GOLDEN)('$kind $seed $state/$district keeps the pre-refactor answer key', ({ kind, seed, state, district, key }) => {
    expect(flatKey(kind, seed, state, district)).toEqual(key);
  });

  it("'civics' drops Q29 without a district; 'full' keeps it", () => {
    expect(flatKey('civics', 'golden-q29-2', 'TX', null).some((k) => k.startsWith('29'))).toBe(false);
    expect(flatKey('full', 'full-1', 'TX', null)).toContain('29C');
  });

  it('builds four options with exactly one correct even for a state code outside the list', () => {
    for (const kind of ['civics', 'full'] as const) {
      for (const s of civicsMockSlides(kind, 'odd-state', 'ZZ' as StateCode, null)) {
        expect(s.options).toHaveLength(4);
        expect(s.options.filter((o) => o.isCorrect)).toHaveLength(1);
      }
    }
  });

  it('the answer key holds only question ids and option ids', () => {
    const [first] = civicsMockAnswerKey(civicsMockSlides('full', 'full-101', 'TX', null));
    expect(Object.keys(first).sort()).toEqual(['correct', 'qid']);
  });
});
