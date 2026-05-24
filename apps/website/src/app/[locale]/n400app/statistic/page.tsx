'use client';

import { ChevronDown } from 'lucide-react';
import { Card, ProgressBar, SKILL_DATA } from '@/components/n400/ui';

const KPIS = [
  { title: 'Tổng số câu hỏi đã làm', val: '1,248', inc: '↑ 12%', icon: '📚', bg: 'bg-teal-50', text: 'text-teal-600' },
  { title: 'Độ chính xác trung bình', val: '72%', inc: '↑ 8%', icon: '🎯', bg: 'bg-teal-50', text: 'text-teal-600' },
  { title: 'Thời gian học trung bình', val: '28', unit: 'phút/ngày', inc: '↑ 15%', icon: '⏱️', bg: 'bg-orange-50', text: 'text-orange-500' },
  { title: 'Chuỗi học tập hiện tại', val: '7', unit: 'ngày', inc: 'Cao nhất: 21 ngày', icon: '🔥', bg: 'bg-orange-50', text: 'text-orange-500' },
  { title: 'Điểm XP tích lũy', val: '2,450', inc: '↑ 320 điểm so với kỳ trước', icon: '🏅', bg: 'bg-yellow-50', text: 'text-yellow-500' },
];

const TOPICS = [
  { n: '1. The United States', v: 85 },
  { n: '2. Education', v: 75 },
  { n: '3. Work & Careers', v: 60 },
  { n: '4. Environment', v: 50 },
  { n: '5. Technology', v: 40 },
];

const HEAT_GRID = [
  [1, 1, 0, 2, 3, 4, 0],
  [0, 1, 2, 3, 4, 2, 0],
  [1, 0, 2, 1, 3, 4, 0],
  [2, 3, 1, 2, 0, 3, 1],
  [0, 1, 2, 3, 1, 4, 0],
];

const HEAT_COLORS = ['bg-teal-50', 'bg-teal-100', 'bg-teal-300', 'bg-teal-500', 'bg-teal-700'];

