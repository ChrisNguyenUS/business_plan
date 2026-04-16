const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Edit, Star, Briefcase } from 'lucide-react';

const FORM_CODES = ['I-90','I-130','I-485','I-751','I-765','I-131','N-400','N-600','I-864','I-912','AR-11','FOIA','TRANSLATION'];
const BUNDLE_CODES = [
  { value: 'marriage-gc', label: 'Marriage Green Card Package' },
  { value: 'family-petition-consular', label: 'Family Petition Consular' },
  { value: 'citizenship-fast-track', label: 'Citizenship Fast-Track' },
  { value: 'gc-renewal-travel-doc', label: 'GC Renewal + Travel Doc' },
  { value: 'remove-conditions-ead', label: 'Remove Conditions + EAD' },
];
const STATUSES = ['intake','docs-pending','prep-in-progress','ready-to-file','filed-with-uscis','noa-received','case-update','completed','referred-out','cancelled'];
const STATUS_COLORS = {
  intake: 'bg-gray-100 text-gray-700',
  'docs-pending': 'bg-amber-100 text-amber-700',
  'prep-in-progress': 'bg-blue-100 text-blue-700',
  'ready-to-file': 'bg-purple-100 text-purple-700',
  'filed-with-uscis': 'bg-teal-100 text-teal-700',
  'noa-received': 'bg-cyan-100 text-cyan-700',
  'case-update': 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  'referred-out': 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

const EMPTY_CASE = { client_name: '', client_email: '', client_phone: '', case_type: 'form', form_code: 'N-400', bundle_code: '', current_status: 'intake', uscis_receipt_number: '', service_fee_cents: '', uscis_fee_cents: '', payment_status: 'quoted', internal_notes: '' };

export default function AdminCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editCase, setEditCase] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.entities.Case.list('-created_date', 200).then(data => { setCases(data); setLoading(false); });
  }, []);

  async function save() {
    setSaving(true);
    if (isNew) {
      const created = await db.entities.Case.create(editCase);
      setCases(prev => [created, ...prev]);
    } else {
      await db.entities.Case.update(editCase.id, editCase);
      setCases(prev => prev.map(c => c.id === editCase.id ? editCase : c));
    }
    setSaving(false);
    setEditCase(null);
  }

  async function requestReview(c) {
    await db.entities.Case.update(c.id, { review_requested: true });
    await db.integrations.Core.SendEmail({
      to: c.client_email,
      subject: 'Manna One Solution — Please Leave Us a Review',
      body: `Dear ${c.client_name},\n\nThank you for choosing Manna One Solution! We hope your experience with us was excellent. We would greatly appreciate it if you could take a moment to leave us a Google review:\n\nhttps://g.page/mannaonesolution/review\n\nXin chân thành cảm ơn quý khách!\nManna One Solution\n346-852-4454`,
    });
    setCases(prev => prev.map(cc => cc.id === c.id ? { ...cc, review_requested: true } : cc));
    alert('Review request sent!');
  }

  const filtered = cases.filter(c =>
    !search ||
    c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.client_email?.toLowerCase().includes(search.toLowerCase()) ||
    c.uscis_receipt_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Cases</h1>
          <p className="text-muted-foreground text-sm mt-1">{cases.filter(c => !['completed','cancelled','referred-out'].includes(c.current_status)).length} active cases</p>
        </div>
        <Button onClick={() => { setEditCase({ ...EMPTY_CASE }); setIsNew(true); }} className="bg-primary hover:bg-teal-dark text-white rounded-full gap-2">
          <Plus className="h-4 w-4" /> New Case
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by client, email, or receipt number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No cases yet. Create the first case above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-charcoal">{c.client_name}</span>
                    <span className="text-xs font-bold text-primary">{c.case_type === 'bundle' ? BUNDLE_CODES.find(b => b.value === c.bundle_code)?.label : c.form_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.current_status] || 'bg-gray-100 text-gray-700'}`}>{c.current_status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.client_email}{c.client_phone && ` · ${c.client_phone}`}</p>
                  {c.uscis_receipt_number && <p className="text-xs text-muted-foreground mt-0.5">Receipt: <span className="font-mono text-charcoal">{c.uscis_receipt_number}</span></p>}
                  {c.payment_status && <p className="text-xs text-muted-foreground mt-0.5">Payment: <span className="capitalize">{c.payment_status}</span></p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.current_status === 'completed' && !c.review_requested && (
                    <Button size="sm" variant="outline" onClick={() => requestReview(c)} className="h-8 text-xs gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50">
                      <Star className="h-3.5 w-3.5" /> Request Review
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setEditCase({ ...c }); setIsNew(false); }} className="h-8 gap-1.5 text-xs">
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Case Edit Dialog */}
      <Dialog open={!!editCase} onOpenChange={o => { if (!o) setEditCase(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'New Case' : 'Edit Case'}</DialogTitle>
          </DialogHeader>
          {editCase && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Client Name *</Label>
                  <Input value={editCase.client_name} onChange={e => setEditCase(p => ({ ...p, client_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Client Email *</Label>
                  <Input value={editCase.client_email} onChange={e => setEditCase(p => ({ ...p, client_email: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Client Phone</Label>
                <Input value={editCase.client_phone || ''} onChange={e => setEditCase(p => ({ ...p, client_phone: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Case Type</Label>
                  <Select value={editCase.case_type} onValueChange={v => setEditCase(p => ({ ...p, case_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="form">Single Form</SelectItem>
                      <SelectItem value="bundle">Bundle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editCase.case_type === 'form' ? (
                  <div>
                    <Label className="text-xs mb-1 block">Form Code</Label>
                    <Select value={editCase.form_code} onValueChange={v => setEditCase(p => ({ ...p, form_code: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FORM_CODES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs mb-1 block">Bundle</Label>
                    <Select value={editCase.bundle_code} onValueChange={v => setEditCase(p => ({ ...p, bundle_code: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{BUNDLE_CODES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Status</Label>
                  <Select value={editCase.current_status} onValueChange={v => setEditCase(p => ({ ...p, current_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Payment Status</Label>
                  <Select value={editCase.payment_status} onValueChange={v => setEditCase(p => ({ ...p, payment_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['quoted','invoiced','paid','refunded'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">USCIS Receipt Number</Label>
                <Input value={editCase.uscis_receipt_number || ''} onChange={e => setEditCase(p => ({ ...p, uscis_receipt_number: e.target.value }))} placeholder="IOE1234567890" className="font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Service Fee ($)</Label>
                  <Input type="number" value={editCase.service_fee_cents ? editCase.service_fee_cents / 100 : ''} onChange={e => setEditCase(p => ({ ...p, service_fee_cents: Math.round(parseFloat(e.target.value || 0) * 100) }))} placeholder="250.00" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">USCIS Fee ($)</Label>
                  <Input type="number" value={editCase.uscis_fee_cents ? editCase.uscis_fee_cents / 100 : ''} onChange={e => setEditCase(p => ({ ...p, uscis_fee_cents: Math.round(parseFloat(e.target.value || 0) * 100) }))} placeholder="465.00" />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Internal Notes (admin only)</Label>
                <Textarea rows={3} value={editCase.internal_notes || ''} onChange={e => setEditCase(p => ({ ...p, internal_notes: e.target.value }))} placeholder="Private notes..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCase(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-primary hover:bg-teal-dark text-white">
              {saving ? 'Saving...' : 'Save Case'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}