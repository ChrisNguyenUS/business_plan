"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, ChevronUp, Mail, Phone, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Submission {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  service_type: string | null;
  message: string | null;
  status: string;
  locale: string | null;
  created_at: string;
}

const STATUSES = ["all", "new", "contacted", "in_progress", "completed", "archived"];
const SERVICES = ["all", "Tax & Business", "Insurance & Finance", "Immigration", "AI / Automation"];

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let query = supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (serviceFilter !== "all") query = query.eq("service_type", serviceFilter);

    const { data } = await query;
    setSubmissions(data || []);
    setLoading(false);
  }, [statusFilter, serviceFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = submissions.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("contact_submissions").update({ status: newStatus }).eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-charcoal mb-6">Submissions</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full h-10 rounded-lg border border-border pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border px-3 text-sm bg-white">
          {STATUSES.map(s => <option key={s} value={s}>{s === "all" ? "All Statuses" : s.replaceAll("_", " ")}</option>)}
        </select>
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="h-10 rounded-lg border border-border px-3 text-sm bg-white">
          {SERVICES.map(s => <option key={s} value={s}>{s === "all" ? "All Services" : s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No submissions found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                className="w-full text-left px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-light flex items-center justify-center text-primary font-bold text-sm">
                    {s.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.service_type || "General"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.status === "new" ? "bg-green-100 text-green-700" :
                    s.status === "contacted" ? "bg-blue-100 text-blue-700" :
                    s.status === "in_progress" ? "bg-purple-100 text-purple-700" :
                    s.status === "completed" ? "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-600"
                  }`}>
                    {s.status}
                  </span>
                  {expandedId === s.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {expandedId === s.id && (
                <div className="px-5 pb-4 border-t border-border pt-3 space-y-2">
                  {s.email && <p className="text-sm flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {s.email}</p>}
                  {s.phone && <p className="text-sm flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {s.phone}</p>}
                  {s.message && <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{s.message}</p>}
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(s.created_at).toLocaleString()}</p>
                  <div className="flex gap-2 mt-3">
                    {["new", "contacted", "in_progress", "completed", "archived"].map(st => (
                      <button
                        key={st}
                        onClick={() => updateStatus(s.id, st)}
                        disabled={s.status === st}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          s.status === st ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/10"
                        }`}
                      >
                        {st.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
