import { ChevronDown } from 'lucide-react';
import type { FaqItem } from '@/lib/n400/public/copy';

// Native <details>: the whole summary row toggles, works with keyboard and without JS.
export function FaqList({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <section>
      <h2 className="text-2xl lg:text-3xl font-bold text-charcoal mb-6">{title}</h2>
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        {items.map((f) => (
          <details key={f.q} className="group rounded-xl border border-border bg-white open:border-primary/30 open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-semibold text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 group-open:text-primary" aria-hidden="true" />
            </summary>
            <p className="px-5 pb-4 text-muted-foreground leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
