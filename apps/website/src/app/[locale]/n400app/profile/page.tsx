'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  User,
  MapPin,
  BarChart2,
  RotateCcw,
  Volume2,
  VolumeX,
  Pencil,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/n400/ui';
import { BadgeGallery } from '@/components/n400/BadgeGallery';
import { useN400UserState } from '@/lib/n400/user-state';
import { useN400Badges } from '@/lib/n400/use-badges';
import { STATES } from '@/lib/n400/state-data';

export default function ProfilePage() {
  const { state, hydrated, stats, updateSettings, resetAll } = useN400UserState();
  const badges = useN400Badges();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [confirmReset, setConfirmReset] = useState(false);

  if (!hydrated) {
    return <div className="text-sm text-gray-500">Đang tải…</div>;
  }

  const stateInfo = STATES.find(
    (s) => s.code === (state.address.stateCode ?? state.settings.stateCode)
  );

  const onResetConfirm = () => {
    resetAll();
    setConfirmReset(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
      {/* ─── Identity ─── */}
      <Card className="p-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-teal-50 border-4 border-teal-100 relative shadow-inner overflow-hidden shrink-0">
            <Image
              src="/images/n400/illu-wink.png"
              alt="Avatar"
              fill
              className="object-cover"
              sizes="112px"
              priority
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Liberty Learner</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold mb-3">
              <User size={14} /> Ứng viên N400
            </div>
            <p className="text-sm text-gray-600 max-w-md mb-3">
              Mục tiêu của tôi là chinh phục kỳ thi N400 để hiện thực hóa giấc mơ trở thành công dân Mỹ.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <User size={14} /> liberty.learner@email.com
              </span>
              {stateInfo && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {stateInfo.nameEn}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Summary stat line → Learning Progress */}
        <Link
          href={`/${locale}/n400app/statistic`}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-600 hover:bg-teal-50 hover:text-teal-700 transition-colors duration-[var(--motion-fast)]"
        >
          <BarChart2 size={16} className="text-gray-400" />
          <span>
            {stats.coverage}% phủ chương trình · {stats.accuracy}% chính xác · {stats.mastered} câu đã thuộc
          </span>
          <ExternalLink size={14} className="ml-auto text-gray-400" />
        </Link>
      </Card>

      {/* ─── Achievements (product data, displayed on Account) ─── */}
      {badges.hydrated ? (
        <BadgeGallery catalog={badges.catalog} earned={badges.earned} />
      ) : null}

      {/* ─── Address & District ─── */}
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
                from: 'profile',
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

      {/* ─── Preferences ─── */}
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

        {/* ─── Danger Zone ─── */}
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
