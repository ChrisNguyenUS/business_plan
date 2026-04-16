export default function TermsOfService() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-charcoal mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">1. Non-Attorney Document Preparer Disclosure</h2>
            <p className="font-semibold text-charcoal">IMPORTANT: Manna One Solution is a non-attorney document preparation service. We are NOT a law firm and do NOT provide legal advice, legal counsel, or legal representation.</p>
            <p className="mt-2">We help clients prepare and organize USCIS immigration forms at the client's direction. We do NOT:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li>Provide legal advice or case strategy recommendations</li>
              <li>File Form G-28 or appear as a representative before USCIS</li>
              <li>Represent clients at USCIS interviews</li>
              <li>Handle Requests for Evidence (RFEs), Notices of Intent to Deny (NOIDs), or appeals</li>
              <li>Handle inadmissibility determinations, waivers, or removal proceedings</li>
            </ul>
            <p className="mt-2">For cases involving the above, clients will be referred to a licensed immigration attorney or accredited legal aid organization.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">2. Geographic Scope</h2>
            <p>Immigration document preparation services are available to <strong>Texas residents only</strong>. Tax, insurance, and AI services may have different scope — see individual service pages for details.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">3. Fees & Pricing</h2>
            <p>Service fees are flat and quoted before engagement. USCIS filing fees are paid directly to USCIS and are subject to change by USCIS. We will quote the current USCIS fee before filing. No refunds on USCIS filing fees once submitted to USCIS.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">4. Client Responsibilities</h2>
            <p>Clients are responsible for the accuracy and completeness of information they provide. Manna One Solution prepares forms based on information supplied by the client. We are not responsible for errors resulting from inaccurate client-supplied information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">5. Limitation of Liability</h2>
            <p>Manna One Solution's liability is limited to the service fees paid. We are not liable for USCIS decisions, processing delays, or case outcomes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">6. Governing Law</h2>
            <p>These terms are governed by the laws of the State of Texas. Disputes will be resolved in Harris County, Texas.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-charcoal mb-3">7. Contact</h2>
            <p>Manna One Solution · Bellaire Blvd, Houston, TX 77036 · 346-852-4454 · Chris@mannaos.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}