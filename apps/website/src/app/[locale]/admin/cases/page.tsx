"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, X, Calendar, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Case {
  id: string;
  client_name: string;
  client_user_id: string | null;
  service_type: string;
  form_codes: string | null;
  bundle_codes: string | null;
  status: string;
  payment_status: string;
  total_fee: number | null;
  paid_amount: number | null;
  uscis_receipt: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = ["intake", "documents_requested", "in_progress", "submitted_to_uscis", "awaiting_response", "completed", "on_hold"];
const PAYMENT_OPTIONS = ["pending", "partial", "paid", "waived"];
const SERVICE_TYPES = ["Tax & Business", "Insurance & Finance", "Immigration", "AI / Automation"];

const EMPTY_CASE: Partial<Case> = {
  client_name: "", service_type: "Immigration", form_codes: "", bundle_codes: "", status: "intake",
  payment_status: "pending", total_fee: 0, paid_amount: 0, uscis_receipt: "", notes: "",
};

export default function AdminCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Case> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("cases").select("*").order("updated_at", { ascending: false });
    setCases(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = cases.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.form_codes || "").toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_COLORS: Record<string, string> = {
    intake: "bg-blue-100 text-blue-700",
    documents_requested: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-purple-100 text-purple-700",
    submitted_to_uscis: "bg-indigo-100 text-indigo-700",
    awaiting_response: "bg-orange-100 text-orange-700",
    completed: "bg-green-100 text-green-700",
    on_hold: "bg-gray-100 text-gray-700",
  };

  async function saveCase() {
    if (!editing) return;
    setSaving(true);
    const payload = {
      client_name: editing.client_name,
      service_type: editing.service_type,
      form_codes: editing.form_codes || null,
      bundle_codes: editing.bundle_codes || null,
      status: editing.status,
      payment_status: editing.payment_status,
      total_fee: editing.total_fee || 0,
      paid_amount: editing.paid_amount || 0,
      uscis_receipt: editing.uscis_receipt || null,
      notes: editing.notes || null,
    };

    if (editing.id) {
      await supabase.from("cases").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("cases").insert(payload);
    }

    setSaving(false);
    setEditing(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-charcoal">Cases</h1>
        <button
          onClick={() => setEditing({ ...EMPTY_CASE })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Case
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client or form codes..."
          className="w-full h-10 rounded-lg border border-border pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No cases found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setEditing(c)}
              className="w-full text-left bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-700"}`}>
                  {c.status.replaceAll("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </div>
              <p className="font-semibold text-charcoal text-sm">{c.client_name}</p>
              <p className="text-xs text-muted-foreground">{c.service_type}</p>
              {c.form_codes && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><FileText className="h-3 w-3" /> {c.form_codes}</p>}
            </button>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-charcoal">{editing.id ? "Edit Case" : "New Case"}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-charcoal"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <Field label="Client Name" value={editing.client_name || ""} onChange={(v) => setEditing({ ...editing, client_name: v })} />
              <SelectField label="Service Type" value={editing.service_type || ""} options={SERVICE_TYPES} onChange={(v) => setEditing({ ...editing, service_type: v })} />
              <Field label="Form Codes" value={editing.form_codes || ""} onChange={(v) => setEditing({ ...editing, form_codes: v })} placeholder="e.g. N-400, I-130" />
              <Field label="Bundle Codes" value={editing.bundle_codes || ""} onChange={(v) => setEditing({ ...editing, bundle_codes: v })} />
              <SelectField label="Status" value={editing.status || "intake"} options={STATUS_OPTIONS} onChange={(v) => setEditing({ ...editing, status: v })} />
              <SelectField label="Payment Status" value={editing.payment_status || "pending"} options={PAYMENT_OPTIONS} onChange={(v) => setEditing({ ...editing, payment_status: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Total Fee ($)" type="number" value={String(editing.total_fee || 0)} onChange={(v) => setEditing({ ...editing, total_fee: Number(v) })} />
                <Field label="Paid Amount ($)" type="number" value={String(editing.paid_amount || 0)} onChange={(v) => setEditing({ ...editing, paid_amount: Number(v) })} />
              </div>
              <Field label="USCIS Receipt #" value={editing.uscis_receipt || ""} onChange={(v) => setEditing({ ...editing, uscis_receipt: v })} />
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Notes</label>
                <textarea
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={saveCase} disabled={saving} className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "", type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full h-10 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-lg border border-border px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring">
        {options.map(o => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}
      </select>
    </div>
  );
}
