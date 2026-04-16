const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  FileText, Clock, CheckCircle, Phone, Plus, Briefcase,
  ChevronRight, AlertCircle, Info, Calendar, Hash, ArrowRight
} from 'lucide-react';

const CASE_STATUS_CONFIG = {
  'intake':            { label: 'Intake',             color: 'bg-gray-100 text-gray-700',     dot: 'bg-gray-400' },
  'docs-pending':      { label: 'Documents Pending',  color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  'prep-in-progress':  { label: 'Prep In Progress',   color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  'ready-to-file':     { label: 'Ready to File',      color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  'filed-with-uscis':  { label: 'Filed with USCIS',   color: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-500' },
  'noa-received':      { label: 'NOA Received',        color: 'bg-cyan-100 text-cyan-700',     dot: 'bg-cyan-500' },
  'case-update':       { label: 'Case Update',         color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  'completed':         { label: 'Completed ✓',         color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  'referred-out':      { label: 'Referred Out',        color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  'cancelled':         { label: 'Cancelled',           color: 'bg-red-100 text-red-700',       dot: 'bg-red-400' },
};

const FORM_LABELS = {
  'I-90': 'I-90 Green Card Renewal',
  'I-130': 'I-130 Family Petition',
  'I-485': 'I-485 Adjustment of Status',
  'I-751': 'I-751 Remove Conditions',
  'I-765': 'I-765 Work Permit (EAD)',
  'I-131': 'I-131 Travel Document',
  'N-400': 'N-400 Naturalization / Citizenship',
  'N-600': 'N-600 Certificate of Citizenship',
  'I-864': 'I-864 Affidavit of Support',
  'I-912': 'I-912 Fee Waiver',
  'AR-11': 'AR-11 Change of Address',
  'FOIA': 'FOIA Request',
  'TRANSLATION': 'Certified Translation',
};

const BUNDLE_LABELS = {
  'marriage-gc': 'Marriage Green Card Package',
  'family-petition-consular': 'Family Petition — Consular',
  'citizenship-fast-track': 'Citizenship Fast-Track',
  'gc-renewal-travel-doc': 'Green Card Renewal + Travel Doc',
  'remove-conditions-ead': 'Remove Conditions + Work Permit',
};

const PAYMENT_CONFIG = {
  quoted:   { label: 'Quoted',   color: 'text-gray-500' },
  invoiced: { label: 'Invoiced', color: 'text-amber-600' },
  paid:     { label: 'Paid ✓',   color: 'text-green-600' },
  refunded: { label: 'Refunded', color: 'text-red-500' },
};

export default function Portal() {
  const [cases, setCases] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeCase, setActiveCase] = useState(null);
  const [tab, setTab] = useState('cases');

  useEffect(() => {
    async function load() {
      const me = await db.auth.me();
      setUser(me);
      const [caseData, subData] = await Promise.all([
        db.entities.Case.filter({ client_email: me.email }, '-created_date'),
        db.entities.ContactSubmission.filter({ created_by: me.email }, '-created_date'),
      ]);
      setCases(caseData);
      setSubmissions(subData);
      setLoading(false);
    }
    load();
  }, []);

  function getCaseLabel(c) {
    if (c.case_type === 'bundle') return BUNDLE_LABELS[c.bundle_code] || c.bundle_code;
    return FORM_LABELS[c.form_code] || c.form_code;
  }

  const activeCases = cases.filter(c => !['completed', 'cancelled', 'referred-out'].includes(c.current_status));
  const closedCases = cases.filter(c => ['completed', 'cancelled', 'referred-out'].includes(c.current_status));

  return (
    <div className="py-16 lg:py-24 min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-charcoal">My Portal</h1>
            {user && (
              <p className="text-muted-foreground mt-1">
                Welcome back, <span className="font-medium text-charcoal">{user.full_name || user.email}</span>
              </p>
            )}
          </div>
          <Link to="/contact">
            <Button className="bg-primary hover:bg-teal-dark text-white rounded-full gap-2">
              <Plus className="h-4 w-4" />
              New Inquiry
            </Button>
          </Link>
        </div>

        {/* Informational note */}
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3 text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
          <span>Case status is updated by the Manna One Solution team. For urgent inquiries, call <a href="tel:3468524454" className="underline font-medium">346-852-4454</a>. Status shown is for informational purposes and does not substitute for official USCIS.gov checks.</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setTab('cases')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'cases' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-charcoal'}`}
          >
            Cases {cases.length > 0 && `(${cases.length})`}
          </button>
          <button
            onClick={() => setTab('submissions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'submissions' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-charcoal'}`}
          >
            Inquiries {submissions.length > 0 && `(${submissions.length})`}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tab === 'cases' ? (
          <>
            {cases.length === 0 ? (
              <EmptyState icon={Briefcase} title="No cases yet" desc="Cases are created by the Manna One Solution team after your consultation." ctaLabel="Book a Free Consultation" ctaTo="/contact" />
            ) : (
              <>
                {activeCases.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active Cases ({activeCases.length})</h2>
                    <div className="space-y-3">
                      {activeCases.map(c => (
                        <CaseCard key={c.id} c={c} getCaseLabel={getCaseLabel} onOpen={() => setActiveCase(c)} />
                      ))}
                    </div>
                  </div>
                )}
                {closedCases.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Closed Cases ({closedCases.length})</h2>
                    <div className="space-y-3">
                      {closedCases.map(c => (
                        <CaseCard key={c.id} c={c} getCaseLabel={getCaseLabel} onOpen={() => setActiveCase(c)} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {submissions.length === 0 ? (
              <EmptyState icon={FileText} title="No inquiries yet" desc="Your contact form submissions will appear here." ctaLabel="Submit an Inquiry" ctaTo="/contact" />
            ) : (
              <div className="space-y-3">
                {submissions.map(s => (
                  <SubmissionCard key={s.id} s={s} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Case Detail Drawer */}
      {activeCase && (
        <CaseDetailModal c={activeCase} getCaseLabel={getCaseLabel} onClose={() => setActiveCase(null)} />
      )}
    </div>
  );
}

function CaseCard({ c, getCaseLabel, onOpen }) {
  const status = CASE_STATUS_CONFIG[c.current_status] || { label: c.current_status, color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
  const payment = PAYMENT_CONFIG[c.payment_status];
  const totalCents = (c.service_fee_cents || 0) + (c.uscis_fee_cents || 0);

  return (
    <button onClick={onOpen} className="w-full text-left bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-semibold text-charcoal">{getCaseLabel(c)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {c.case_type === 'bundle' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Bundle</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {c.uscis_receipt_number && (
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span className="font-mono">{c.uscis_receipt_number}</span>
              </span>
            )}
            {totalCents > 0 && (
              <span>${(totalCents / 100).toLocaleString()} total</span>
            )}
            {payment && (
              <span className={`font-medium ${payment.color}`}>{payment.label}</span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(c.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
    </button>
  );
}

function CaseDetailModal({ c, getCaseLabel, onClose }) {
  const status = CASE_STATUS_CONFIG[c.current_status] || { label: c.current_status, color: 'bg-gray-100 text-gray-700' };
  const payment = PAYMENT_CONFIG[c.payment_status];

  const PIPELINE = [
    'intake', 'docs-pending', 'prep-in-progress', 'ready-to-file',
    'filed-with-uscis', 'noa-received', 'case-update', 'completed'
  ];
  const currentIdx = PIPELINE.indexOf(c.current_status);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-charcoal">{getCaseLabel(c)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-charcoal text-xl leading-none mt-1">×</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Status pipeline */}
          {!['cancelled', 'referred-out'].includes(c.current_status) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Progress</p>
              <div className="flex gap-1 flex-wrap">
                {PIPELINE.map((step, idx) => {
                  const cfg = CASE_STATUS_CONFIG[step];
                  const done = idx <= currentIdx;
                  return (
                    <div key={step} className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full transition-colors ${done ? cfg.dot : 'bg-gray-200'}`} title={cfg.label} />
                      {idx < PIPELINE.length - 1 && <div className={`h-px w-4 ${done && idx < currentIdx ? 'bg-primary' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{CASE_STATUS_CONFIG[c.current_status]?.label}</p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            {c.uscis_receipt_number && (
              <DetailRow label="Receipt Number" value={<span className="font-mono text-sm">{c.uscis_receipt_number}</span>} />
            )}
            {c.priority_date && (
              <DetailRow label="Priority Date" value={c.priority_date} />
            )}
            {c.filed_at && (
              <DetailRow label="Filed With USCIS" value={new Date(c.filed_at).toLocaleDateString()} />
            )}
            <DetailRow label="Opened" value={new Date(c.created_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
          </div>

          {/* Fees */}
          {(c.service_fee_cents || c.uscis_fee_cents) && (
            <div className="rounded-xl bg-teal-light/50 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fees</p>
              {c.service_fee_cents && <DetailRow label="Service Fee" value={`$${(c.service_fee_cents / 100).toLocaleString()}`} />}
              {c.uscis_fee_cents && <DetailRow label="USCIS Filing Fee" value={`$${(c.uscis_fee_cents / 100).toLocaleString()}`} />}
              {c.service_fee_cents && c.uscis_fee_cents && (
                <DetailRow label="Total" value={<span className="font-bold text-charcoal">${((c.service_fee_cents + c.uscis_fee_cents) / 100).toLocaleString()}</span>} />
              )}
              {payment && (
                <DetailRow label="Payment Status" value={<span className={`font-semibold ${payment.color}`}>{payment.label}</span>} />
              )}
            </div>
          )}

          {/* Track on USCIS */}
          {c.uscis_receipt_number && (
            <a
              href={`https://egov.uscis.gov/casestatus/mycasestatus.do`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowRight className="h-4 w-4" />
              Check status on USCIS.gov
            </a>
          )}

          {/* Help */}
          <div className="pt-2 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-3">Questions about your case?</p>
            <a href="tel:3468524454">
              <Button variant="outline" size="sm" className="rounded-full gap-2">
                <Phone className="h-3.5 w-3.5" />
                Call 346-852-4454
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-charcoal text-right">{value}</span>
    </div>
  );
}

function SubmissionCard({ s }) {
  const SERVICE_LABELS = { tax: 'Tax & Business', insurance: 'Insurance & Finance', immigration: 'Immigration', ai: 'AI / Automation', general: 'General' };
  const STATUS_COLORS = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-amber-100 text-amber-700', resolved: 'bg-green-100 text-green-700' };
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-charcoal">{SERVICE_LABELS[s.service_type] || s.service_type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
          </div>
          <p className="text-muted-foreground text-sm line-clamp-2">{s.message}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(s.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, ctaLabel, ctaTo }) {
  return (
    <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-white">
      <Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="font-semibold text-charcoal mb-1">{title}</p>
      <p className="text-muted-foreground text-sm mb-5">{desc}</p>
      <Link to={ctaTo}>
        <Button variant="outline" className="rounded-full">{ctaLabel}</Button>
      </Link>
    </div>
  );
}