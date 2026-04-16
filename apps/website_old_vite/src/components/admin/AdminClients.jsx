const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserCircle, Mail, Calendar } from 'lucide-react';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    db.entities.User.list('-created_date', 200).then(data => {
      setClients(data.filter(u => u.role === 'user'));
      setLoading(false);
    });
  }, []);

  const filtered = clients.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function inviteClient() {
    const email = prompt('Enter client email address:');
    if (!email) return;
    await db.users.inviteUser(email, 'user');
    alert(`Invitation sent to ${email}`);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">{clients.length} registered clients</p>
        </div>
        <Button onClick={inviteClient} className="bg-primary hover:bg-teal-dark text-white rounded-full gap-2">
          + Invite Client
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <UserCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No clients yet. Invite clients to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm divide-y divide-border">
          {filtered.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-6 py-4">
              <div className="w-10 h-10 rounded-full bg-teal-light flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">{(c.full_name || c.email || '?')[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-charcoal text-sm">{c.full_name || 'Unnamed'}</p>
                <p className="text-xs text-muted-foreground">{c.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(c.created_date).toLocaleDateString()}
              </div>
              <a href={`mailto:${c.email}`} className="p-1.5 rounded-lg hover:bg-teal-light text-primary">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}