export default function StatisticPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-5 gap-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.title} className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-gray-500 font-medium">{kpi.title}</div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${kpi.bg}`}>
                <span className={kpi.text}>{kpi.icon}</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {kpi.val} {kpi.unit ? <span className="text-sm font-normal">{kpi.unit}</span> : null}
            </div>
            <div className="text-[10px] text-gray-400">{kpi.inc} so với kỳ trước</div>
          </Card>
        ))}
      </div>

      <div className="flex gap-6">
        <Card className="w-3/5 p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">Tiến độ theo thời gian</h3>
            <button
              type="button"
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 text-gray-600"
            >
              Câu hỏi đã làm <ChevronDown size={14} />
            </button>
          </div>
          <div className="h-64 relative w-full">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 180 Q 50 160 100 150 T 200 100 T 300 90 T 400 40 T 500 20 L 500 200 L 0 200 Z"
                fill="url(#lineGrad)"
              />
              <path
                d="M 0 180 Q 50 160 100 150 T 200 100 T 300 90 T 400 40 T 500 20"
                fill="none"
                stroke="#0d9488"
                strokeWidth="3"
              />
              <circle cx="200" cy="100" r="5" fill="#0d9488" />
              <circle cx="300" cy="90" r="5" fill="#0d9488" />
              <circle cx="400" cy="40" r="5" fill="#0d9488" />
              <circle cx="500" cy="20" r="5" fill="#0d9488" stroke="white" strokeWidth="2" />
            </svg>
            <div className="absolute top-10 right-32 bg-white border border-gray-100 shadow-md p-2 rounded text-xs text-center z-10">
              <div className="text-gray-500 font-medium mb-1">16/05/2024</div>
              <div className="font-bold text-teal-600">• Câu hỏi đã làm: 842</div>
            </div>
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-400 py-2">
              <span>1,500</span>
              <span>1,250</span>
              <span>1,000</span>
              <span>750</span>
              <span>500</span>
              <span>250</span>
              <span>0</span>
            </div>
            <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-2">
              <span>01/05</span>
              <span>06/05</span>
              <span>11/05</span>
              <span>16/05</span>
              <span>21/05</span>
              <span>26/05</span>
              <span>31/05</span>
            </div>
          </div>
        </Card>

        <Card className="w-2/5 p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">Hiệu suất theo kỹ năng</h3>
            <button
              type="button"
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 text-gray-600"
            >
              Độ chính xác <ChevronDown size={14} />
            </button>
          </div>
          <div className="flex justify-center gap-4 text-[10px] text-gray-500 mb-6">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-teal-600" /> Từ vựng
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-orange-500" /> Ngữ pháp
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-yellow-500" /> Đọc hiểu
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-purple-600" /> Nghe hiểu
            </span>
          </div>
          <div className="flex justify-between items-end h-40 pl-8 relative">
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-400 pb-6">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            {SKILL_DATA.map((skill) => (
              <div key={skill.name} className="flex flex-col items-center w-1/4">
                <div className="w-12 bg-gray-50 rounded-t-sm h-32 relative flex items-end justify-center">
                  <div
                    className={`w-full rounded-t-sm transition-all duration-500 ${skill.color}`}
                    style={{ height: `${skill.value}%` }}
                  />
                </div>
                <div className="text-center mt-3">
                  <div className="text-[11px] font-medium text-gray-600 mb-0.5">{skill.name}</div>
                  <div className="text-sm font-bold text-gray-800">{skill.value}%</div>
                  <div className={`text-[10px] font-medium ${skill.text}`}>↑ {skill.trend}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="p-5">
          <h3 className="font-bold text-gray-800 mb-6">Phân bổ mức độ câu hỏi</h3>
          <div className="flex items-center gap-6 flex-1">
            <div className="w-32 h-32 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="8" />
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#0d9488" strokeWidth="8" strokeDasharray="25 75" />
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f97316" strokeWidth="8" strokeDasharray="50 50" strokeDashoffset="-25" />
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#eab308" strokeWidth="8" strokeDasharray="20 80" strokeDashoffset="-75" />
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#a855f7" strokeWidth="8" strokeDasharray="5 95" strokeDashoffset="-95" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-800">1,248</span>
                <span className="text-[10px] text-gray-500">câu hỏi</span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <Legend color="bg-teal-600" label="Dễ" sub="25% (312 câu)" />
              <Legend color="bg-orange-500" label="Trung bình" sub="50% (624 câu)" />
              <Legend color="bg-yellow-500" label="Khó" sub="20% (250 câu)" />
              <Legend color="bg-purple-600" label="Rất khó" sub="5% (62 câu)" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-gray-800 mb-6">Hoạt động học tập</h3>
          <div className="flex mb-2 text-[10px] text-gray-400 pl-12">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
              <div key={d} className="flex-1 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {HEAT_GRID.map((row, weekIdx) => (
              <div key={weekIdx} className="flex items-center gap-2">
                <div className="w-10 text-[10px] text-gray-400">Tuần {weekIdx + 1}</div>
                <div className="grid grid-cols-7 gap-1.5 flex-1">
                  {row.map((level, i) => (
                    <div key={i} className={`h-4 rounded-sm ${HEAT_COLORS[level]}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end items-center gap-2 mt-4 text-[10px] text-gray-500">
            Ít
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-teal-50" />
              <div className="w-3 h-3 bg-teal-300" />
              <div className="w-3 h-3 bg-teal-700" />
            </div>
            Nhiều
          </div>
          <div className="flex justify-between items-center mt-4 text-xs">
            <span className="text-gray-500">Ngày học nhiều nhất:</span>
            <span className="font-semibold text-gray-800">Thứ 6</span>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs">
            <span className="text-gray-500">Tổng ngày đã học:</span>
            <span className="font-semibold text-gray-800">18 ngày</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">Chủ đề đã luyện tập</h3>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 border-b border-gray-100 pb-2 mb-4">
            <span>Chủ đề</span>
            <span>Độ hoàn thành</span>
          </div>
          <div className="space-y-4">
            {TOPICS.map((t) => (
              <div key={t.n} className="flex items-center gap-4 text-sm">
                <div className="w-32 truncate text-gray-700 font-medium">{t.n}</div>
                <div className="flex-1">
                  <ProgressBar progress={t.v} heightClass="h-1.5" colorClass="bg-teal-600" />
                </div>
                <div className="w-8 text-right text-xs text-gray-500">{t.v}%</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="w-full mt-6 py-2 border border-gray-200 rounded-lg text-sm text-teal-600 font-medium hover:bg-teal-50"
          >
            Xem tất cả chủ đề
          </button>
        </Card>
      </div>
    </div>
  );
}

function Legend({ color, label, sub }: { color: string; label: string; sub: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-0.5">
        <span className={`w-3 h-3 rounded-full ${color}`} /> {label}
      </div>
      <div className="text-[11px] text-gray-500 ml-5">{sub}</div>
    </div>
  );
}
