export async function generateMetadata() {
  return { title: "Privacy Policy", alternates: { languages: { en: "/en/privacy-policy", vi: "/vi/privacy-policy" } } };
}

export default function PrivacyPolicyPage() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-charcoal mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: September 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">1. Who We Are</h2>
            <p>Manna One Solution (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a non-attorney document preparation service headquartered at Bellaire Blvd, Houston, TX 77036. Phone: 346-852-4454. Email: Chris@mannaos.com. We are NOT a law firm and do NOT provide legal advice.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">2. Information We Collect</h2>
            <p>We collect information you provide through our contact form and booking system, including: full name, phone number, email address, service interest, and message content. We also collect analytics data (via Google Analytics 4) and UTM parameters from advertising campaigns.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">3. How We Use Your Information</h2>
            <p>We use your information to respond to inquiries, schedule consultations, provide document preparation services, send service-related communications, and improve our website. We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">4. Google Analytics &amp; Cookies</h2>
            <p>We use Google Analytics 4 to understand how visitors use our site. This uses cookies. You can opt out via your browser settings or the Google Analytics opt-out browser add-on. We also use the Meta (Facebook) Pixel for advertising measurement.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">5. Data Retention</h2>
            <p>Contact form submissions and client documents are retained for 7 years in accordance with recommended record retention practices. You may request deletion of your data by contacting us at Chris@mannaos.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">6. Your Rights (CCPA / GDPR)</h2>
            <p>California and EU residents have the right to access, correct, or delete their personal data. Contact us at Chris@mannaos.com to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">7. SMS Communications</h2>
            <p>If you opt into SMS communications, standard message and data rates may apply. You may opt out at any time by replying STOP. We comply with TCPA regulations.</p>
          </section>

          <section id="voice-answers">
            <h2 className="text-xl font-bold text-charcoal mb-3">8. Voice Answers in N400Ready</h2>
            <p>N400Ready lets you answer civics questions by voice. Your speech is converted to text by your browser&apos;s built-in speech recognition service (for example, Apple on Safari or Google on Chrome). Depending on your browser and device, that speech service may process audio on its own servers under its own privacy policy. N400Ready does not record or store your audio.</p>
            <p>For mock tests, N400Ready stores the text of each answer so we can grade the test and show you your results. A small sample of answer text may be reviewed by our team to improve answer recognition. For practice, we store only whether your answer was correct.</p>
            <p>On iPhone and iPad, voice-answer mode may keep the microphone active between questions so the browser&apos;s speech recognition service can continue processing speech. N400Ready uses the speech input for the active answer and does not save the underlying audio. The microphone automatically turns off after 5 minutes without a voice answer or when you leave N400Ready. You can always answer using multiple choice instead.</p>
            <p lang="vi">N400Ready cho phép bạn trả lời câu hỏi công dân bằng giọng nói. Giọng nói của bạn được chuyển thành văn bản bởi dịch vụ nhận dạng giọng nói tích hợp trong trình duyệt (ví dụ Apple trên Safari hoặc Google trên Chrome). Tùy trình duyệt và thiết bị, dịch vụ nhận dạng giọng nói này có thể xử lý âm thanh trên máy chủ của họ theo chính sách quyền riêng tư riêng của họ. N400Ready không ghi âm hoặc lưu trữ âm thanh của bạn.</p>
            <p lang="vi">Với bài thi thử, N400Ready lưu phần văn bản của từng câu trả lời để chấm bài và hiển thị kết quả cho bạn. Một phần nhỏ nội dung câu trả lời có thể được nhóm của chúng tôi xem xét để cải thiện khả năng nhận diện câu trả lời. Với phần luyện tập, chúng tôi chỉ lưu thông tin câu trả lời đúng hay sai.</p>
            <p lang="vi">Trên iPhone và iPad, chế độ trả lời bằng giọng nói có thể giữ microphone hoạt động giữa các câu hỏi để dịch vụ nhận dạng giọng nói của trình duyệt tiếp tục xử lý lời nói. N400Ready chỉ sử dụng dữ liệu lời nói cho câu trả lời đang thực hiện và không lưu lại bản ghi âm. Microphone tự động tắt sau 5 phút không có câu trả lời bằng giọng nói hoặc khi bạn rời N400Ready. Bạn luôn có thể chọn trả lời bằng hình thức trắc nghiệm.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">9. Contact</h2>
            <p>Questions? Email Chris@mannaos.com or call 346-852-4454.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
