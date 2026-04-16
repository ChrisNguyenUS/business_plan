const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

import { Shield, FileText, Users, Briefcase, BookOpen, LayoutDashboard, Menu, X, Palette } from 'lucide-react';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminSubmissions from '../components/admin/AdminSubmissions';
import AdminClients from '../components/admin/AdminClients';
import AdminCases from '../components/admin/AdminCases';
import AdminBlog from '../components/admin/AdminBlog';
import AdminContent from '../components/admin/AdminContent';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'submissions', label: 'Submissions', icon: FileText },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'cases', label: 'Cases', icon: Briefcase },
  { id: 'blog', label: 'Blog Posts', icon: BookOpen },
  { id: 'content', label: 'Content Editor', icon: Palette },
];

export default function Admin() {
  const { t } = useOutletContext();
  const [authorized, setAuthorized] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    db.auth.me().then(me => {
      setAuthorized(me?.role === 'admin');
    }).catch(() => setAuthorized(false));
  }, []);

  if (authorized === null) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!authorized) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
        <Shield className="h-8 w-8 text-red-400" />
      </div>
      <h1 className="text-xl font-bold text-charcoal">Access Denied</h1>
      <p className="text-muted-foreground text-sm text-center">Admin access required to view this page.</p>
    </div>
  );

  const ActiveComponent = {
    dashboard: AdminDashboard,
    submissions: AdminSubmissions,
    clients: AdminClients,
    cases: AdminCases,
    blog: AdminBlog,
    content: AdminContent,
  }[activeTab];

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-white border-r border-border z-40 flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-charcoal">Admin Panel</p>
            <p className="text-xs text-muted-foreground">Manna One Solution</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === id
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-teal-light hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">MannaOS Admin v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted">
            <Menu className="h-5 w-5 text-charcoal" />
          </button>
          <span className="font-semibold text-charcoal text-sm">
            {NAV.find(n => n.id === activeTab)?.label}
          </span>
        </div>

        <main className="flex-1 p-6 lg:p-8">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}