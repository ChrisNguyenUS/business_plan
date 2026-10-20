'use client';

import { useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, MapPin, Search } from 'lucide-react';

export interface PickerAnswer { label: string; question: string; answers: string[]; note: string | null }
/** `alt` is the name in the other language, so either spelling finds the entry. */
export interface PickerState { slug: string; name: string; alt: string; answers: PickerAnswer[] }

// Plain strings (a server component cannot pass functions to a client component):
// empty uses {q}, showAll uses {n}, previewLink uses {name}.
interface Labels {
  search: string;
  empty: string;
  showAll: string;
  showLess: string;
  previewLink: string;
}

// How many states show before "Show all" (search always looks at every entry).
const COLLAPSED = 16;

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
}

/**
 * Searchable list of every state and territory. Each chip is a real link to the
 * state page (crawlable, works without JS); a plain click selects it in place and
 * shows its four location-based answers.
 */
export function StatePicker({
  locale,
  states,
  defaultSlug,
  labels,
}: {
  locale: string;
  states: PickerState[];
  defaultSlug: string;
  labels: Labels;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(defaultSlug);
  const [expanded, setExpanded] = useState(false);
  const inputId = useId();
  const resultsId = useId();
  const previewRef = useRef<HTMLDivElement>(null);

  const q = fold(query);
  const matches = useMemo(() => (q ? states.filter((s) => fold(s.name).includes(q) || fold(s.alt).includes(q)) : states), [q, states]);
  const current = states.find((s) => s.slug === selected) ?? states[0];
  const href = (slug: string) => `/${locale}/n400ready/states/${slug}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div>
        <label htmlFor={inputId} className="sr-only">{labels.search}</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search}
            aria-controls={resultsId}
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-[15px] text-charcoal placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <ul id={resultsId} className="mt-4 flex flex-wrap gap-2">
          {matches.map((s, i) => {
            const isSel = s.slug === current.slug;
            const hiddenWhenCollapsed = !q && !expanded && i >= COLLAPSED;
            return (
              <li key={s.slug} className={hiddenWhenCollapsed ? 'hidden' : undefined}>
                <a
                  href={href(s.slug)}
                  aria-current={isSel ? 'true' : undefined}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    setSelected(s.slug);
                    // Stacked layout: the answers sit below the list, so bring them into view.
                    if (window.matchMedia('(max-width: 1023px)').matches) {
                      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isSel
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-white text-charcoal hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  {s.name}
                  {isSel && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </a>
              </li>
            );
          })}
        </ul>

        {matches.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-white px-4 py-3 text-sm text-muted-foreground">
            {labels.empty.replace('{q}', query.trim())}
          </p>
        )}

        {!q && states.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={resultsId}
            className="mt-2 min-h-10 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {expanded ? labels.showLess : labels.showAll.replace('{n}', String(states.length))}
          </button>
        )}
      </div>

      <div ref={previewRef} className="scroll-mt-24 rounded-2xl border border-border bg-white p-5 shadow-sm" aria-live="polite">
        <p className="flex items-center gap-2 text-lg font-bold text-charcoal">
          <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
          {current.name}
        </p>
        <dl className="mt-4 space-y-3">
          {current.answers.map((a) => (
            <div key={a.label} className="rounded-xl bg-[#F6F9F8] px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-primary">{a.label}</dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">{a.question}</dd>
              {a.answers.length > 0 && (
                <dd className="mt-1 font-semibold text-charcoal">{a.answers.join(' · ')}</dd>
              )}
              {a.note && <dd className="mt-1 text-sm text-charcoal">{a.note}</dd>}
            </div>
          ))}
        </dl>
        <Link
          href={href(current.slug)}
          className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {labels.previewLink.replace('{name}', current.name)}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
