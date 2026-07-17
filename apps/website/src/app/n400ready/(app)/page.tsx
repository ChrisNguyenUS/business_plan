import { Suspense } from 'react';
import DashboardClient from './dashboard-client';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Đang tải…</div>}>
      <DashboardClient />
    </Suspense>
  );
}
