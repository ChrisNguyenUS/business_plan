// Every string on the public N400 Ready pages (spec §7–§8). The app's own
// dictionaries (src/lib/n400/i18n/*) belong to the cookie-language app and
// are not reused here.
import type { Locale } from '@/lib/i18n/config';

export interface FaqItem { q: string; a: string }
export interface LinkItem { label: string; href: string }

export interface PublicCopy {
  home: string;
  disclosure: string;
  ctaPrimary: string;
  ctaSecondary: string;
  landing: {
    metaTitle: string;
    metaDescription: string;
    h1: string;
    lead: string;
    modulesTitle: string;
    modules: { title: string; body: string }[];
    screenshotsTitle: string;
    screenshots: { file: string; alt: string }[];
    personalTitle: string;
    personalBody: string;
    whichTestTitle: string;
    whichTestBody: string;
    whichTestLink: LinkItem;
    seniorBody: string;
    seniorLink: LinkItem;
    fullListTitle: string;
    fullListBody: string;
    fullListLink: LinkItem;
    faqTitle: string;
    faq: FaqItem[];
  };
}

const USCIS_TEST_PAGE = 'https://www.uscis.gov/citizenship/learn-about-citizenship/the-naturalization-interview-and-test';
const USCIS_128_PDF =
  'https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf';

