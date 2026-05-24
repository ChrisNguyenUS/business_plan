import React, { useState } from 'react';
import {
    Home, CheckCircle, BarChart2, Grid, User, Bot, Bookmark,
    Settings, LogOut, Moon, Sun, Flame, ChevronDown, Search,
    MoreHorizontal, MapPin, Award, Target, BookOpen, Clock,
    TrendingUp, Shield, HelpCircle, ArrowRight
} from 'lucide-react';

// --- MOCK DATA ---
const SIDEBAR_MENU = [
    { id: 'dashboard', label: 'Tổng quan', icon: Home },
    { id: 'practice', label: 'Luyện tập', icon: CheckCircle },
    { id: 'statistic', label: 'Thống kê', icon: BarChart2 },
    { id: 'integration', label: 'Tích hợp', icon: Grid },
    { id: 'profile', label: 'Hồ sơ', icon: User },
    { id: 'categories', label: 'Danh mục', icon: MapPin },
    { id: 'ai', label: 'Trợ lý AI', icon: Bot },
    { id: 'bookmark', label: 'Đánh dấu', icon: Bookmark },
];

const SKILL_DATA = [
    { name: 'Từ vựng', value: 80, color: 'bg-teal-600', text: 'text-teal-600', trend: '+5%' },
    { name: 'Ngữ pháp', value: 65, color: 'bg-orange-500', text: 'text-orange-500', trend: '+4%' },
    { name: 'Đọc hiểu', value: 70, color: 'bg-yellow-500', text: 'text-yellow-500', trend: '+6%' },
    { name: 'Nghe hiểu', value: 75, color: 'bg-purple-600', text: 'text-purple-600', trend: '+7%' },
];

// --- HELPER COMPONENTS ---

const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>
        {children}
    </div>
);

