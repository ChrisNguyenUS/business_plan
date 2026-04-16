"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Briefcase, MessageSquare, AlertCircle, Calendar, ExternalLink, ChevronRight, FileText } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

interface Case {
  id: string;
  client_name: string;
  service_type: string;
  form_codes: string | null;
  status: string;
  payment_status: string;
  uscis_receipt: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Submission {
  id: string;
  full_name: string;
  service_type: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  intake: { color: "bg-blue-100 text-blue-700", label: "Intake" },
  documents_requested: { color: "bg-yellow-100 text-yellow-700", label: "Documents Requested" },
  in_progress: { color: "bg-purple-100 text-purple-700", label: "In Progress" },
  submitted_to_uscis: { color: "bg-indigo-100 text-indigo-700", label: "Submitted to USCIS" },
  awaiting_response: { color: "bg-orange-100 text-orange-700", label: "Awaiting Response" },
  completed: { color: "bg-green-100 text-green-700", label: "Completed" },
  on_hold: { color: "bg-gray-100 text-gray-700", label: "On Hold" },
};

const PAYMENT_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: "text-yellow-600", label: "Payment Pending" },
  partial: { color: "text-orange-600", label: "Partial Payment" },
  paid: { color: "text-green-600", label: "Paid" },
  waived: { color: "text-gray-500", label: "Waived" },
};

export default function PortalPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { user, profile } = useAuth();

  const [tab, setTab] = useState<"cases" | "inquiries">("cases");
  const [cases, setCases] = useState<Case[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    // Load cases for this user
    const { data: casesData } = await supabase
      .from("cases")
      .select("*")
      .eq("client_user_id", user.id)
      .order("updated_at", { ascending: false });

    // Load submissions by this user's email
    const { data: subData } = await supabase
      .from("contact_submissions")
      .select("*")
      .eq("email", user.email)
      .order("created_at", { ascending: false });

    setCases(casesData || []);
    setSubmissions(subData || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const displayName = profile?.full_name || user?.email || "";

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-charcoal mb-1">My Portal</h1>
        <p className="text-muted-foreground mb-6">
          Welcome back, <span className="font-semibold text-charcoal">{displayName}</span>
        </p>

        {/* Info Banner */}
        <div className="bg-teal-light border border-primary/20 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {locale === "vi"
              ? "Đây là cổng thông tin theo dõi hồ sơ. Mọi cập nhật mới sẽ hiển thị ở đây."
              : "Track your active cases and inquiries here. All updates will appear below."}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted mb-8">
          <button
            onClick={() => setTab("cases")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "cases" ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Cases ({cases.length})
          </button>
          <button
            onClick={() => setTab("inquiries")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "inquiries" ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Inquiries ({submissions.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tab === "cases" ? (
          /* Cases Tab */
          cases.length > 0 ? (
            <div className="space-y-4">
              {cases.map((c) => {
                const st = STATUS_CONFIG[c.status] || { color: "bg-gray-100 text-gray-700", label: c.status };
                const pay = PAYMENT_STATUS[c.payment_status] || { color: "text-gray-500", label: c.payment_status };
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className="w-full text-left bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                        {st.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-charcoal mb-1">{c.service_type}</h3>
                    {c.form_codes && (
                      <p className="text-muted-foreground text-sm flex items-center gap-1 mb-1">
                        <FileText className="h-3.5 w-3.5" /> {c.form_codes}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className={pay.color}>{pay.label}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState locale={locale} />
          )
        ) : (
          /* Inquiries Tab */
          submissions.length > 0 ? (
            <div className="space-y-4">
              {submissions.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-border p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {s.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal font-medium">{s.service_type || "General"}</p>
                  {s.message && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.message}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState locale={locale} />
          )
        )}

        {/* Case Detail Modal */}
        {selectedCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedCase(null)}>
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-charcoal">Case Details</h2>
                <button onClick={() => setSelectedCase(null)} className="text-muted-foreground hover:text-charcoal text-xl">✕</button>
              </div>

              <div className="space-y-4">
                <DetailRow label="Service" value={selectedCase.service_type} />
                <DetailRow label="Form Codes" value={selectedCase.form_codes} />
                <DetailRow label="Status" value={STATUS_CONFIG[selectedCase.status]?.label || selectedCase.status} />
                <DetailRow label="Payment" value={PAYMENT_STATUS[selectedCase.payment_status]?.label || selectedCase.payment_status} />
                <DetailRow label="USCIS Receipt" value={selectedCase.uscis_receipt} />
                <DetailRow label="Notes" value={selectedCase.notes} />
                <DetailRow label="Last Updated" value={new Date(selectedCase.updated_at).toLocaleString()} />

                {selectedCase.uscis_receipt && (
                  <a
                    href={`https://egov.uscis.gov/casestatus/mycasestatus.do`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Check USCIS Status
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase">{label}</p>
      <p className="text-sm text-charcoal">{value}</p>
    </div>
  );
}

function EmptyState({ locale }: { locale: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center mx-auto mb-4">
        <Briefcase className="h-7 w-7 text-primary" />
      </div>
      <h3 className="font-semibold text-charcoal mb-2">
        {locale === "vi" ? "Chưa có dữ liệu" : "Nothing here yet"}
      </h3>
      <p className="text-muted-foreground text-sm mb-4">
        {locale === "vi"
          ? "Liên hệ chúng tôi để bắt đầu."
          : "Contact us to get started with your case."}
      </p>
      <Link
        href={`/${locale}/contact`}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors"
      >
        <Calendar className="h-4 w-4" />
        Book a Free Consultation
      </Link>
    </div>
  );
}
