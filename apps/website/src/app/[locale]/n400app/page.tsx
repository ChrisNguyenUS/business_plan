'use client';

import Image from 'next/image';
import { CheckCircle, Star, Trophy, Users } from 'lucide-react';
import { Card, ProgressBar, SKILL_DATA } from '@/components/n400/ui';

export default function DashboardPage() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex gap-6">
        <div className="w-2/3 space-y-6">
          <Card className="p-6">
            <h3 className="mb-3 text-sm font-medium text-slate-500">Tiến độ tổng quát</h3>
            <div className="mb-4 flex items-baseline gap-3">
              <span className="text-5xl font-semibold tracking-tight text-slate-900">72%</span>
              <span className="text-sm text-slate-500">92 / 128 câu hỏi</span>
            </div>
            <ProgressBar progress={72} heightClass="h-2.5" />
          </Card>

          <div className="flex gap-6">
            <Card className="relative w-1/3 min-h-[200px] overflow-hidden p-6">
              <div className="relative z-10 flex h-full flex-col">
                <h3 className="text-sm font-medium text-slate-500">Chuỗi học tập</h3>
                <div className="mt-3 text-3xl font-semibold text-slate-900">7 ngày</div>
                <p className="mt-2 text-sm text-slate-600">Cố lên! 🔥</p>
              </div>
              <div className="pointer-events-none absolute -bottom-2 right-0 z-0 h-[170px] w-[120px] opacity-80">
                <Image
                  src="/images/n400/illu-flag-holding-transparent.png"
                  alt=""
                  fill
                  className="object-contain object-right-bottom"
                  sizes="120px"
                />
              </div>
            </Card>

            <Card className="w-2/3 p-6">
              <h3 className="mb-6 text-sm font-medium text-slate-500">Hiệu suất theo kỹ năng</h3>
              <div className="flex h-32 items-end justify-around">
                {SKILL_DATA.map((skill) => (
                  <div key={skill.name} className="flex flex-col items-center gap-3">
                    <div className="relative flex h-24 w-7 items-end overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`w-full rounded-full ${skill.color}`}
                        style={{ height: `${skill.value}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-slate-700">{skill.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{skill.value}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-4 gap-6">
              <div className="flex items-center gap-4">
                <div className="shrink-0 text-teal-600">
                  <Users size={36} fill="currentColor" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-semibold leading-tight text-slate-900">50.000+</div>
                  <div className="mt-1 text-xs text-slate-500">Người dùng tin tưởng</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <CheckCircle size={22} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-semibold leading-tight text-slate-900">90%</div>
                  <div className="mt-1 text-xs text-slate-500">Tăng tự tin sau luyện tập</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="shrink-0 text-amber-500">
                  <Trophy size={36} fill="currentColor" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-semibold leading-tight text-slate-900">92%</div>
                  <div className="mt-1 text-xs text-slate-500">Cải thiện điểm số</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="shrink-0 text-amber-400">
                  <Star size={36} fill="currentColor" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-semibold leading-tight text-slate-900">4.9/5</div>
                  <div className="mt-1 text-xs text-slate-500">Đánh giá từ người dùng</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="w-1/3">
          <div className="relative h-full min-h-[600px]">
            <Image
              src="/images/n400/illu-flag-holding-transparent.png"
              alt="Statue of Liberty with American flag and city skyline"
              fill
              className="object-contain object-bottom"
              sizes="560px"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
