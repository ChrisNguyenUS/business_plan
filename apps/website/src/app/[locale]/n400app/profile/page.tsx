'use client';

import Image from 'next/image';
import {
  CheckCircle,
  Settings,
  User,
  Clock,
  MapPin,
  BarChart2,
  Award,
  Shield,
  Target,
  Flame,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';

const SKILL_ROWS = [
  { label: 'Ngữ pháp / Grammar', value: 65, color: 'bg-orange-500' },
  { label: 'Nghe hiểu / Listening', value: 75, color: 'bg-purple-600' },
  { label: 'Từ vựng / Vocabulary', value: 60, color: 'bg-yellow-500' },
  { label: 'Viết / Writing', value: 50, color: 'bg-blue-600' },
  { label: 'Đọc hiểu / Reading', value: 70, color: 'bg-teal-600' },
  { label: 'Nói / Speaking', value: 55, color: 'bg-teal-700' },
];

export default function ProfilePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className="flex items-center gap-8 p-6">
        <div className="w-32 h-32 rounded-full bg-teal-50 border-4 border-teal-100 relative shadow-inner overflow-hidden shrink-0">
          <Image
            src="/images/n400/illu-wink.png"
            alt="Avatar"
            fill
            className="object-cover"
            sizes="128px"
            priority
          />
          <button
            type="button"
            className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 shadow-sm hover:text-teal-600"
            aria-label="Edit avatar"
          >
            <Settings size={14} />
          </button>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Liberty Learner</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold mb-4">
            <CheckCircle size={14} /> Ứng viên N400
          </div>
          <p className="text-sm text-gray-600 max-w-md mb-4">
            Mục tiêu của tôi là chinh phục kỳ thi N400 để hiện thực hóa giấc mơ trở thành công dân Mỹ.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User size={16} /> liberty.learner@email.com
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} /> Tham gia: 15/02/2024
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} /> Vietnam
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <Stat label="Cấp độ" val="12" icon="🥇" />
          <Stat label="Điểm XP" val="2,450" icon="⭐" />
          <Stat label="Huy hiệu" val="18" icon="🏅" />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-6">Tiến độ tổng quan</h3>
          <div className="flex items-center gap-6 mb-6">
            <div className="w-28 h-28 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="transparent"
                  stroke="#0d9488"
                  strokeWidth="4"
                  strokeDasharray="72 28"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">72%</span>
                <span className="text-[10px] text-gray-500">92 / 128 câu hỏi</span>
              </div>
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Đúng</span>
                  <span className="font-bold text-gray-800">66 câu (72%)</span>
                </div>
                <ProgressBar progress={72} colorClass="bg-teal-600" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Sai</span>
                  <span className="font-bold text-gray-800">18 câu (20%)</span>
                </div>
                <ProgressBar progress={20} colorClass="bg-orange-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Chưa làm</span>
                  <span className="font-bold text-gray-800">8 câu (8%)</span>
                </div>
                <ProgressBar progress={8} colorClass="bg-gray-300" />
              </div>
            </div>
          </div>
          <button
            type="button"
            className="w-full py-2.5 bg-teal-50 text-teal-600 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-teal-100"
          >
            <BarChart2 size={16} /> Xem thống kê chi tiết
          </button>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-6">Chuỗi học tập</h3>
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Flame size={40} className="text-orange-500" />
              <span className="text-4xl font-bold text-gray-800">7 ngày</span>
            </div>
            <div className="text-sm text-gray-500">Cao nhất: 21 ngày</div>
          </div>
          <div className="flex justify-between mb-4">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
              <div key={d} className="flex flex-col items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">{d}</span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i < 6 ? 'bg-teal-600 text-white' : 'bg-gray-100 text-transparent'
                  }`}
                >
                  <CheckCircle size={16} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-500 mt-6">
            Hãy duy trì chuỗi học tập để đạt kết quả tốt nhất!
          </p>
        </Card>

        <Card className="p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">Thành tích</h3>
            <button type="button" className="text-teal-600 text-xs font-bold">
              Xem tất cả
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-6">
            <Badge icon={<Shield size={22} />} label="Người bắt đầu" tone="blue" />
            <Badge icon={<Award size={22} />} label="Kiên trì" tone="orange" />
            <Badge icon={<Target size={22} />} label="Tập trung" tone="teal" />
            <Badge icon={<Shield size={22} />} label="Chinh phục" tone="red" />
          </div>
          <div className="mt-auto bg-teal-50 rounded-xl p-4 flex gap-4 items-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm shrink-0">
              <Award size={20} />
            </div>
            <div>
              <div className="font-bold text-gray-800 text-sm mb-0.5">Bạn đang làm rất tốt!</div>
              <div className="text-xs text-gray-600">
                Hãy tiếp tục phát huy và chinh phục mục tiêu N400 nhé!
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800">Kỹ năng</h3>
          <div className="text-xs text-gray-400">Cập nhật gần nhất: 01/05/2024</div>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
          {SKILL_ROWS.map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium text-gray-700">{s.label}</div>
              <div className="flex-1">
                <ProgressBar progress={s.value} colorClass={s.color} />
              </div>
              <div className="w-10 text-right font-bold text-gray-700">{s.value}%</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, val, icon }: { label: string; val: string; icon: string }) {
  return (
    <div className="text-center bg-gray-50 p-4 rounded-2xl w-24">
      <div className="text-xs text-gray-500 font-medium mb-1 flex items-center justify-center gap-1">
        {label} <span>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{val}</div>
    </div>
  );
}

function Badge({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'blue' | 'orange' | 'teal' | 'red';
}) {
  const styles = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-500',
    teal: 'bg-teal-50 border-teal-200 text-teal-600',
    red: 'bg-red-50 border-red-200 text-red-500',
  } as const;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-14 h-14 border-2 rounded-full flex items-center justify-center ${styles[tone]}`}
      >
        {icon}
      </div>
      <span className="text-[11px] font-medium text-gray-700 text-center">{label}</span>
    </div>
  );
}
