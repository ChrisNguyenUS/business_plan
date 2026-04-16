const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { FileText, Users, Briefcase, BookOpen, TrendingUp, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ submissions: 0, cases: 0, posts: 0, newSubmissions: 0 });
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [submissions, cases, posts] = await Promise.all([
        db.entities.ContactSubmission.list('-created_date', 100),
        db.entities.Case.list('-created_date', 100),
        db.entities.BlogPost.list('-created_date', 100),
      ]);
      setStats({
        submissions: submissions.length,
        cases: cases.length,
        posts: posts.filter(p => p.published).length,
        newSubmissions: submissions.filter(s => s.status === 'new').length,
      });
      setRecentSubmissions(submissions.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  const SERVICE_LABELS = { tax: 'Tax', insurance: 'Insurance', immigration: 'Immigration', ai: 'AI', general: 'General' };
  const STATUS_COLORS = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-amber-100 text-amber-700', resolved: 'bg-green-100 text-green-700' };

  const statCards = [
    { label: 'New Leads', value: stats.newSubmissions, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Submissions', value: stats.submissions, icon: FileText, color: 'text-primary', bg: 'bg-teal-light' },
    { label: 'Active Cases', value: stats.cases, icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Published Posts', value: stats.posts, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of Manna One Solution operations</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-charcoal">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-charcoal">Recent Submissions</h2>
        </div>
        {recentSubmissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">No submissions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentSubmissions.map(s => (
              <div key={s.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-charcoal text-sm">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">{s.email} · {SERVICE_LABELS[s.service_type]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                    {s.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}