import { useOutletContext } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-charcoal mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">1. Who We Are</h2>
            <p>Manna One Solution ("we", "us", "our") is a non-attorney document preparation service headquartered at Bellaire Blvd, Houston, TX 77036. Phone: 346-852-4454. Email: Chris@mannaos.com. We are NOT a law firm and do NOT provide legal advice.</p>
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
            <h2 className="text-xl font-bold text-charcoal mb-3">4. Google Analytics & Cookies</h2>
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

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">8. Contact</h2>
            <p>Questions? Email Chris@mannaos.com or call 346-852-4454.</p>
          </section>
        </div>
      </div>
    </div>
  );
}