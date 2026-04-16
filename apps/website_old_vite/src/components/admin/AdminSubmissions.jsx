const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Mail, Phone } from 'lucide-react';

const STATUS_COLORS = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-amber-100 text-amber-700', resolved: 'bg-green-100 text-green-700' };
const SERVICE_LABELS = { tax: 'Tax', insurance: 'Insurance', immigration: 'Immigration', ai: 'AI', general: 'General' };

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    db.entities.ContactSubmission.list('-created_date', 200).then(data => {
      setSubmissions(data);
      setLoading(false);
    });
  }, []);

  async function updateStatus(id, status) {
    await db.entities.ContactSubmission.update(id, { status });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }

  const filtered = submissions.filter(s => {
    const matchSearch = !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchService = filterService === 'all' || s.service_type === filterService;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchService && matchStatus;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal">Submissions</h1>
        <p className="text-muted-foreground text-sm mt-1">{submissions.filter(s => s.status === 'new').length} new leads</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Service" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {Object.entries(SERVICE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center text-muted-foreground text-sm">
          No submissions found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 cursor-pointer hover:bg-surface/50"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-charcoal text-sm">{s.full_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-light text-primary font-medium">{SERVICE_LABELS[s.service_type]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.email}{s.phone && ` · ${s.phone}`} · {new Date(s.created_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <Select value={s.status} onValueChange={val => updateStatus(s.id, val)}>
                    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <a href={`mailto:${s.email}`} className="p-1.5 rounded-lg hover:bg-teal-light text-primary"><Mail className="h-4 w-4" /></a>
                  {s.phone && <a href={`tel:${s.phone}`} className="p-1.5 rounded-lg hover:bg-teal-light text-primary"><Phone className="h-4 w-4" /></a>}
                </div>
              </div>
              {expanded === s.id && (
                <div className="px-5 pb-4 border-t border-border bg-surface/30">
                  <p className="text-sm text-charcoal mt-3 leading-relaxed">{s.message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}