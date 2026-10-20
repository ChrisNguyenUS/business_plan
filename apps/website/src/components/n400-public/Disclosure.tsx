import { Info } from 'lucide-react';

export function Disclosure({ text }: { text: string }) {
  return (
    <p role="note" className="mt-10 flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}
