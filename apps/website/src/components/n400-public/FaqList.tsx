import type { FaqItem } from '@/lib/n400/public/copy';

export function FaqList({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-charcoal mb-4">{title}</h2>
      <div className="space-y-3">
        {items.map((f) => (
          <details key={f.q} className="rounded-xl border border-border p-4">
            <summary className="font-semibold text-charcoal cursor-pointer">{f.q}</summary>
            <p className="mt-2 text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
