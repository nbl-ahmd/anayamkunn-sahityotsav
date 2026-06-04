import Link from "next/link";
import { ArrowRight, CalendarDays, FileImage, Medal, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicResultsSnapshot } from "@/lib/results-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const resultsSnapshot = await getPublicResultsSnapshot();
  const latestResult = resultsSnapshot.results[0];
  const publishedCount = resultsSnapshot.results.length;
  const totalPrograms = resultsSnapshot.programs.length;

  return (
    <AppShell>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="p-6 sm:p-8 lg:p-10">
            <Badge className="mb-5 bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/10">
              Anayamkunnu Sector
            </Badge>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Official Sahityotsav results and posters.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Follow published competition results, download official posters, and stay updated with event announcements.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/results">
                  View Results
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.04] p-6 lg:border-l lg:border-t-0">
            <div className="flex h-full min-h-[260px] flex-col justify-between rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
                  <Medal className="h-3.5 w-3.5" />
                  Latest Published Result
                </div>
                {latestResult ? (
                  <>
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
                      Result {String(latestResult.resultNumber).padStart(2, "0")}
                    </p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                      {latestResult.competitionName}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-slate-300">{latestResult.category}</p>
                    <div className="mt-5 space-y-2">
                      {latestResult.entries.slice(0, 3).map((entry) => (
                        <div key={`${entry.position}-${entry.name}-${entry.unit}`} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-950">
                            {entry.position}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">{entry.name || "Name pending"}</p>
                            <p className="truncate text-xs text-slate-400">{entry.unit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-black tracking-tight text-white">Results pending</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      The latest published result will appear here once the admin team publishes the first poster.
                    </p>
                  </>
                )}
              </div>
              <Button asChild variant="outline" className="mt-6 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/results">
                  Open Results
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <Trophy className="h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-slate-950">{publishedCount}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Published Results</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-200">
              <FileImage className="h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-slate-950">{totalPrograms}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Competitions</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm sm:col-span-2 xl:col-span-1">
          <CardContent className="p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-200">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="truncate text-lg font-black text-slate-950">
              {latestResult ? latestResult.competitionName : "Results pending"}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Latest Update
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Official result posters</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Browse the public result archive and share published posters directly from the results page.
            </p>
          </div>
          <Button asChild>
            <Link href="/results">
              Open Results
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
