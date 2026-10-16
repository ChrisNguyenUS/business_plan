export function ModuleList({ title, modules }: { title: string; modules: { title: string; body: string }[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-charcoal mb-4">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) => (
          <li key={m.title} className="rounded-xl border border-border p-4">
            <h3 className="font-semibold text-charcoal">{m.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
