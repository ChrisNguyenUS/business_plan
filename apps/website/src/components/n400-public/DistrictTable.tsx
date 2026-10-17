import type { DistrictRow } from '@/lib/n400/public/state-page';

export function DistrictTable({ rows, districtHeader, repHeader }: { rows: DistrictRow[]; districtHeader: string; repHeader: string }) {
  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="py-1 pr-4 font-medium">{districtHeader}</th>
          <th className="py-1 font-medium">{repHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-border">
            <td className="py-1 pr-4">{r.label}</td>
            <td className="py-1 text-charcoal">{r.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
