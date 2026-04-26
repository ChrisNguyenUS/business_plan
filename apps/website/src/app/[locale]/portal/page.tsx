"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Briefcase,
  Compass,
  AlertCircle,
  ChevronRight,
  FileText,
  Shield,
  Brain,
  Calculator,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

type ServiceType = "immigration" | "tax" | "insurance" | "ai";

interface ServiceJob {
  id: string;
  service_type: ServiceType;
  description: string;
  status: string;
  updated_at: string;
}

const SERVICE_META: Record<
  ServiceType,
  {
    label: string;
    icon: React.ElementType;
    infoPath: string;
    statuses: Record<string, { color: string; label: string }>;
  }
> = {
  immigration: {
    label: "Immigration",
    icon: FileText,
    infoPath: "/services/immigration",
    statuses: {
      documents_pending: { color: "bg-yellow-100 text-yellow-700", label: "Documents Pending" },
      ready_to_file: { color: "bg-blue-100 text-blue-700", label: "Ready to File" },
      submitted: { color: "bg-indigo-100 text-indigo-700", label: "Submitted" },
      receipt_received: { color: "bg-purple-100 text-purple-700", label: "Receipt Received" },
      in_progress: { color: "bg-purple-100 text-purple-700", label: "In Review" },
      rfe_issued: { color: "bg-red-100 text-red-700", label: "Action Required" },
      approved: { color: "bg-green-100 text-green-700", label: "Approved" },
      denied: { color: "bg-red-600 text-white", label: "Denied" },
    },
  },
  tax: {
    label: "Tax Services",
    icon: Calculator,
    infoPath: "/services/tax",
    statuses: {
      open: { color: "bg-yellow-100 text-yellow-700", label: "Documents Needed" },
      in_progress: { color: "bg-blue-100 text-blue-700", label: "In Progress" },
      complete: { color: "bg-green-100 text-green-700", label: "Filed & Complete" },
    },
  },
  insurance: {
    label: "Insurance",
    icon: Shield,
    infoPath: "/services/insurance",
    statuses: {
      open: { color: "bg-blue-100 text-blue-700", label: "Active" },
      in_progress: { color: "bg-yellow-100 text-yellow-700", label: "Renewal Due" },
      complete: { color: "bg-gray-100 text-gray-700", label: "Expired" },
    },
  },
  ai: {
    label: "AI Services",
    icon: Brain,
    infoPath: "/services/ai",
    statuses: {
      open: { color: "bg-purple-100 text-purple-700", label: "Pending Setup" },
      in_progress: { color: "bg-purple-100 text-purple-700", label: "Pending Setup" },
      complete: { color: "bg-green-100 text-green-700", label: "Active" },
    },
  },
};

const ALL_SERVICES: ServiceType[] = ["immigration", "tax", "insurance", "ai"];

const EXPLORE_DESCRIPTIONS: Record<ServiceType, string> = {
  immigration: "Green cards, naturalization, work permits, family petitions, and more.",
  tax: "Personal and business tax filing, ITIN, and year-round bookkeeping.",
  insurance: "Health, auto, and life insurance plans tailored for immigrants.",
  ai: "AI-powered tools to streamline your business operations.",
};

const CALENDLY_FALLBACK = "https://calendly.com/mannaonesolution";

export default function PortalPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { user, profile } = useAuth();

  const [tab, setTab] = useState<"my-services" | "explore">("my-services");
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Resolve the client record linked to this auth account
      const { data: clientRecord } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clientRecord) {
        setLoading(false);
        return;
      }

      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, service_type, description, status, updated_at")
        .eq("client_id", clientRecord.id)
        .order("updated_at", { ascending: false });

      setJobs((jobsData as ServiceJob[]) ?? []);
    } catch (err) {
      console.error("Portal loadData error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const enrolledServices = [
    ...new Set(jobs.map((j) => j.service_type)),
  ] as ServiceType[];
  const availableServices = ALL_SERVICES.filter(
    (s) => !enrolledServices.includes(s)
  );
  const displayName = profile?.full_name || user?.email || "";
  const calendlyUrl =
    process.env.NEXT_PUBLIC_CALENDLY_URL ?? CALENDLY_FALLBACK;

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-charcoal mb-1">My Portal</h1>
        <p className="text-muted-foreground mb-6">
          Welcome back,{" "}
          <span className="font-semibold text-charcoal">{displayName}</span>
        </p>

        <div className="bg-teal-light border border-primary/20 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {locale === "vi"
              ? "Theo dõi trạng thái dịch vụ của bạn tại đây."
              : "Track your active services and discover new ones below."}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted mb-8">
          <button
            onClick={() => setTab("my-services")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "my-services"
                ? "bg-white text-charcoal shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            My Services
            {enrolledServices.length > 0 && (
              <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {enrolledServices.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("explore")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === "explore"
                ? "bg-white text-charcoal shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Compass className="h-4 w-4" />
            Explore Services
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tab === "my-services" ? (
          <MyServicesTab
            enrolledServices={enrolledServices}
            jobs={jobs}
            locale={locale}
            onExplore={() => setTab("explore")}
          />
        ) : (
          <ExploreServicesTab
            availableServices={availableServices}
            locale={locale}
            calendlyUrl={calendlyUrl}
          />
        )}
      </div>
    </div>
  );
}

function MyServicesTab({
  enrolledServices,
  jobs,
  locale,
  onExplore,
}: {
  enrolledServices: ServiceType[];
  jobs: ServiceJob[];
  locale: string;
  onExplore: () => void;
}) {
  if (enrolledServices.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-semibold text-charcoal mb-2">
          No active services yet
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {locale === "vi"
            ? "Khám phá các dịch vụ của chúng tôi."
            : "Explore what we offer and book a free consultation to get started."}
        </p>
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors"
        >
          <Compass className="h-4 w-4" />
          Explore Services
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {enrolledServices.map((serviceType) => {
        const meta = SERVICE_META[serviceType];
        const Icon = meta.icon;
        const serviceJobs = jobs.filter((j) => j.service_type === serviceType);

        return (
          <div
            key={serviceType}
            className="bg-white rounded-xl border border-border overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-charcoal">{meta.label}</h3>
            </div>
            <div className="divide-y divide-border">
              {serviceJobs.map((job) => {
                const statusCfg = meta.statuses[job.status] ?? {
                  color: "bg-gray-100 text-gray-700",
                  label: job.status,
                };
                return (
                  <div
                    key={job.id}
                    className="px-5 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-charcoal line-clamp-1">
                        {job.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Updated {new Date(job.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`ml-4 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.color}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExploreServicesTab({
  availableServices,
  locale,
  calendlyUrl,
}: {
  availableServices: ServiceType[];
  locale: string;
  calendlyUrl: string;
}) {
  if (availableServices.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <Compass className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="font-semibold text-charcoal mb-2">You&#39;re all set!</h3>
        <p className="text-muted-foreground text-sm">
          You&#39;re enrolled in all of our services.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {availableServices.map((serviceType) => {
        const meta = SERVICE_META[serviceType];
        const Icon = meta.icon;
        const bookingUrl = `${calendlyUrl}?utm_source=portal&utm_medium=explore&utm_campaign=${serviceType}`;

        return (
          <div
            key={serviceType}
            className="bg-white rounded-xl border border-border p-5 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-charcoal">{meta.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4 flex-1">
              {EXPLORE_DESCRIPTIONS[serviceType]}
            </p>
            <div className="flex items-center gap-3 mt-auto">
              <Link
                href={`/${locale}${meta.infoPath}`}
                className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"
              >
                Learn More
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors"
              >
                Request Consultation
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
