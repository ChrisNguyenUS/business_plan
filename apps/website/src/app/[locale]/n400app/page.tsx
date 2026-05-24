'use client';

import Image from 'next/image';
import { CheckCircle, Star, Trophy, Users } from 'lucide-react';
import { Card, ProgressBar, SKILL_DATA } from '@/components/n400/ui';

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex gap-6">
        <div className="w-2/3 space-y-6">
          <Card>
            <h3 className="text-gray-500 font-medium mb-1">Tiến độ tổng quát</h3>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-bold text-gray-800">72%</span>
              <span className="text-sm text-gray-500 mb-1">92 / 128 câu hỏi</span>
            </div>
            <ProgressBar progress={72} heightClass="h-3" />
          </Card>

          <div className="flex gap-6">
            <Card className="w-1/3 relative overflow-hidden min-h-[230px] p-0">
              <div className="absolute inset-y-0 left-0 z-10 w-[38%] bg-white" />
              <div className="absolute inset-y-0 left-[34%] z-10 w-24 bg-gradient-to-r from-white via-white/95 to-transparent" />
              <div className="relative z-20 p-5">
                <h3 className="mb-6 text-base font-semibold text-slate-950">Chuỗi học tập</h3>
                <div className="mb-5 text-4xl font-bold leading-none text-slate-950">7 ngày</div>
                <p className="text-lg font-medium text-slate-950">Cố lên! 🔥</p>
              </div>
              <div className="pointer-events-none absolute -bottom-1 -right-4 z-0 h-[235px] w-[232px]">
                <Image
                  src="/images/n400/illu-flag-holding.png"
                  alt=""
                  fill
                  className="object-contain object-right-bottom"
                  sizes="232px"
                />
              </div>
            </Card>

            <Card className="w-2/3">
              <h3 className="text-gray-500 font-medium mb-4">Hiệu suất theo kỹ năng</h3>
              <div className="flex justify-between items-end h-32 px-4">
                {SKILL_DATA.map((skill) => (
                  <div key={skill.name} className="flex flex-col items-center gap-2 w-1/4">
                    <div className="w-10 bg-gray-100 rounded-t-md h-24 relative flex items-end justify-center">
                      <div
                        className={`w-full rounded-t-md ${skill.color}`}
                        style={{ height: `${skill.value}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-700">{skill.name}</div>
                      <div className={`text-xs font-bold ${skill.text}`}>{skill.value}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center text-teal-600">
                <Users size={36} fill="currentColor" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-bold text-gray-800 text-lg">50.000+</div>
                <div className="text-xs text-gray-500">Người dùng tin tưởng</div>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="font-bold text-gray-800 text-lg">90%</div>
                <div className="text-xs text-gray-500">Tăng tự tin sau luyện tập</div>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center text-amber-500">
                <Trophy size={36} fill="currentColor" strokeWidth={1.75} />
              </div>
              <div>
                <div className="font-bold text-gray-800 text-lg">92%</div>
                <div className="text-xs text-gray-500">Cải thiện điểm số</div>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center text-amber-400">
                <Star size={38} fill="currentColor" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-bold text-gray-800 text-lg">4.9/5</div>
                <div className="text-xs text-gray-500">Đánh giá từ người dùng</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="w-1/3">
          <div className="relative flex min-h-[600px] items-end justify-center overflow-visible bg-white">
            <Image
              src="/images/n400/illu-flag-holding.png"
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
