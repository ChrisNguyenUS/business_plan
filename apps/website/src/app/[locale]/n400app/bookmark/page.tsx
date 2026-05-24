'use client';

import Image from 'next/image';
import { Bookmark, MoreHorizontal, Search } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/n400/ui';

type Item = {
  id: number;
  kind: 'question' | 'note';
  no?: string;
  titleEn: string;
  titleVi: string;
  date: string;
  accent: 'teal' | 'orange' | 'purple';
};

const ITEMS: Item[] = [
  {
    id: 1,
    kind: 'question',
    no: 'Q. 15',
    titleEn: 'The Statue of Liberty is a symbol of ________.',
    titleVi: 'Tượng Nữ thần Tự do là biểu tượng của ________.',
    date: '10/05',
    accent: 'teal',
  },
  {
    id: 2,
    kind: 'question',
    no: 'Q. 47',
    titleEn: 'He has lived in the U.S. ________ more than five years.',
    titleVi: 'Anh ấy đã sống ở Hoa Kỳ hơn năm năm.',
    date: '08/05',
    accent: 'orange',
  },
  {
    id: 3,
    kind: 'note',
    titleEn: 'Review vocabulary: government, citizen, naturalize',
    titleVi: 'Ôn lại từ vựng: government, citizen, naturalize',
    date: '08/05',
    accent: 'purple',
  },
];

const ACCENT: Record<Item['accent'], { bg: string; text: string; chip: string; chipText: string }> = {
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    chip: 'bg-green-50',
    chipText: 'text-green-600',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-500',
    chip: 'bg-orange-50',
    chipText: 'text-orange-600',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    chip: 'bg-purple-50',
    chipText: 'text-purple-600',
  },
};

export default function BookmarkPage() {
  const [tab, setTab] = useState<'all' | 'question' | 'note'>('all');
  const visible = ITEMS.filter((i) => (tab === 'all' ? true : i.kind === tab));

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="flex gap-8 border-b border-gray-200 px-4">
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
          Tất cả ({ITEMS.length})
        </TabButton>
        <TabButton active={tab === 'question'} onClick={() => setTab('question')}>
          Câu hỏi ({ITEMS.filter((i) => i.kind === 'question').length})
        </TabButton>
        <TabButton active={tab === 'note'} onClick={() => setTab('note')}>
          Ghi chú ({ITEMS.filter((i) => i.kind === 'note').length})
        </TabButton>
      </div>

      <div className="flex justify-center">
        <div className="relative w-full max-w-lg h-48">
          <Image
            src="/images/n400/illu-reading.png"
            alt="Reading illustration"
            fill
            className="object-contain"
            sizes="500px"
            priority
          />
        </div>
      </div>

      <div className="space-y-4">
        {visible.map((item) => {
          const a = ACCENT[item.accent];
          return (
            <Card
              key={item.id}
              className="flex gap-4 items-start p-6 hover:border-gray-300 transition-colors cursor-pointer"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${a.bg} ${a.text}`}
              >
                <Bookmark size={24} fill="currentColor" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className={`font-bold mb-2 ${item.kind === 'note' ? a.text : 'text-gray-800'}`}>
                    {item.kind === 'note' ? 'Ghi chú / Note' : item.no}
                  </h4>
                  <button type="button" className="text-gray-400 hover:text-gray-700">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <p className="text-gray-800 font-medium mb-1">{item.titleEn}</p>
                <p className="text-gray-500 text-sm mb-4">{item.titleVi}</p>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 ${a.chip} ${a.chipText} text-xs font-bold rounded-md`}
                  >
                    {item.kind === 'note' ? 'Ghi chú' : 'Câu hỏi'}
                  </span>
                  <span className="text-xs text-gray-400">Đánh dấu ngày {item.date}</span>
                </div>
              </div>
              <button type="button" className={a.text}>
                <Bookmark size={24} fill="currentColor" />
              </button>
            </Card>
          );
        })}

        <Card className="bg-teal-50/50 border-dashed border-2 border-teal-200 flex justify-between items-center p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
              <Bookmark size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">Lưu lại những nội dung quan trọng</h4>
              <p className="text-sm text-gray-500">
                Đánh dấu câu hỏi và ghi chú để ôn tập hiệu quả hơn mỗi ngày.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-teal-700"
          >
            <Search size={16} /> Khám phá nội dung
          </button>
        </Card>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pb-3 px-2 transition-colors ${
        active
          ? 'border-b-2 border-teal-600 text-teal-600 font-bold'
          : 'text-gray-500 font-medium hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}
