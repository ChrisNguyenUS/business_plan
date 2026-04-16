"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Inbox, Users, Briefcase, FileText, Settings, Menu, X, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

const ADMIN_NAV = [
  { key: "", label: "Dashboard", icon: LayoutDashboard },
  { key: "submissions", label: "Submissions", icon: Inbox },
  { key: "clients", label: "Clients", icon: Users },
  { key: "cases", label: "Cases", icon: Briefcase },
  { key: "blog", label: "Blog Posts", icon: FileText },
  { key: "content", label: "Content Editor", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = params.locale as string;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!profile || profile.role !== "admin")) {
      // wait for profile to load
    }
  }, [profile, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile || profile.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm mb-4">You do not have admin permissions.</p>
          <Link href={`/${locale}`} className="text-primary font-medium hover:underline text-sm">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 border-r border-border bg-white shrink-0">
        <div className="sticky top-20 p-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-3">
            Admin Panel
          </h2>
          <nav className="space-y-1">
            {ADMIN_NAV.map(({ key, label, icon: Icon }) => {
              const href = `/${locale}/admin${key ? `/${key}` : ""}`;
              const isActive = key === "" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={key}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-teal-light hover:text-charcoal"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Hamburger */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-3">
              Admin Panel
            </h2>
            <nav className="space-y-1">
              {ADMIN_NAV.map(({ key, label, icon: Icon }) => {
                const href = `/${locale}/admin${key ? `/${key}` : ""}`;
                const isActive = key === "" ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={key}
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:bg-teal-light hover:text-charcoal"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 bg-[#fafbfc]">{children}</main>
    </div>
  );
}
