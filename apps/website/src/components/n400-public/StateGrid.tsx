import Link from 'next/link';

export function StateGrid({ locale, title, body, states }: { locale: string; title: string; body: string; states: { slug: string; name: string }[] }) {
  return (
    <section id="states" className="mt-12">
      <h2 className="text-2xl font-bold text-charcoal mb-2">{title}</h2>
      <p className="text-muted-foreground mb-4">{body}</p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        {states.map((s) => (
          <li key={s.slug}>
            <Link href={`/${locale}/n400ready/states/${s.slug}`} className="hover:text-primary">{s.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
