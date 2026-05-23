import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Image as ImageIcon,
  LayoutTemplate,
  Medal,
  Settings,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";
import { getAppSettings, getLeaderboard, getTemplate } from "@/lib/store";
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

function percent(value: number, total: number): string {
  if (!total) {
    return "0%";
  }
  return `${Math.round((value / total) * 100)}%`;
}

export async function AdminOverviewDashboard() {
  const [leaderboard, template, settings, resultsSnapshot] = await Promise.all([
    getLeaderboard(),
    getTemplate(),
    getAppSettings(),
    getAdminResultsSnapshot(),
  ]);

  const publishedResults = resultsSnapshot.results.length;
  const totalPrograms = resultsSnapshot.programs.length;
  const latestResult = resultsSnapshot.results[0];
  const topUnits = leaderboard.unitTotals.slice(0, 5);

  const workflows = [
    {
      href: "/admin/results",
      title: "Publish Results",
      description: "Enter winners, generate exact poster images, and assign sponsor ads.",
      icon: Trophy,
      stat: `${publishedResults}/${totalPrograms}`,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    {
      href: "/admin/templates",
      title: "Frame Templates",
      description: "Manage family frame overlays, typography, and public frame links.",
      icon: LayoutTemplate,
      stat: `${template.frames.length} frames`,
      tone: "bg-sky-50 text-sky-700 ring-sky-200",
    },
    {
      href: "/admin/counts",
      title: "Manual Counts",
      description: "Reconcile offline/missed frame counts without editing generated records.",
      icon: SlidersHorizontal,
      stat: `${leaderboard.manualUnitTotals.reduce((sum, item) => sum + item.count, 0)} manual`,
      tone: "bg-amber-50 text-amber-700 ring-amber-200",
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
              Live Operations
            </Badge>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              One console for publishing, templates, counters, and event readiness.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              Monitor the family frame campaign, publish official result posters, and keep public-facing assets consistent across devices.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/admin/results">
                  Publish Result
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/admin/templates">Manage Frames</Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.04] p-6 lg:border-l lg:border-t-0">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Latest Result</p>
                {latestResult ? (
                  <>
                    <p className="mt-2 text-lg font-black">{latestResult.competitionName}</p>
                    <p className="text-sm text-slate-400">Result {String(latestResult.resultNumber).padStart(2, "0")}</p>
                  </>
                ) : (
                  <p className="mt-2 text-lg font-black text-slate-300">No result published</p>
                )}
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
          detail={`${totalPrograms - publishedResults} competitions remaining`}
          icon={Trophy}
          tone="emerald"
        />
        <AdminMetricCard
          label="Photos Framed"
          value={leaderboard.total}
          detail={`${leaderboard.liveUnitTotals.reduce((sum, item) => sum + item.count, 0)} live records`}
          icon={ImageIcon}
          tone="sky"
        />
        <AdminMetricCard
          label="Active Units"
          value={leaderboard.unitTotals.filter((item) => item.count > 0).length}
          detail={`${leaderboard.unitTotals.length} total units`}
          icon={Users}
          tone="amber"
        />
        <AdminMetricCard
          label="Templates"
          value={resultsSnapshot.templates.length}
          detail={`${resultsSnapshot.ads.length} sponsor ad rules`}
          icon={LayoutTemplate}
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
          title="Unit Standings"
          description="Current family frame count distribution."
          icon={Medal}
        >
          <div className="space-y-3">
            {topUnits.map((unit, index) => (
              <div key={unit.unit} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {index + 1}. {unit.unit}
                    </p>
                    <p className="text-xs text-slate-500">{percent(unit.count, leaderboard.total)} of total</p>
                  </div>
                  <span className="text-lg font-black text-slate-950">{unit.count}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-slate-950"
                    style={{ width: percent(unit.count, leaderboard.total) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
