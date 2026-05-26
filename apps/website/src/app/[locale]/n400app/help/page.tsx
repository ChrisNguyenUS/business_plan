// Help page — bilingual FAQ stub + contact placeholder. Lives outside the
// auth gate so prospective users can read it before signing up. Wait — it's
// under /n400app, which the middleware gates whole-route. The dashboard's
// "Trợ giúp" link is the primary entry point for now (signed-in users only).
// If we decide to make this public later, we'll need to whitelist /n400app/help
// in the middleware route guard.

import Link from 'next/link'
import { Card } from '@/components/n400/ui'

const FAQS = [
  {
    q_vi: 'Bài thi quốc tịch N-400 là gì?',
    q_en: 'What is the N-400 civics test?',
    a_vi: 'Đây là bài thi kiến thức công dân do USCIS tổ chức trong buổi phỏng vấn xin nhập tịch. Bạn cần trả lời đúng 12 trong 20 câu hỏi để đạt.',
    a_en: 'This is a civics knowledge test administered by USCIS during the naturalization interview. You need to answer 12 out of 20 questions correctly to pass.',
  },
  {
    q_vi: 'App này hoạt động như thế nào?',
    q_en: 'How does this app work?',
    a_vi: 'App có 4 chế độ học: Thi Thử (giả lập phỏng vấn thật), Luyện Tập hàng ngày, Thẻ Ghi Nhớ, và Xem Tất Cả 128 câu. Tất cả câu hỏi và đáp án đều song ngữ Anh-Việt với audio phát âm.',
    a_en: 'The app has 4 study modes: Mock Test (simulates the real interview), Daily Practice, Flashcards, and View All 128 questions. All questions and answers are bilingual EN/VI with pronunciation audio.',
  },
  {
    q_vi: 'Tại sao cần địa chỉ của tôi?',
    q_en: 'Why do you need my address?',
    a_vi: 'Một số câu hỏi (Hạ nghị sĩ, Thượng nghị sĩ, Thống đốc, thủ phủ tiểu bang) phụ thuộc vào nơi bạn sống. App dùng địa chỉ để xác định khu vực bầu cử của bạn — địa chỉ chính xác KHÔNG được lưu trên hệ thống.',
    a_en: 'A few questions (your U.S. Representative, Senators, Governor, state capital) depend on where you live. We use your address to look up your congressional district — the full street address is NOT stored on our servers.',
  },
  {
    q_vi: 'Tôi cần hỗ trợ hoặc muốn nộp đơn N-400?',
    q_en: 'Need help or want to file your N-400?',
    a_vi: 'Liên hệ Manna One Solution để được tư vấn và hỗ trợ nộp đơn N-400.',
    a_en: 'Contact Manna One Solution for N-400 filing assistance and consultation.',
  },
] as const

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/n400app" className="text-sm text-gray-500 hover:text-teal-600 hover:underline">
          ← Về trang chủ / Home
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-1">Trợ Giúp</h1>
      <p className="text-base text-gray-500 mb-8">Help &amp; FAQ</p>

      <div className="space-y-4">
        {FAQS.map((faq, i) => (
          <Card key={i}>
            <p className="font-semibold text-base mb-1">{faq.q_vi}</p>
            <p className="text-sm text-gray-500 mb-3">{faq.q_en}</p>
            <p className="text-base text-gray-800">{faq.a_vi}</p>
            <p className="text-sm text-gray-500 mt-1">{faq.a_en}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card className="bg-teal-50 border-teal-100">
          <p className="font-semibold text-base mb-1">Liên hệ / Contact</p>
          <p className="text-sm text-gray-500 mb-4">Manna One Solution</p>
          {/* TODO(phase-9-launch): replace with real contact info */}
          <p className="text-base text-gray-800">📞 [Số điện thoại / Phone number]</p>
          <p className="text-base text-gray-800">📧 [Email]</p>
          <p className="text-base text-gray-800">📍 Houston, TX</p>
        </Card>
      </div>
    </div>
  )
}
