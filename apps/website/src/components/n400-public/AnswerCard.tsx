import type { PublicAnswer } from '@/lib/n400/public/state-page';

export function AnswerCard({ label, a }: { label: string; a: PublicAnswer }) {
  return (
    <div className="rounded-xl border border-border p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {label}{a.star ? ' ★' : ''}
      </p>
      <h2 className="mt-1 text-lg font-bold text-charcoal">{a.question}</h2>
      <p className="text-sm text-muted-foreground italic">{a.questionAlt}</p>
      {a.answers.length > 0 && (
        <ul className="mt-3 space-y-1">
          {a.answers.map((t) => (
            <li key={t} className="font-semibold text-charcoal">{t}</li>
          ))}
        </ul>
      )}
      {a.note && <p className="mt-2 text-sm text-muted-foreground">{a.note}</p>}
    </div>
  );
}
