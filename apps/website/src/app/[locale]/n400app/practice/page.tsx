'use client';

import Image from 'next/image';
import { CheckCircle, Upload, Target, Award, Rocket } from 'lucide-react';
import { useState } from 'react';
import { Card, ProgressBar } from '@/components/n400/ui';

type Option = { id: 'A' | 'B' | 'C' | 'D'; en: string; vi: string };

const OPTIONS: Option[] = [
  { id: 'A', en: 'offers', vi: 'cung cấp' },
  { id: 'B', en: 'offer', vi: 'cung cấp (danh từ)' },
  { id: 'C', en: 'offered', vi: 'đã cung cấp' },
  { id: 'D', en: 'offering', vi: 'sự cung cấp' },
];

export default function PracticePage() {
  const [selected, setSelected] = useState<Option['id']>('A');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="text-sm font-medium text-gray-700 mb-3">Câu hỏi 24 / 128</div>
        <ProgressBar progress={(24 / 128) * 100} heightClass="h-2" />
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-6 items-start">
        <Card className="p-8 flex flex-col">
          <div className="flex items-start gap-4 mb-10">
            <div className="relative w-32 h-32 shrink-0">
              <Image
                src="/images/n400/illu-studying.png"
                alt=""
                fill
                className="object-contain"
                sizes="128px"
                priority
              />
            </div>
            <div className="relative bg-gray-50 rounded-2xl rounded-bl-none px-5 py-3 mt-6 border border-gray-200">
              <div className="text-sm text-gray-600 leading-tight">Cùng chinh phục</div>
              <div className="text-lg font-extrabold text-gray-900 leading-tight">N400!</div>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-2">Câu hỏi / Question</div>
          <div className="text-xl font-bold text-gray-800 leading-snug mb-1">
            The United States{' '}
            <span className="inline-block w-32 border-b-2 border-gray-400 mx-1 align-middle" />{' '}
            freedom and opportunity.
          </div>
          <div className="text-sm text-gray-500 mb-8">
            Hoa Kỳ{' '}
            <span className="inline-block w-24 border-b border-gray-300 mx-1 align-middle" />{' '}
            tự do và cơ hội.
          </div>

          <div className="space-y-3 flex-1">
            {OPTIONS.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelected(opt.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-teal-600 bg-white shadow-sm'
                      : 'border-gray-200 hover:border-teal-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-gray-800 w-6">{opt.id}</div>
                  <div className="flex-1 text-gray-800 font-medium">
                    {opt.en} / {opt.vi}
                  </div>
                  {isSelected ? (
                    <CheckCircle size={24} className="text-teal-600" />
                  ) : (
                    <span className="w-6 h-6 rounded-full border-2 border-gray-200" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-[1fr_2fr] gap-4 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              className="py-3.5 rounded-xl border border-gray-200 bg-white font-semibold text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50"
            >
              <Upload size={16} />
              <span className="leading-tight text-left">
                Giải thích
                <br />
                <span className="text-xs font-normal text-gray-500">Explanation</span>
              </span>
            </button>
            <button
              type="button"
              className="py-3.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-md flex flex-col items-center justify-center"
            >
              <span>Tiếp theo</span>
              <span className="text-xs font-normal opacity-80">Next</span>
            </button>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <div className="relative h-[480px] rounded-3xl overflow-hidden">
            <Image
              src="/images/n400/illu-statue-city.png"
              alt="Statue of Liberty with American flag and city skyline"
              fill
              className="object-contain"
              sizes="500px"
              priority
            />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 leading-snug">
              Mỗi câu trả lời đúng
              <br />
              là một bước gần hơn đến ước mơ!
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Giữ vững phong độ và chinh phục N400 nhé! 💪
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TipCard
              icon={<Target size={20} />}
              tone="teal"
              title="Tập trung mỗi ngày"
              desc="Tiến bộ hơn 1% hôm nay tốt hơn ngày mai."
            />
            <TipCard
              icon={<Award size={20} />}
              tone="orange"
              title="Thử thách bản thân"
              desc="Càng luyện tập nhiều, kết quả càng bứt phá."
            />
            <TipCard
              icon={<Rocket size={20} />}
              tone="purple"
              title="Chinh phục mục tiêu"
              desc="N400 không còn xa khi bạn không bỏ cuộc."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TipCard({
  icon,
  tone,
  title,
  desc,
}: {
  icon: React.ReactNode;
  tone: 'teal' | 'orange' | 'purple';
  title: string;
  desc: string;
}) {
  const styles = {
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-500',
    purple: 'bg-purple-50 text-purple-600',
  } as const;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${styles[tone]}`}>
        {icon}
      </div>
      <div className="font-bold text-sm text-gray-800 mb-1 leading-tight">{title}</div>
      <div className="text-[11px] text-gray-500 leading-snug">{desc}</div>
    </div>
  );
}
