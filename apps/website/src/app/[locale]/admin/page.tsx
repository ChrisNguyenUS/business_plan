"use client";

import { useState, useEffect } from "react";
import { Inbox, Users, Briefcase, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Stats {
  newLeads: number;
  totalSubmissions: number;
  activeCases: number;
  publishedPosts: number;
}

interface RecentSubmission {
  id: string;
  full_name: string;
  service_type: string | null;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ newLeads: 0, totalSubmissions: 0, activeCases: 0, publishedPosts: 0 });
  const [recent, setRecent] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [subs, cases, posts] = await Promise.all([
        supabase.from("contact_submissions").select("*", { count: "exact" }),
        supabase.from("cases").select("*", { count: "exact" }).neq("status", "completed"),
        supabase.from("blog_posts").select("*", { count: "exact" }).eq("published", true),
      ]);

      const allSubs = subs.data || [];
      const newCount = allSubs.filter((s: { status: string }) => s.status === "new").length;

      setStats({
        newLeads: newCount,
        totalSubmissions: subs.count || 0,
        activeCases: cases.count || 0,
        publishedPosts: posts.count || 0,
      });

      // Recent 5 submissions
      const { data: recentData } = await supabase
        .from("contact_submissions")
        .select("id, full_name, service_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecent(recentData || []);
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: "New Leads", value: stats.newLeads, icon: TrendingUp, color: "text-orange-500 bg-orange-50" },
    { label: "Total Submissions", value: stats.totalSubmissions, icon: Inbox, color: "text-blue-500 bg-blue-50" },
    { label: "Active Cases", value: stats.activeCases, icon: Briefcase, color: "text-purple-500 bg-purple-50" },
    { label: "Published Posts", value: stats.publishedPosts, icon: FileText, color: "text-green-500 bg-green-50" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-charcoal mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-charcoal">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-charcoal">Recent Submissions</h2>
        </div>
        <div className="divide-y divide-border">
          {recent.map((s) => (
            <div key={s.id} className="px-6 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-charcoal">{s.full_name}</p>
                <p className="text-xs text-muted-foreground">{s.service_type || "General"}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  s.status === "new" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {s.status}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
          {recent.length === 0 && (
            <p className="px-6 py-8 text-center text-muted-foreground text-sm">No submissions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
