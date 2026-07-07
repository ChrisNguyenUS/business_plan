'use client';

import { useMemo } from 'react';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { deriveSectionSeen } from '@/lib/n400/section-progress';
import { StatsCard } from '@/components/n400/progress/StatsCard';
import { BadgeGallery } from '@/components/n400/BadgeGallery';

const WHATMEAN_TOTAL = 62;
const YESNO_TOTAL = 37;
const WRITING_TOTAL = 45;
const CIVICS_TOTAL = 128;

export default function ProgressPage() {
  const { state, hydrated, stats } = useN400UserState();
  const badges = useN400Badges();

  const seen = useMemo(() => deriveSectionSeen(state.sectionAttempts), [state.sectionAttempts]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-[1100px] mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-teal-900">Huy hiệu &amp; Thành tích</h1>
        <p className="text-sm text-gray-500 mt-1">Theo dõi mức độ thuộc bài ở cả 4 phần và huy hiệu đã đạt được.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <StatsCard
          sectionName="Civics"
          icon="📚"
          knownCount={stats.mastered}
          totalCount={CIVICS_TOTAL}
          attemptedCount={stats.distinctAnswered}
        />
        <StatsCard
          sectionName="What Mean"
          icon="📖"
          knownCount={state.sectionKnown.whatmean.length}
          totalCount={WHATMEAN_TOTAL}
          attemptedCount={seen.whatmean.size}
        />
        <StatsCard
          sectionName="Yes/No"
          icon="🎤"
          knownCount={state.sectionKnown.yesno.length}
          totalCount={YESNO_TOTAL}
          attemptedCount={seen.yesno.size}
        />
        <StatsCard
          sectionName="Viết"
          icon="✍️"
          knownCount={state.sectionKnown.writing.length}
          totalCount={WRITING_TOTAL}
          attemptedCount={seen.writing.size}
        />
      </div>

      {badges.hydrated ? <BadgeGallery catalog={badges.catalog} earned={badges.earned} /> : null}
    </div>
  );
}
