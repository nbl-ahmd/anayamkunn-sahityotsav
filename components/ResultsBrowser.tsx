"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import {
  Award,
  Copy,
  Download,
  ExternalLink,
  ListChecks,
  Trophy,
} from "lucide-react";
import { copyToClipboard, downloadBlob } from "@/lib/client-utils";
import {
  RESULT_CATEGORY_GROUPS,
  PublishedResult,
  ResultsPublicSnapshot,
  ResultTemplateConfig,
} from "@/lib/results-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function templateApplies(template: ResultTemplateConfig, result: PublishedResult) {
  if (!template.active) return false;
  if (template.scopeType === "global") return true;
  if (template.scopeType === "program") return template.scopeValue === result.programId;
  return template.scopeValue === result.category || template.scopeValue === result.categoryGroup;
}

const selectClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const posterRenderVersion = "path-text-v3";

export function ResultsBrowser({ snapshot }: { snapshot: ResultsPublicSnapshot }) {
  const firstCategory = snapshot.programs[0]?.categoryGroup ?? "General";
  const [category, setCategory] = useState<string>(firstCategory);
  const [programId, setProgramId] = useState<string>(snapshot.programs[0]?.id ?? "");
  const [templateId, setTemplateId] = useState<string>("");

  const categoryOptions = RESULT_CATEGORY_GROUPS.filter((item) =>
    snapshot.programs.some((program) => program.categoryGroup === item),
  );
  const latestResult = snapshot.results[0];

  const programs = useMemo(
    () => snapshot.programs.filter((program) => program.categoryGroup === category),
    [category, snapshot.programs],
  );

  const selectedProgram = useMemo(
    () => snapshot.programs.find((program) => program.id === programId) ?? programs[0],
    [programId, programs, snapshot.programs],
  );

  const result = useMemo(
    () => snapshot.results.find((item) => item.programId === selectedProgram?.id),
    [selectedProgram?.id, snapshot.results],
  );

  const templates = useMemo(() => {
    if (!result) return [];
    return snapshot.templates.filter((template) => templateApplies(template, result));
  }, [result, snapshot.templates]);

  const activeTemplateId = templateId || result?.templateId || templates[0]?.id || "";
  const posterUrl = result
    ? `/api/results/${result.id}/poster?templateId=${encodeURIComponent(activeTemplateId)}&v=${posterRenderVersion}`
    : "";

  const onCategoryChange = (next: string) => {
    setCategory(next);
    const nextProgram = snapshot.programs.find((program) => program.categoryGroup === next);
    setProgramId(nextProgram?.id ?? "");
    setTemplateId("");
  };

  const downloadPoster = async () => {
    if (!posterUrl || !result) return;
    try {
      const response = await fetch(posterUrl);
      const blob = await response.blob();
      downloadBlob(blob, `result-${String(result.resultNumber).padStart(2, "0")}-${result.programId}.png`);
    } catch {
      toast.error("Could not download poster.");
    }
  };

  const copyLink = async () => {
    if (!result) return;
    const url = `${window.location.origin}/results?result=${result.id}`;
    const ok = await copyToClipboard(url);
    toast[ok ? "success" : "error"](ok ? "Result link copied." : "Could not copy link.");
  };

  if (!snapshot.results.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-[360px] items-center justify-center p-6 text-center sm:p-10">
          <div className="max-w-xl">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Official result posters will appear here once published.
            </h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              <Award className="h-3.5 w-3.5" />
              Published Results
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Official result posters
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Select a published competition to preview and download the official result poster.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-black text-slate-950">{snapshot.results.length}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Published</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-black text-slate-950">
                {latestResult ? String(latestResult.resultNumber).padStart(2, "0") : "00"}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Latest</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <ListChecks className="h-4 w-4 text-slate-500" />
              Choose Result
            </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className={selectClass}
            >
              {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Competition</Label>
            <select
              value={selectedProgram?.id ?? ""}
              onChange={(event) => {
                setProgramId(event.target.value);
                setTemplateId("");
              }}
              className={selectClass}
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.category !== program.categoryGroup ? `${program.publicCompetitionName} (${program.category})` : program.publicCompetitionName}
                </option>
              ))}
            </select>
          </div>

          {result && (
            <>
              <div className="space-y-2">
                <Label>Design</Label>
                <select
                  value={activeTemplateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                  className={selectClass}
                >
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Badge variant="outline">Result {String(result.resultNumber).padStart(2, "0")}</Badge>
                <p className="mt-3 font-semibold text-slate-900">{result.competitionName}</p>
                <p className="text-sm text-slate-500">{result.category}</p>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                {result.entries.map((entry) => (
                  <div key={entry.position} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-900 shadow-sm">
                      {entry.position}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{entry.name}</p>
                      <p className="truncate text-xs text-slate-500">{entry.unit}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={downloadPoster} className="w-full">
                  <Download className="h-4 w-4" />
                  Download Poster
                </Button>
                <Button variant="outline" onClick={copyLink} className="w-full">
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
                <Button variant="outline" onClick={() => window.open(posterUrl, "_blank", "noopener,noreferrer")} className="w-full">
                  <ExternalLink className="h-4 w-4" />
                  Open Image
                </Button>
              </div>
            </>
          )}
          </CardContent>
        </Card>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {result && posterUrl ? (
            <div className="mx-auto max-w-[640px]">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-950">{result.competitionName}</p>
                  <p className="text-xs text-slate-500">Official poster preview</p>
                </div>
                <Badge variant="secondary">{result.categoryGroup}</Badge>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img src={posterUrl} alt={`${result.competitionName} result poster`} className="h-auto w-full" />
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed bg-slate-50 text-sm text-slate-500">
              Select a published competition.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
