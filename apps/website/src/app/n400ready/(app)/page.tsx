import { Suspense } from 'react';
import DashboardClient from './dashboard-client';
import { getN400Dict, getN400Lang } from '@/lib/n400/i18n/server';

export default async function DashboardPage() {
  const dict = getN400Dict(await getN400Lang());
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">{dict.common.loading}</div>}>
      <DashboardClient />
    </Suspense>
  );
}
