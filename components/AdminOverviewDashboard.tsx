import Link from "next/link";
import { Activity, ArrowRight, CalendarDays, FileImage, LayoutTemplate, Settings, Trophy } from "lucide-react";
import { getAppSettings } from "@/lib/store";
import { getAdminResultsSnapshot } from "@/lib/results-store";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function AdminOverviewDashboard() {
  const [settings, resultsSnapshot] = await Promise.all([
    getAppSettings(),
    getAdminResultsSnapshot(),
  ]);

  const publishedResults = resultsSnapshot.results.length;
  const totalPrograms = resultsSnapshot.programs.length;
  const latestResults = resultsSnapshot.results.slice(0, 5);

  const workflows = [
    {
      href: "/admin/results",
      title: "Publish Results",
      description: "Enter winners, generate poster images, and assign sponsor ads.",
      icon: Trophy,
      stat: `${publishedResults}/${totalPrograms}`,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    {
      href: "/admin/templates",
      title: "Result Templates",
      description: "Manage result poster designs, text placement, and sponsor ad rules.",
      icon: LayoutTemplate,
      stat: `${resultsSnapshot.templates.length} designs`,
      tone: "bg-sky-50 text-sky-700 ring-sky-200",
    },
    {
      href: "/admin/settings",
      title: "App Settings",
      description: "Configure event date controls used by the public homepage.",
      icon: Settings,
      stat: settings.sahithyolsavDate ? "configured" : "pending",
      tone: "bg-violet-50 text-violet-700 ring-violet-200",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-6 sm:p-8">
            <Badge className="mb-5 bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/10">
              Anayamkunnu Sector
            </Badge>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              One console for publishing official results and posters.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              Publish competition results, manage poster templates, and keep public-facing result assets ready during the event.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/admin/results">
                  Publish Result
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/admin/templates">Manage Templates</Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.04] p-6 lg:border-l lg:border-t-0">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Published</p>
                <p className="mt-2 text-lg font-black">{publishedResults} results</p>
              </div>
              <div className="h-px bg-white/10" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Event Date</p>
                <p className="mt-2 text-lg font-black">{formatDate(settings.sahithyolsavDate)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Published Results"
          value={publishedResults}
          detail={`${Math.max(totalPrograms - publishedResults, 0)} competitions remaining`}
          icon={Trophy}
          tone="emerald"
        />
        <AdminMetricCard
          label="Competitions"
          value={totalPrograms}
          detail="Configured result programs"
          icon={Activity}
          tone="sky"
        />
        <AdminMetricCard
          label="Templates"
          value={resultsSnapshot.templates.length}
          detail="Poster designs"
          icon={LayoutTemplate}
          tone="amber"
        />
        <AdminMetricCard
          label="Sponsor Ads"
          value={resultsSnapshot.ads.length}
          detail="Ad assignment rules"
          icon={FileImage}
          tone="violet"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminPanel
          title="Core Workflows"
          description="Fast entry points for the operations team during the event."
          icon={Activity}
          contentClassName="grid gap-3"
        >
          {workflows.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${item.tone}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge variant="outline">{item.stat}</Badge>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
              </div>
            </Link>
          ))}
        </AdminPanel>

        <AdminPanel
          title="Recent Results"
          description="Latest posters published from the results workflow."
          icon={CalendarDays}
        >
          <div className="space-y-3">
            {latestResults.length ? latestResults.map((result) => (
              <div key={result.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{result.competitionName}</p>
                    <p className="text-xs text-slate-500">{result.category}</p>
                  </div>
                  <Badge variant="outline">#{String(result.resultNumber).padStart(2, "0")}</Badge>
                </div>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                No results published yet.
              </div>
            )}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
