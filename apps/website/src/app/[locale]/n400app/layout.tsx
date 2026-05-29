import type { ReactNode } from 'react';
import { Sidebar } from '@/components/n400/Sidebar';
import { Header } from '@/components/n400/Header';
import { RegisterSW } from '@/components/n400/RegisterSW';

export default function N400AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-gray-900">
      <RegisterSW />
      <Sidebar />
      <div className="ml-64 flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="relative z-0 flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
