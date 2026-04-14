export default function Home({ params }: { params: { locale: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-hero-gradient">
      <h1 className="text-4xl font-bold text-white">MannaOS.com</h1>
      <p className="mt-4 text-text-secondary">
        {params.locale === "vi" ? "Đang xây dựng…" : "Phase 1A — Coming soon"}
      </p>
      <div className="mt-8 flex gap-4">
        <button className="rounded-lg bg-accent-gradient px-6 py-3 font-semibold text-white transition hover:scale-105">
          {params.locale === "vi" ? "Đặt lịch miễn phí" : "Book Free Consultation"}
        </button>
        <button className="rounded-lg border border-white/20 px-6 py-3 font-semibold text-white transition hover:border-white/40">
          {params.locale === "vi" ? "Dịch Vụ Của Chúng Tôi" : "Our Services"}
        </button>
      </div>
    </main>
  );
}
