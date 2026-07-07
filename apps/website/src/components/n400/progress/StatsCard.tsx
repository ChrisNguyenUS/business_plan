import { Card, ProgressBar } from '@/components/n400/ui';

interface StatsCardProps {
  sectionName: string;
  icon: string;
  knownCount: number;
  totalCount: number;
  attemptedCount?: number;
}

export function StatsCard({ sectionName, icon, knownCount, totalCount, attemptedCount }: StatsCardProps) {
  const percentKnown = totalCount === 0 ? 0 : Math.round((knownCount / totalCount) * 100);

  return (
    <Card className="!p-6">
      <div className="flex items-center mb-4">
        <div className="text-3xl mr-3">{icon}</div>
        <h3 className="text-lg font-bold text-teal-900">{sectionName}</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Thuộc</span>
          <span className="font-semibold text-teal-700">
            {knownCount}/{totalCount} ({percentKnown}%)
          </span>
        </div>

        <ProgressBar progress={percentKnown} />

        {attemptedCount !== undefined ? (
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-600">Đã làm</span>
            <span className="font-semibold text-gray-700">
              {attemptedCount}/{totalCount}
            </span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