const ProgressBar = ({ progress, colorClass = 'bg-teal-600', heightClass = 'h-2' }) => (
    <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${heightClass}`}>
        <div className={`${heightClass} ${colorClass} rounded-full`} style={{ width: `${progress}%` }}></div>
    </div>
);

// --- SCREENS ---

const DashboardScreen = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex gap-6">
            {/* Cột trái: Tiến độ, Chuỗi, Kỹ năng */}
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
                    <Card className="w-1/3 relative overflow-hidden flex flex-col justify-between">
                        <div className="z-10 relative">
                            <h3 className="text-gray-500 font-medium mb-2">Chuỗi học tập</h3>
                            <div className="text-3xl font-bold text-gray-800 mb-1">7 ngày</div>
                            <p className="text-sm text-gray-500">Cố lên! 🔥</p>
                        </div>
                        {/* Simple SVG illustration substitute */}
                        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-teal-50 rounded-full flex items-center justify-center opacity-70">
                            <Flame size={64} className="text-orange-400 opacity-50" />
                        </div>
                    </Card>

                    <Card className="w-2/3">
                        <h3 className="text-gray-500 font-medium mb-4">Hiệu suất theo kỹ năng</h3>
                        <div className="flex justify-between items-end h-32 px-4">
                            {SKILL_DATA.map((skill, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2 w-1/4">
                                    <div className="w-10 bg-gray-100 rounded-t-md h-24 relative flex items-end justify-center">
                                        <div className={`w-full rounded-t-md ${skill.color}`} style={{ height: `${skill.value}%` }}></div>
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
                        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                            <User size={24} />
                        </div>
                        <div>
                            <div className="font-bold text-gray-800 text-lg">50.000+</div>
                            <div className="text-xs text-gray-500">Người dùng tin tưởng</div>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-gray-200"></div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <div className="font-bold text-gray-800 text-lg">90%</div>
                            <div className="text-xs text-gray-500">Tăng tự tin sau luyện tập</div>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-gray-200"></div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                            <Award size={24} />
                        </div>
                        <div>
                            <div className="font-bold text-gray-800 text-lg">92%</div>
                            <div className="text-xs text-gray-500">Cải thiện điểm số</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Cột phải: Hình ảnh minh hoạ */}
            <div className="w-1/3">
                <Card className="h-full bg-gradient-to-b from-teal-50 to-white flex flex-col items-center justify-center p-8 relative overflow-hidden border-none shadow-sm">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#007b7f_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div className="z-10 text-center">
                        <div className="w-48 h-48 mx-auto bg-teal-100 rounded-full flex items-center justify-center shadow-inner border-4 border-white mb-6">
                            <Shield size={80} className="text-teal-600" />
                        </div>
                        <h2 className="text-xl font-bold text-teal-800 mb-2">Sẵn sàng chinh phục N400!</h2>
                        <p className="text-sm text-teal-600/80">Luyện tập mỗi ngày để đạt kết quả tốt nhất.</p>
                    </div>
                </Card>
            </div>
        </div>
    </div>
);

const PracticeScreen = () => {
    const [selectedOpt, setSelectedOpt] = useState('A');

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex gap-6 h-[calc(100vh-140px)]">
                {/* Câu hỏi */}
                <div className="w-3/5 flex flex-col">
                    <Card className="flex-1 flex flex-col relative">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-sm font-semibold text-gray-700">Câu hỏi 24 / 128</div>
                        </div>
                        <ProgressBar progress={(24 / 128) * 100} heightClass="h-2 mb-6" />

                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 shrink-0">
                                <Bot size={32} />
                            </div>
                            <div className="bg-gray-100 py-2 px-4 rounded-2xl rounded-tl-none relative border border-gray-200">
                                <span className="text-sm font-medium text-gray-800">Cùng chinh phục N400!</span>
                            </div>
                        </div>

                        <div className="text-sm text-gray-500 mb-2">Câu hỏi / Question</div>
                        <div className="text-xl font-bold text-gray-800 mb-1">
                            The United States <span className="inline-block w-32 border-b-2 border-gray-400 mx-2"></span> freedom and opportunity.
                        </div>
                        <div className="text-sm text-gray-500 mb-8">Hoa Kỳ <span className="inline-block w-24 border-b border-gray-300 mx-1"></span> tự do và cơ hội.</div>

                        <div className="space-y-3 flex-1">
                            {['A', 'B', 'C', 'D'].map((opt) => {
                                const labels = {
                                    'A': 'offers / cung cấp',
                                    'B': 'offer / cung cấp (danh từ)',
                                    'C': 'offered / đã cung cấp',
                                    'D': 'offering / sự cung cấp'
                                };
                                const isSelected = selectedOpt === opt;
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => setSelectedOpt(opt)}
                                        className={`w-full flex items-center p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-teal-600 bg-teal-50' : 'border-gray-200 hover:border-teal-300 bg-white'
                                            }`}
                                    >
                                        <div className="font-bold text-gray-700 w-8 text-left">{opt}</div>
                                        <div className="flex-1 text-left text-gray-800 font-medium">{labels[opt]}</div>
                                        {isSelected && <CheckCircle className="text-teal-600" size={20} />}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex gap-4 mt-6 pt-6 border-t border-gray-100">
                            <button className="flex-1 py-3.5 rounded-xl border border-gray-200 font-semibold text-gray-700 flex justify-center items-center gap-2 hover:bg-gray-50">
                                <HelpCircle size={18} />
                                Giải thích<br /><span className="text-xs font-normal">Explanation</span>
                            </button>
                            <button className="flex-[2] py-3.5 rounded-xl bg-teal-600 font-semibold text-white hover:bg-teal-700 shadow-md flex justify-center items-center flex-col">
                                <span>Tiếp theo</span>
                                <span className="text-xs font-normal opacity-80">Next</span>
                            </button>
                        </div>
                    </Card>
                </div>

                {/* Minh hoạ phải */}
                <div className="w-2/5 flex flex-col gap-4">
                    <Card className="flex-1 bg-gradient-to-b from-teal-50/50 to-white flex flex-col items-center justify-center p-6 text-center border-none">
                        {/* Illustration placeholder */}
                        <div className="w-64 h-64 bg-teal-100 rounded-full mb-6 flex items-center justify-center text-teal-500 shadow-inner">
                            <Target size={100} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Mỗi câu trả lời đúng<br />là một bước gần hơn đến ước mơ!</h2>
                        <p className="text-sm text-gray-500 mb-8">Giữ vững phong độ và chinh phục N400 nhé! 💪</p>

                        <div className="w-full space-y-3">
                            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-600"><Target size={20} /></div>
                                <div className="text-left flex-1">
                                    <div className="text-sm font-bold text-gray-800">Tập trung mỗi ngày</div>
                                    <div className="text-xs text-gray-500">Tiến bộ hơn 1% hôm nay</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500"><Award size={20} /></div>
                                <div className="text-left flex-1">
                                    <div className="text-sm font-bold text-gray-800">Thử thách bản thân</div>
                                    <div className="text-xs text-gray-500">Càng luyện tập nhiều càng bứt phá</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const StatisticScreen = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
        {/* Kpi Row */}
        <div className="grid grid-cols-5 gap-4">
            {[
                { title: 'Tổng số câu hỏi đã làm', val: '1,248', inc: '↑ 12%', icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
                { title: 'Độ chính xác trung bình', val: '72%', inc: '↑ 8%', icon: Target, color: 'text-teal-600', bg: 'bg-teal-50' },
                { title: 'Thời gian học trung bình', val: '28', unit: 'phút/ngày', inc: '↑ 15%', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
                { title: 'Chuỗi học tập hiện tại', val: '7', unit: 'ngày', inc: '🔥 Cao nhất: 21 ngày', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
                { title: 'Điểm XP tích lũy', val: '2,450', inc: '↑ 320 điểm', icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50' },
            ].map((kpi, i) => (
                <Card key={i} className="p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon size={20} />
                        </div>
                    </div>
                    <div>
                        <div className="text-[11px] text-gray-500 font-medium mb-1">{kpi.title}</div>
                        <div className="text-2xl font-bold text-gray-800">
                            {kpi.val} <span className="text-sm font-normal">{kpi.unit}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">{kpi.inc} so với kỳ trước</div>
                    </div>
                </Card>
            ))}
        </div>

        {/* Charts Row */}
        <div className="flex gap-6">
            <Card className="w-3/5 p-5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800">Tiến độ theo thời gian</h3>
                    <button className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 text-gray-600">
                        Câu hỏi đã làm <ChevronDown size={14} />
                    </button>
                </div>
                {/* Simple Line Chart SVG */}
                <div className="h-64 relative w-full">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d="M 0 180 Q 50 160 100 150 T 200 100 T 300 90 T 400 40 T 500 20 L 500 200 L 0 200 Z" fill="url(#lineGrad)" />
                        <path d="M 0 180 Q 50 160 100 150 T 200 100 T 300 90 T 400 40 T 500 20" fill="none" stroke="#0d9488" strokeWidth="3" />
                        <circle cx="200" cy="100" r="5" fill="#0d9488" />
                        <circle cx="300" cy="90" r="5" fill="#0d9488" />
                        <circle cx="400" cy="40" r="5" fill="#0d9488" />
                        <circle cx="500" cy="20" r="5" fill="#0d9488" stroke="white" strokeWidth="2" />
                    </svg>
                    <div className="absolute top-10 right-32 bg-white border border-gray-100 shadow-md p-2 rounded text-xs text-center z-10">
                        <div className="text-gray-500 font-medium mb-1">16/05/2024</div>
                        <div className="font-bold text-teal-600">• Câu hỏi đã làm: 842</div>
                    </div>
                    {/* Y Axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-400 py-2">
                        <span>1,500</span><span>1,250</span><span>1,000</span><span>750</span><span>500</span><span>250</span><span>0</span>
                    </div>
                    {/* X Axis labels */}
                    <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                        <span>01/05</span><span>06/05</span><span>11/05</span><span>16/05</span><span>21/05</span><span>26/05</span><span>31/05</span>
                    </div>
                </div>
            </Card>

            <Card className="w-2/5 p-5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800">Hiệu suất theo kỹ năng</h3>
                    <button className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 text-gray-600">
                        Độ chính xác <ChevronDown size={14} />
                    </button>
                </div>
                <div className="flex justify-center gap-4 text-[10px] text-gray-500 mb-6">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-teal-600"></span> Từ vựng</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500"></span> Ngữ pháp</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-500"></span> Đọc hiểu</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-600"></span> Nghe hiểu</span>
                </div>
                <div className="flex justify-between items-end h-40 pl-8 relative">
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-400 pb-6">
                        <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                    </div>
                    {SKILL_DATA.map((skill, idx) => (
                        <div key={idx} className="flex flex-col items-center w-1/4">
                            <div className="w-12 bg-gray-50 rounded-t-sm h-32 relative flex items-end justify-center group cursor-pointer">
                                <div className={`w-full rounded-t-sm transition-all duration-500 ${skill.color}`} style={{ height: `${skill.value}%` }}></div>
                            </div>
                            <div className="text-center mt-3">
                                <div className="text-[11px] font-medium text-gray-600 mb-0.5">{skill.name}</div>
                                <div className={`text-sm font-bold text-gray-800`}>{skill.value}%</div>
                                <div className={`text-[10px] font-medium ${skill.text}`}>↑ {skill.trend}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-3 gap-6">
            <Card className="p-5 flex flex-col">
                <h3 className="font-bold text-gray-800 mb-6">Phân bổ mức độ câu hỏi</h3>
                <div className="flex items-center gap-6 flex-1">
                    {/* Donut Chart SVG */}
                    <div className="w-32 h-32 relative">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="8"></circle>
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#0d9488" strokeWidth="8" strokeDasharray="25 75" strokeDashoffset="0"></circle>
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f97316" strokeWidth="8" strokeDasharray="50 50" strokeDashoffset="-25"></circle>
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#a855f7" strokeWidth="8" strokeDasharray="5 95" strokeDashoffset="-75"></circle>
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#eab308" strokeWidth="8" strokeDasharray="20 80" strokeDashoffset="-80"></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-gray-800">1,248</span>
                            <span className="text-[10px] text-gray-500">câu hỏi</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-0.5">
                                <span className="w-3 h-3 rounded-full bg-teal-600"></span> Dễ
                            </div>
                            <div className="text-[11px] text-gray-500 ml-5">25% (312 câu)</div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-0.5">
                                <span className="w-3 h-3 rounded-full bg-orange-500"></span> Trung bình
                            </div>
                            <div className="text-[11px] text-gray-500 ml-5">50% (624 câu)</div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-0.5">
                                <span className="w-3 h-3 rounded-full bg-purple-600"></span> Khó
                            </div>
                            <div className="text-[11px] text-gray-500 ml-5">25% (250 câu)</div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-5">
                <h3 className="font-bold text-gray-800 mb-6">Hoạt động học tập</h3>
                <div className="flex mb-2 text-[10px] text-gray-400 pl-8">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d} className="flex-1 text-center">{d}</div>)}
                </div>
                <div className="flex gap-2">
                    <div className="flex flex-col gap-2 text-[10px] text-gray-400 pt-1">
                        {['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'].map(w => <div key={w} className="h-4 flex items-center">{w}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 flex-1">
                        {Array.from({ length: 35 }).map((_, i) => {
                            // Randomize opacity to simulate heatmap
                            const opacities = ['bg-teal-50', 'bg-teal-100', 'bg-teal-300', 'bg-teal-500', 'bg-teal-700'];
                            const randomClass = opacities[Math.floor(Math.random() * opacities.length)];
                            return <div key={i} className={`h-4 rounded-sm ${randomClass}`}></div>
                        })}
                    </div>
                </div>
                <div className="flex justify-end items-center gap-2 mt-4 text-[10px] text-gray-500">
                    Ít <div className="flex gap-1"><div className="w-3 h-3 bg-teal-50"></div><div className="w-3 h-3 bg-teal-300"></div><div className="w-3 h-3 bg-teal-700"></div></div> Nhiều
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
                    {[
                        { n: '1. The United States', v: 85 },
                        { n: '2. Education', v: 75 },
                        { n: '3. Work & Careers', v: 60 },
                        { n: '4. Environment', v: 50 },
                        { n: '5. Technology', v: 40 },
                    ].map((t, i) => (
                        <div key={i} className="flex items-center gap-4 text-sm">
                            <div className="w-32 truncate text-gray-700 font-medium">{t.n}</div>
                            <div className="flex-1"><ProgressBar progress={t.v} heightClass="h-1.5" colorClass="bg-teal-600" /></div>
                            <div className="w-8 text-right text-xs text-gray-500">{t.v}%</div>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-6 py-2 border border-gray-200 rounded-lg text-sm text-teal-600 font-medium hover:bg-teal-50">
                    Xem tất cả chủ đề
                </button>
            </Card>
        </div>
    </div>
);

const CategoriesScreen = () => (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-300">
        <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Tìm kiếm danh mục..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-teal-500 text-sm"
                />
            </div>
            <button className="px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-600 flex items-center gap-2">
                Sắp xếp: A - Z <ChevronDown size={16} />
            </button>
        </div>

        <Card className="flex-1 relative overflow-hidden flex flex-col p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 z-10 relative">Danh mục</h3>

            {/* Map Pathway Visual */}
            <div className="flex-1 relative min-h-[300px]">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <path d="M 100 100 Q 300 50 400 150 T 700 100" fill="none" stroke="#e5e7eb" strokeWidth="4" strokeDasharray="8 8" />
                </svg>

                {/* Nodes */}
                <div className="absolute top-[20%] left-[10%] flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-10 h-10 rounded-full bg-teal-500 border-4 border-white shadow-md flex items-center justify-center text-white mb-2">
                        <MapPin size={20} fill="currentColor" className="text-teal-500" />
                    </div>
                    <div className="bg-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg text-center shadow-sm">
                        Từ vựng<br />Vocabulary
                    </div>
                </div>

                <div className="absolute top-[60%] left-[40%] flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-10 h-10 rounded-full bg-orange-500 border-4 border-white shadow-md flex items-center justify-center text-white mb-2">
                        <MapPin size={20} fill="currentColor" className="text-orange-500" />
                    </div>
                    <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg text-center shadow-sm">
                        Ngữ pháp<br />Grammar
                    </div>
                </div>

                <div className="absolute top-[30%] left-[70%] flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-10 h-10 rounded-full bg-yellow-500 border-4 border-white shadow-md flex items-center justify-center text-white mb-2">
                        <MapPin size={20} fill="currentColor" className="text-yellow-500" />
                    </div>
                    <div className="bg-yellow-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg text-center shadow-sm">
                        Đọc hiểu<br />Reading
                    </div>
                </div>

                <div className="absolute top-[70%] left-[85%] flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-10 h-10 rounded-full bg-purple-600 border-4 border-white shadow-md flex items-center justify-center text-white mb-2">
                        <MapPin size={20} fill="currentColor" className="text-purple-600" />
                    </div>
                    <div className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg text-center shadow-sm">
                        Nghe hiểu<br />Listening
                    </div>
                </div>

                {/* Decorative Icons (Trees, Buildings) placeholders */}
                <div className="absolute top-[40%] left-[20%] text-teal-800 opacity-20"><Shield size={48} /></div>
                <div className="absolute top-[10%] left-[50%] text-gray-400 opacity-30"><Bot size={32} /></div>
                <div className="absolute top-[80%] left-[60%] text-gray-400 opacity-20"><Grid size={64} /></div>
            </div>

            <div className="bg-teal-50 rounded-2xl p-6 flex justify-between items-center mt-6 z-10 relative">
                <div>
                    <h4 className="text-lg font-bold text-gray-800">Khám phá tất cả danh mục</h4>
                    <div className="text-sm text-gray-500 font-medium mb-1">Explore all categories</div>
                    <p className="text-sm text-gray-600 mt-2 max-w-sm">Tập trung vào điểm yếu và nâng cao kỹ năng của bạn.</p>
                </div>
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-teal-100">
                    <Target size={40} className="text-orange-500" />
                </div>
            </div>
        </Card>
    </div>
);

const BookmarkScreen = () => (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
        <div className="flex gap-8 border-b border-gray-200 px-4 mb-8">
            <button className="pb-3 border-b-2 border-teal-600 text-teal-600 font-bold px-2">Tất cả (12)</button>
            <button className="pb-3 text-gray-500 font-medium px-2 hover:text-gray-800">Câu hỏi (8)</button>
            <button className="pb-3 text-gray-500 font-medium px-2 hover:text-gray-800">Ghi chú (4)</button>
        </div>

        {/* Reading Statue Illustration Placeholder */}
        <div className="flex justify-center mb-10">
            <div className="w-full max-w-md h-40 bg-teal-50 rounded-3xl flex items-center justify-center relative overflow-hidden">
                <BookOpen size={80} className="text-teal-600 opacity-80" />
                <div className="absolute bottom-0 w-full h-8 bg-blue-100/50"></div>
            </div>
        </div>

        <div className="space-y-4">
            {/* Item 1 */}
            <Card className="flex gap-4 items-start p-6 hover:border-teal-300 transition-colors cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                    <Bookmark size={24} fill="currentColor" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800 mb-2">Q. 15</h4>
                        <button className="text-gray-400 hover:text-teal-600"><MoreHorizontal size={20} /></button>
                    </div>
                    <p className="text-gray-800 font-medium mb-1">The Statue of Liberty is a symbol of ________.</p>
                    <p className="text-gray-500 text-sm mb-4">Tượng Nữ thần Tự do là biểu tượng của ________.</p>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-md">Câu hỏi</span>
                        <span className="text-xs text-gray-400">Đánh dấu ngày 10/05</span>
                    </div>
                </div>
                <button className="text-teal-600"><Bookmark size={24} fill="currentColor" /></button>
            </Card>

            {/* Item 2 */}
            <Card className="flex gap-4 items-start p-6 hover:border-orange-300 transition-colors cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                    <Bookmark size={24} fill="currentColor" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800 mb-2">Q. 47</h4>
                        <button className="text-gray-400 hover:text-orange-500"><MoreHorizontal size={20} /></button>
                    </div>
                    <p className="text-gray-800 font-medium mb-1">He has lived in the U.S. ________ more than five years.</p>
                    <p className="text-gray-500 text-sm mb-4">Anh ấy đã sống ở Hoa Kỳ hơn năm năm.</p>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded-md">Câu hỏi</span>
                        <span className="text-xs text-gray-400">Đánh dấu ngày 08/05</span>
                    </div>
                </div>
                <button className="text-orange-500"><Bookmark size={24} fill="currentColor" /></button>
            </Card>

            {/* Item 3 */}
            <Card className="flex gap-4 items-start p-6 hover:border-purple-300 transition-colors cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                    <Bookmark size={24} fill="currentColor" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-purple-800 mb-2">Ghi chú / Note</h4>
                        <button className="text-gray-400 hover:text-purple-600"><MoreHorizontal size={20} /></button>
                    </div>
                    <p className="text-gray-800 font-medium mb-1">Ôn lại từ vựng: government, citizen, naturalize</p>
                    <p className="text-gray-500 text-sm mb-4">Review vocabulary: government, citizen, naturalize</p>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-md">Ghi chú</span>
                        <span className="text-xs text-gray-400">Đánh dấu ngày 08/05</span>
                    </div>
                </div>
                <button className="text-purple-600"><Bookmark size={24} fill="currentColor" /></button>
            </Card>

            <Card className="bg-teal-50/50 border-dashed border-2 border-teal-200 flex justify-between items-center p-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                        <Bookmark size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800">Lưu lại những nội dung quan trọng</h4>
                        <p className="text-sm text-gray-500">Đánh dấu câu hỏi và ghi chú để ôn tập hiệu quả hơn mỗi ngày.</p>
                    </div>
                </div>
                <button className="px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-teal-700">
                    <Search size={16} /> Khám phá nội dung
                </button>
            </Card>
        </div>
    </div>
);

const ProfileScreen = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header Card */}
        <Card className="flex items-center gap-8 p-6">
            <div className="w-32 h-32 rounded-full bg-teal-50 border-4 border-teal-100 relative flex items-center justify-center shadow-inner">
                <User size={64} className="text-teal-600" />
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 shadow-sm hover:text-teal-600">
                    <Settings size={14} />
                </button>
            </div>
            <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Liberty Learner</h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold mb-4">
                    <CheckCircle size={14} /> Ứng viên N400
                </div>
                <p className="text-sm text-gray-600 max-w-md mb-4">Mục tiêu của tôi là chinh phục kỳ thi N400 để hiện thực hóa giấc mơ trở thành công dân Mỹ.</p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2"><User size={16} /> liberty.learner@email.com</div>
                    <div className="flex items-center gap-2"><Clock size={16} /> Tham gia: 15/02/2024</div>
                    <div className="flex items-center gap-2"><MapPin size={16} /> Vietnam</div>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="text-center bg-gray-50 p-4 rounded-2xl w-24">
                    <div className="text-xs text-gray-500 font-medium mb-1">Cấp độ</div>
                    <div className="text-2xl font-bold text-gray-800">12</div>
                </div>
                <div className="text-center bg-gray-50 p-4 rounded-2xl w-28">
                    <div className="text-xs text-gray-500 font-medium mb-1">Điểm XP</div>
                    <div className="text-2xl font-bold text-gray-800">2,450</div>
                </div>
                <div className="text-center bg-gray-50 p-4 rounded-2xl w-24">
                    <div className="text-xs text-gray-500 font-medium mb-1">Huy hiệu</div>
                    <div className="text-2xl font-bold text-gray-800">18</div>
                </div>
            </div>
        </Card>

        <div className="grid grid-cols-3 gap-6">
            {/* Tiến độ tổng quan */}
            <Card className="p-6">
                <h3 className="font-bold text-gray-800 mb-6">Tiến độ tổng quan</h3>
                <div className="flex items-center gap-6 mb-6">
                    <div className="w-28 h-28 relative">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="4"></circle>
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#0d9488" strokeWidth="4" strokeDasharray="72 28" strokeDashoffset="0"></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-gray-800">72%</span>
                            <span className="text-[10px] text-gray-500">92 / 128 câu hỏi</span>
                        </div>
                    </div>
                    <div className="flex-1 space-y-3 text-sm">
                        <div>
                            <div className="flex justify-between mb-1"><span className="text-gray-600">Đúng</span> <span className="font-bold text-gray-800">66 câu (72%)</span></div>
                            <ProgressBar progress={72} colorClass="bg-teal-600" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1"><span className="text-gray-600">Sai</span> <span className="font-bold text-gray-800">18 câu (20%)</span></div>
                            <ProgressBar progress={20} colorClass="bg-orange-500" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1"><span className="text-gray-600">Chưa làm</span> <span className="font-bold text-gray-800">8 câu (8%)</span></div>
                            <ProgressBar progress={8} colorClass="bg-gray-300" />
                        </div>
                    </div>
                </div>
                <button className="w-full py-2.5 bg-teal-50 text-teal-600 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-teal-100">
                    <BarChart2 size={16} /> Xem thống kê chi tiết
                </button>
            </Card>

            {/* Chuỗi học tập */}
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
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i < 6 ? 'bg-teal-600 text-white' : 'bg-gray-100 text-transparent'}`}>
                                <CheckCircle size={16} />
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-center text-xs text-gray-500 mt-6">Hãy duy trì chuỗi học tập để đạt kết quả tốt nhất!</p>
            </Card>

            {/* Thành tích */}
            <Card className="p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800">Thành tích</h3>
                    <button className="text-teal-600 text-xs font-bold">Xem tất cả</button>
                </div>
                <div className="flex justify-between px-2 mb-6">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center text-blue-600"><Shield size={24} /></div>
                        <span className="text-xs font-medium text-gray-700">Người bắt đầu</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 bg-orange-50 border-2 border-orange-200 rounded-full flex items-center justify-center text-orange-500"><Award size={24} /></div>
                        <span className="text-xs font-medium text-gray-700">Kiên trì</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 bg-teal-50 border-2 border-teal-200 rounded-full flex items-center justify-center text-teal-600"><Target size={24} /></div>
                        <span className="text-xs font-medium text-gray-700">Tập trung</span>
                    </div>
                </div>
                <div className="mt-auto bg-teal-50 rounded-xl p-4 flex gap-4 items-center">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-teal-600 shadow-sm shrink-0">
                        <Award size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 text-sm mb-0.5">Bạn đang làm rất tốt!</div>
                        <div className="text-xs text-gray-600">Hãy tiếp tục phát huy và chinh phục mục tiêu N400 nhé!</div>
                    </div>
                </div>
            </Card>
        </div>

        {/* Kỹ năng details */}
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800">Kỹ năng</h3>
                <div className="text-xs text-gray-400">Cập nhật gần nhất: 01/05/2024</div>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700">Ngữ pháp / Grammar</div>
                    <div className="flex-1"><ProgressBar progress={65} colorClass="bg-orange-500" /></div>
                    <div className="w-10 text-right font-bold text-gray-700">65%</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700">Nghe hiểu / Listening</div>
                    <div className="flex-1"><ProgressBar progress={75} colorClass="bg-purple-600" /></div>
                    <div className="w-10 text-right font-bold text-gray-700">75%</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700">Từ vựng / Vocabulary</div>
                    <div className="flex-1"><ProgressBar progress={60} colorClass="bg-yellow-500" /></div>
                    <div className="w-10 text-right font-bold text-gray-700">60%</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700">Viết / Writing</div>
                    <div className="flex-1"><ProgressBar progress={50} colorClass="bg-blue-600" /></div>
                    <div className="w-10 text-right font-bold text-gray-700">50%</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700">Đọc hiểu / Reading</div>
                    <div className="flex-1"><ProgressBar progress={70} colorClass="bg-teal-600" /></div>
                    <div className="w-10 text-right font-bold text-gray-700">70%</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700">Nói / Speaking</div>
                    <div className="flex-1"><ProgressBar progress={55} colorClass="bg-teal-700" /></div>
                    <div className="w-10 text-right font-bold text-gray-700">55%</div>
                </div>
            </div>
        </Card>
    </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(false);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardScreen />;
            case 'practice': return <PracticeScreen />;
            case 'statistic': return <StatisticScreen />;
            case 'categories': return <CategoriesScreen />;
            case 'bookmark': return <BookmarkScreen />;
            case 'profile': return <ProfileScreen />;
            default: return <DashboardScreen />;
        }
    };

    const activeTitle = SIDEBAR_MENU.find(item => item.id === activeTab)?.label || 'Tổng quan';

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-gray-900">

            {/* SIDEBAR */}
            <div className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20">
                <div className="p-6 flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center shadow-md">
                        <Shield size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-lg text-gray-800 leading-tight">Gamify N400</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tự tin chinh phục<br />giấc mơ Mỹ!</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 space-y-1">
                    {SIDEBAR_MENU.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${isActive
                                        ? 'bg-teal-50 text-teal-700 shadow-sm'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                    }`}
                            >
                                <item.icon size={18} className={isActive ? 'text-teal-600' : 'text-gray-400'} />
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                <div className="p-4 border-t border-gray-100 space-y-4">
                    <div className="bg-teal-50 rounded-2xl p-4 relative overflow-hidden border border-teal-100">
                        <div className="absolute top-0 right-0 opacity-20 transform translate-x-1/4 -translate-y-1/4">
                            <Award size={80} className="text-teal-600" />
                        </div>
                        <h4 className="font-bold text-teal-800 text-sm mb-1 relative z-10">Nâng cấp trải nghiệm<br />với bản Premium</h4>
                        <ul className="text-[10px] text-teal-700 space-y-1 mb-3 relative z-10">
                            <li className="flex gap-1"><CheckCircle size={12} /> Luyện tập không giới hạn</li>
                            <li className="flex gap-1"><CheckCircle size={12} /> AI giải thích chi tiết</li>
                            <li className="flex gap-1"><CheckCircle size={12} /> Theo dõi tiến độ nâng cao</li>
                        </ul>
                        <button className="w-full bg-teal-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-teal-700 relative z-10">
                            Dùng thử miễn phí
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-2 text-sm text-gray-500">
                        <span className="flex items-center gap-2"><Moon size={16} /> Chế độ tối</span>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`w-10 h-5 rounded-full p-0.5 flex items-center transition-colors ${isDarkMode ? 'bg-teal-600 justify-end' : 'bg-gray-200 justify-start'}`}
                        >
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </button>
                    </div>
                    <div className="flex items-center justify-between px-2 text-sm text-gray-500 pb-2">
                        <button className="flex items-center gap-2 hover:text-gray-800"><Settings size={16} /> Cài đặt</button>
                        <button className="flex items-center gap-2 hover:text-red-500"><LogOut size={16} /> Đăng xuất</button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* HEADER */}
                <header className="h-20 bg-slate-50/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {activeTab === 'practice' || activeTab === 'bookmark' ? (
                            <button className="text-gray-500 hover:text-gray-800"><MoreHorizontal size={24} /></button>
                        ) : null}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{activeTitle}</h2>
                            {activeTab === 'dashboard' && <p className="text-sm text-gray-500">Chào mừng trở lại! 👋</p>}
                            {activeTab === 'statistic' && <p className="text-sm text-gray-500">Theo dõi tiến độ và hiệu suất học tập của bạn</p>}
                            {activeTab === 'categories' && <p className="text-sm text-gray-500">Khám phá và học tập theo các chủ đề đa dạng, bám sát kỳ thi N400.</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {activeTab === 'statistic' && (
                            <button className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-50 shadow-sm">
                                01/05/2024 - 31/05/2024 <ChevronDown size={16} />
                            </button>
                        )}

                        <div className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm px-4 py-2 rounded-xl">
                            <Flame className="text-orange-500" size={20} />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 font-medium leading-none">Chuỗi học tập</span>
                                <span className="text-sm font-bold text-gray-800 leading-tight">7 ngày</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-50">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" className="w-full h-full" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 font-medium leading-none">Xin chào,</span>
                                <span className="text-sm font-bold text-gray-800 leading-tight">Liberty Learner!</span>
                            </div>
                            <ChevronDown size={16} className="text-gray-400 ml-2" />
                        </div>
                    </div>
                </header>

                {/* CONTENT AREA */}
                <main className="flex-1 p-8 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}