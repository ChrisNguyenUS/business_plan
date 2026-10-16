export function Disclosure({ text }: { text: string }) {
  return (
    <p className="mt-10 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed">{text}</p>
  );
}