export const PUBLIC_COPY: Record<Locale, PublicCopy> = {
  vi: {
    home: 'Trang chủ',
    disclosure:
      'Manna One Solution không phải hãng luật và không tư vấn pháp lý. N400 Ready không liên kết với USCIS hay chính phủ Mỹ. Danh sách câu hỏi chính thức trên uscis.gov là chuẩn.',
    ctaPrimary: 'Bắt đầu miễn phí',
    ctaSecondary: 'Đã có tài khoản? Đăng nhập',
    landing: {
      metaTitle: 'N400 Ready: luyện thi quốc tịch Mỹ miễn phí bằng tiếng Việt',
      metaDescription:
        'Luyện thi quốc tịch Mỹ miễn phí: 128 câu hỏi công dân bộ 2025, nói, viết và phỏng vấn thử, song ngữ Việt–Anh, trên điện thoại hoặc máy tính.',
      h1: 'N400 Ready — luyện thi quốc tịch Mỹ miễn phí bằng tiếng Việt',
      lead:
        'N400 Ready là ứng dụng miễn phí của Manna One Solution giúp bạn chuẩn bị cho buổi phỏng vấn quốc tịch Mỹ (đơn N-400). Bạn luyện 128 câu hỏi công dân của bài thi 2025, luyện nói, luyện viết và làm phỏng vấn thử, bằng tiếng Việt và tiếng Anh, trên điện thoại hoặc máy tính.',
      modulesTitle: 'Luyện những gì',
      modules: [
        { title: 'Câu hỏi công dân (Civics)', body: '128 câu hỏi của bài thi 2025, có dịch tiếng Việt, nghe phát âm, thẻ ghi nhớ và ôn lại câu sai.' },
        { title: 'Luyện nói', body: 'Các câu hỏi Yes/No trong đơn N-400 và các câu “What does … mean?” mà nhân viên thường hỏi.' },
        { title: 'Luyện viết', body: 'Nghe một câu tiếng Anh rồi viết lại, giống phần thi viết.' },
        { title: 'Trả lời bằng giọng nói', body: 'Nói câu trả lời và được chấm ngay, như khi trả lời nhân viên USCIS.' },
        { title: 'Thi thử', body: 'Thi thử Civics, Viết, Nói, hoặc cả buổi phỏng vấn đầy đủ.' },
      ],
      screenshotsTitle: 'Giao diện ứng dụng',
      screenshots: [
        { file: '/images/n400/public/vi-civics-practice.png', alt: 'Màn hình luyện câu hỏi công dân trong N400 Ready' },
        { file: '/images/n400/public/vi-state-answers.png', alt: 'Màn hình đáp án theo tiểu bang trong N400 Ready' },
      ],
      personalTitle: 'Đáp án theo nơi bạn sống',
      personalBody:
        'Bốn câu trong bộ 128 câu có đáp án khác nhau tùy nơi bạn sống: thượng nghị sĩ (câu 23), dân biểu Hạ viện (câu 29), thống đốc (câu 61) và thủ phủ tiểu bang (câu 62). Khi bạn nhập địa chỉ, N400 Ready tự điền đáp án cho tiểu bang và khu bầu cử của bạn.',
      whichTestTitle: 'Thi bài 2025 hay 2008? Trên 65 tuổi?',
      whichTestBody:
        'Người nộp đơn N-400 từ ngày 20/10/2025 thi bài 2025 với bộ 128 câu; người nộp trước ngày đó thi bài 2008.',
      whichTestLink: { label: 'Thi quốc tịch Mỹ: toàn bộ quy trình', href: '/vi/blog/thi-quoc-tich-my' },
      seniorBody:
        'Từ 65 tuổi và có thẻ xanh từ 20 năm trở lên? Bạn có thể được thi bằng tiếng Việt với bộ câu hỏi ngắn hơn.',
      seniorLink: { label: 'Thi quốc tịch Mỹ cho người trên 65 tuổi', href: '/vi/blog/thi-quoc-tich-my-cho-nguoi-tren-65-tuoi' },
      fullListTitle: 'Danh sách đầy đủ 128 câu',
      fullListBody: 'Xem đủ 128 câu hỏi kèm đáp án chính thức của USCIS và bản dịch tiếng Việt.',
      fullListLink: { label: '128 câu hỏi thi quốc tịch Mỹ bằng tiếng Việt', href: '/vi/blog/128-cau-hoi-thi-quoc-tich-my' },
      faqTitle: 'Câu hỏi thường gặp',
      faq: [
        { q: 'N400 Ready có thật sự miễn phí không?', a: 'Có. Bạn tạo tài khoản và dùng mọi phần luyện tập mà không phải trả tiền.' },
        {
          q: 'Tôi không giỏi tiếng Anh, có dùng được không?',
          a: 'Được. Mọi câu hỏi đều có bản dịch tiếng Việt và phát âm tiếng Anh để bạn nghe theo. Bạn có thể chuyển giao diện giữa tiếng Việt và tiếng Anh bất cứ lúc nào.',
        },
        { q: 'Dùng trên điện thoại được không?', a: 'Được. N400 Ready chạy trong trình duyệt của điện thoại và máy tính, không cần cài đặt.' },
        {
          q: 'Đáp án theo tiểu bang lấy từ đâu?',
          a: 'Từ danh sách thượng nghị sĩ, dân biểu và thống đốc đương nhiệm, có ghi ngày kiểm tra. Hãy trả lời theo người đang giữ chức vào ngày phỏng vấn; khi có khác biệt, trang uscis.gov/citizenship/testupdates là chuẩn.',
        },
        { q: 'N400 Ready có phải của USCIS không?', a: 'Không. N400 Ready do Manna One Solution làm ra và không liên kết với USCIS hay chính phủ Mỹ.' },
        {
          q: 'N400 Ready có tư vấn pháp lý không?',
          a: 'Không. Manna One Solution không phải hãng luật và không tư vấn pháp lý. Với câu hỏi về hồ sơ riêng của bạn, hãy hỏi luật sư di trú có giấy phép.',
        },
      ],
    },
  },
  en: {
    home: 'Home',
    disclosure:
      'Manna One Solution is not a law firm and does not give legal advice. N400 Ready is not affiliated with USCIS or the U.S. government. The official question list on uscis.gov is the standard.',
    ctaPrimary: 'Start free',
    ctaSecondary: 'Have an account? Sign in',
    landing: {
      metaTitle: 'N400 Ready: free U.S. citizenship test practice (Vietnamese & English)',
      metaDescription:
        'Free U.S. citizenship test practice: the 128 questions of the 2025 civics test, speaking, writing and mock interviews, in English and Vietnamese.',
      h1: 'N400 Ready — free U.S. citizenship test practice in English and Vietnamese',
      lead:
        'N400 Ready is a free app from Manna One Solution that helps you prepare for your U.S. naturalization interview (Form N-400). Practice the 128 questions of the 2025 civics test, speaking, writing and full mock interviews, in English and Vietnamese, on your phone or computer.',
      modulesTitle: 'What you can practice',
      modules: [
        { title: 'Civics questions', body: 'All 128 questions of the 2025 test, with Vietnamese translations, audio, flashcards and review of missed questions.' },
        { title: 'Speaking', body: 'The N-400 yes/no questions and the “What does … mean?” questions officers often ask.' },
        { title: 'Writing', body: 'Listen to an English sentence and write it down, like the writing test.' },
        { title: 'Answer out loud', body: 'Say your answer and get graded right away, as you would with a USCIS officer.' },
        { title: 'Mock tests', body: 'Practice tests for civics, writing, speaking, or the full interview.' },
      ],
      screenshotsTitle: 'Inside the app',
      screenshots: [
        { file: '/images/n400/public/en-civics-practice.png', alt: 'Civics practice screen in N400 Ready' },
        { file: '/images/n400/public/en-state-answers.png', alt: 'State-specific answers screen in N400 Ready' },
      ],
      personalTitle: 'Answers for where you live',
      personalBody:
        'Four of the 128 questions depend on where you live: your U.S. senators (question 23), your representative (29), your governor (61) and your state capital (62). Enter your address and N400 Ready fills in the answers for your state and congressional district.',
      whichTestTitle: '2025 or 2008 test? Over 65?',
      whichTestBody:
        'Applicants who file Form N-400 on or after October 20, 2025 take the 2025 test with 128 questions; earlier filings take the 2008 test.',
      whichTestLink: { label: 'USCIS: the naturalization interview and test', href: USCIS_TEST_PAGE },
      seniorBody:
        'Age 65 or older with a green card for 20 years or more? You may be able to take the civics test in your own language with a shorter question set.',
      seniorLink: { label: 'USCIS: exceptions and accommodations', href: USCIS_TEST_PAGE },
      fullListTitle: 'The full list of 128 questions',
      fullListBody: 'Read all 128 questions with the official USCIS answers.',
      fullListLink: { label: 'USCIS 2025 civics test questions (PDF)', href: USCIS_128_PDF },
      faqTitle: 'Frequently asked questions',
      faq: [
        { q: 'Is N400 Ready really free?', a: 'Yes. You create an account and use every practice section without paying.' },
        {
          q: 'My English is not strong. Can I still use it?',
          a: 'Yes. Every question has a Vietnamese translation and English audio to listen to. You can switch the app between English and Vietnamese at any time.',
        },
        { q: 'Does it work on a phone?', a: 'Yes. N400 Ready runs in the browser on phones and computers, with nothing to install.' },
        {
          q: 'Where do the state answers come from?',
          a: 'From the lists of current senators, representatives and governors, with the date they were checked. Answer with whoever holds the office on your interview day; if anything differs, uscis.gov/citizenship/testupdates is the standard.',
        },
        { q: 'Is N400 Ready made by USCIS?', a: 'No. N400 Ready is made by Manna One Solution and is not affiliated with USCIS or the U.S. government.' },
        {
          q: 'Does N400 Ready give legal advice?',
          a: 'No. Manna One Solution is not a law firm and does not give legal advice. For questions about your own case, ask a licensed immigration attorney.',
        },
      ],
    },
  },
};

export function ctaHref(locale: Locale): string {
  return `/n400ready/login?lang=${locale}`;
}
