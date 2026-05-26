'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  CheckCircle,
  User,
  Clock,
  MapPin,
  BarChart2,
  Award,
  Shield,
  Target,
  Flame,
  RotateCcw,
  Volume2,
  VolumeX,
  Pencil,
  Building2,
} from 'lucide-react';
import { Card, ProgressBar } from '@/components/n400/ui';
import { useN400UserState } from '@/lib/n400/user-state';
import { STATES } from '@/lib/n400/state-data';
import { N400_CATEGORY_LABELS, N400_QUESTIONS, type N400CategoryKey } from '@/lib/n400/questions-data';

const SKILL_TONES: Record<N400CategoryKey, string> = {
  principles: 'bg-teal-600',
  system: 'bg-orange-500',
  rights: 'bg-yellow-500',
  history: 'bg-purple-600',
  symbols: 'bg-blue-600',
};

export default function ProfilePage() {
  const { state, hydrated, stats, updateSettings, resetAll } = useN400UserState();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [confirmReset, setConfirmReset] = useState(false);
  const categoryRows = useMemo(() => {
    const lastSeen = new Map<number, boolean>();
    for (const a of state.attempts) lastSeen.set(a.questionId, a.wasCorrect);
    return (Object.keys(N400_CATEGORY_LABELS) as N400CategoryKey[]).map((key) => {
      const total = N400_QUESTIONS.filter((q) => q.category === key).length;
      const mastered = N400_QUESTIONS.filter(
        (q) => q.category === key && lastSeen.get(q.id) === true
      ).length;
      const value = total === 0 ? 0 : Math.round((mastered / total) * 100);
      return {
        key,
        label: `${N400_CATEGORY_LABELS[key].vi} / ${N400_CATEGORY_LABELS[key].en}`,
        value,
        color: SKILL_TONES[key],
      };
    });
  }, [state.attempts]);

  const weekActivity = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    const days: { label: string; active: boolean }[] = [];
    const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const buckets = new Set<string>();
    for (const a of state.attempts) {
      const d = new Date(a.at);
      buckets.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.push({ label: labels[d.getDay()], active: buckets.has(key) });
    }
    return days;
  }, [state.attempts]);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const stateInfo = STATES.find(
    (s) => s.code === (state.address.stateCode ?? state.settings.stateCode)
  );
  const passedMocks = state.mockResults.filter((m) => m.passed).length;
  const totalMocks = state.mockResults.length;

  const onResetConfirm = () => {
    resetAll();
    setConfirmReset(false);
  };

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
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Liberty Learner</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold mb-4">
            <CheckCircle size={14} /> Ứng viên N400
          </div>
          <p className="text-sm text-gray-600 max-w-md mb-4">
            Mục tiêu của tôi là chinh phục kỳ thi N400 để hiện thực hóa giấc mơ trở thành công dân Mỹ.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
            <div className="flex items-center gap-2">
              <User size={16} /> liberty.learner@email.com
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} /> Ghi nhận: cục bộ trên thiết bị
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} /> {stateInfo?.nameEn ?? '—'}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <Stat label="Đã làm" val={stats.totalAttempts.toString()} icon="📚" />
          <Stat label="Chính xác" val={`${stats.accuracy}%`} icon="🎯" />
          <Stat label="Đã thuộc" val={`${stats.mastered}`} icon="⭐" />
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
                  strokeDasharray={`${stats.coverage} ${100 - stats.coverage}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">{stats.coverage}%</span>
                <span className="text-[10px] text-gray-500">{stats.distinctAnswered} / 128</span>
              </div>
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Đúng (lần gần nhất)</span>
                  <span className="font-bold text-gray-800">{stats.mastered}</span>
                </div>
                <ProgressBar progress={(stats.mastered / 128) * 100} colorClass="bg-teal-600" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Chính xác toàn bộ</span>
                  <span className="font-bold text-gray-800">{stats.accuracy}%</span>
                </div>
                <ProgressBar progress={stats.accuracy} colorClass="bg-orange-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Đã đánh dấu</span>
                  <span className="font-bold text-gray-800">{state.bookmarks.length}</span>
                </div>
                <ProgressBar
                  progress={Math.min(100, (state.bookmarks.length / 128) * 100)}
                  colorClass="bg-yellow-500"
                />
              </div>
            </div>
          </div>
          <Link
            href={`/${locale}/n400app/statistic`}
            className="w-full py-2.5 bg-teal-50 text-teal-600 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-teal-100"
          >
            <BarChart2 size={16} /> Xem thống kê chi tiết
          </Link>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-6">Chuỗi học tập</h3>
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Flame size={40} className="text-orange-500" />
              <span className="text-4xl font-bold text-gray-800">{state.streak.current} ngày</span>
            </div>
            <div className="text-sm text-gray-500">Cao nhất: {state.streak.longest} ngày</div>
          </div>
          <div className="flex justify-between mb-4">
            {weekActivity.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">{d.label}</span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    d.active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-transparent'
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
            <span className="text-xs text-gray-400">Mở khóa khi đạt cột mốc</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-6">
            <Badge
              icon={<Shield size={22} />}
              label="Người bắt đầu"
              tone="blue"
              unlocked={stats.totalAttempts > 0}
            />
            <Badge
              icon={<Award size={22} />}
              label="Kiên trì"
              tone="orange"
              unlocked={state.streak.current >= 3}
            />
            <Badge
              icon={<Target size={22} />}
              label="Tập trung"
              tone="teal"
              unlocked={stats.distinctAnswered >= 50}
            />
            <Badge
              icon={<Shield size={22} />}
              label="Chinh phục"
              tone="red"
              unlocked={passedMocks >= 1}
            />
          </div>
          <div className="mt-auto bg-teal-50 rounded-xl p-4 flex gap-4 items-center">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm shrink-0">
              <Award size={20} />
            </div>
            <div>
              <div className="font-bold text-gray-800 text-sm mb-0.5">
                {passedMocks > 0
                  ? `Đạt ${passedMocks}/${totalMocks} lần thi thử!`
                  : 'Bạn đang làm rất tốt!'}
              </div>
              <div className="text-xs text-gray-600">
                Hãy tiếp tục phát huy và chinh phục mục tiêu N400 nhé!
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800">Tiến độ theo danh mục</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
          {categoryRows.map((s) => (
            <div key={s.key} className="flex items-center gap-4">
              <div className="w-44 text-sm font-medium text-gray-700">{s.label}</div>
              <div className="flex-1">
                <ProgressBar progress={s.value} colorClass={s.color} />
              </div>
              <div className="w-10 text-right font-bold text-gray-700">{s.value}%</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-start mb-4 gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-800">Địa chỉ & Khu vực bầu cử</h3>
            <p className="text-xs text-gray-500 mt-1">
              Address & District — dùng để xác định Hạ nghị sĩ (câu Q20).
            </p>
          </div>
          <Link
            href={{
              pathname: `/${locale}/n400app/setup`,
              query: {
                ...(state.address.city ? { city: state.address.city } : {}),
                ...(state.address.stateCode ? { state: state.address.stateCode } : {}),
                ...(state.address.zipcode ? { zip: state.address.zipcode } : {}),
              },
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 text-sm font-semibold hover:bg-teal-100"
          >
            <Pencil size={14} /> Chỉnh sửa
          </Link>
        </div>

        {state.address.districtNumber === null ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Chưa có địa chỉ. Bấm <span className="font-semibold text-teal-700">Chỉnh sửa</span> để
            cập nhật và xác định khu vực bầu cử của bạn.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AddressField
              icon={<MapPin size={16} />}
              label="Thành phố / City"
              value={state.address.city ?? '—'}
            />
            <AddressField
              icon={<MapPin size={16} />}
              label="Tiểu bang / State"
              value={
                state.address.stateCode
                  ? `${STATES.find((s) => s.code === state.address.stateCode)?.nameEn ?? state.address.stateCode} (${state.address.stateCode})`
                  : '—'
              }
            />
            <AddressField
              icon={<MapPin size={16} />}
              label="Zipcode"
              value={state.address.zipcode ?? '—'}
            />
            <AddressField
              icon={<Building2 size={16} />}
              label="Khu vực bầu cử / District"
              value={
                state.address.districtNumber === 0
                  ? 'At-large (toàn tiểu bang)'
                  : `${state.address.stateCode ?? ''}-${state.address.districtNumber}`
              }
              highlight
            />
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-6">
        <h3 className="font-bold text-gray-800">Cài đặt</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phát âm thanh</label>
          <button
            type="button"
            onClick={() => updateSettings({ audioEnabled: !state.settings.audioEnabled })}
            className={`flex items-center gap-3 px-4 h-11 rounded-xl border ${
              state.settings.audioEnabled
                ? 'bg-teal-50 border-teal-200 text-teal-700'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            {state.settings.audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {state.settings.audioEnabled ? 'Bật' : 'Tắt'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Tắt nếu bạn không muốn nghe MP3 phát âm câu hỏi và đáp án.
          </p>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h4 className="font-semibold text-gray-800 mb-2">Đặt lại tiến độ</h4>
          <p className="text-xs text-gray-500 mb-3">
            Xóa toàn bộ lượt làm bài, đánh dấu, kết quả thi thử và chuỗi học tập trên thiết bị này.
          </p>
          {confirmReset ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onResetConfirm}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600"
              >
                Xác nhận xóa
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm"
              >
                Hủy
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm hover:border-red-200 hover:text-red-500 flex items-center gap-2"
            >
              <RotateCcw size={14} /> Đặt lại tất cả
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

function AddressField({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-100'
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
        {icon} {label}
      </div>
      <div className={`text-sm font-semibold ${highlight ? 'text-teal-700' : 'text-gray-800'}`}>
        {value}
      </div>
    </div>
  );
}

function Stat({ label, val, icon }: { label: string; val: string; icon: string }) {  return (
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
  unlocked,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'blue' | 'orange' | 'teal' | 'red';
  unlocked: boolean;
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
        className={`w-14 h-14 border-2 rounded-full flex items-center justify-center ${
          unlocked ? styles[tone] : 'bg-gray-50 border-gray-200 text-gray-300'
        }`}
      >
        {icon}
      </div>
      <span className={`text-[11px] font-medium text-center ${unlocked ? 'text-gray-700' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}
