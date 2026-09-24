import { ALL_EVENT_TYPES } from '@mannaos/n400-growth'
import { describeEvent } from '@/lib/n400/timeline'

describe('describeEvent', () => {
  it('renders something for every known event type', () => {
    // This test documents that each known type produces a renderable entry.
    // The compiler — not this test — ensures new event types are not forgotten:
    // if GrowthEventType gains a member but timeline.ts has no case for it,
    // the `const unhandled: never = type` assignment will fail TypeScript checking.
    for (const type of ALL_EVENT_TYPES) {
      const entry = describeEvent(type, {})
      expect(entry.title.length).toBeGreaterThan(0)
      expect(entry.icon.length).toBeGreaterThan(0)
    }
  })

  it('reads the city and state out of an address_entered payload', () => {
    const entry = describeEvent('address_entered', { city: 'Austin', state: 'TX' })
    expect(entry.detail).toBe('Austin, TX')
  })

  it('falls back to whichever half of the address exists', () => {
    expect(describeEvent('address_entered', { state: 'TX' }).detail).toBe('TX')
    expect(describeEvent('address_entered', { city: 'Austin' }).detail).toBe('Austin')
    expect(describeEvent('address_entered', {}).detail).toBeNull()
  })

  it('reports a mock score with its pass state', () => {
    const entry = describeEvent('mock_completed', {
      attempt_id: 'a', score: 18, total: 20, passed: true,
    })
    expect(entry.title).toBe('Mock test completed')
    expect(entry.detail).toBe('18/20 · passed')
  })

  it('reports a failed mock as failed', () => {
    const entry = describeEvent('mock_completed', {
      attempt_id: 'a', score: 9, total: 20, passed: false,
    })
    expect(entry.detail).toBe('9/20 · failed')
  })

  it('shows the answer on prompt_answered', () => {
    const entry = describeEvent('prompt_answered', {
      question_key: 'n400_filed', answer: 'not_yet', variant: 'a', surface: 'results',
    })
    expect(entry.title).toBe('Answered: n400_filed')
    expect(entry.detail).toBe('not_yet · results')
  })

  it('names the CTA on cta_clicked', () => {
    const entry = describeEvent('cta_clicked', {
      cta_id: 's10_document_prep', variant: 'a', surface: 'dashboard', group: 'consultation',
    })
    expect(entry.title).toBe('CTA clicked: s10_document_prep')
    expect(entry.detail).toBe('dashboard')
  })

  it('degrades to the raw type for an event type it has never seen', () => {
    const entry = describeEvent('something_new' as never, {})
    expect(entry.title).toBe('something_new')
    expect(entry.icon).toBe('circle')
  })

  it('does not throw when a payload is missing the fields it expects', () => {
    expect(() => describeEvent('cta_clicked', {})).not.toThrow()
    expect(describeEvent('cta_clicked', {}).title).toBe('CTA clicked: unknown')
  })
})
