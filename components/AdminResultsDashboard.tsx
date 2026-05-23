"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  FileImage,
  ImageUp,
  ListChecks,
  Loader2,
  Megaphone,
  Plus,
  Save,
  Send,
  Trophy,
} from "lucide-react";
import { UNIT_LIST } from "@/lib/constants";
import { downloadBlob } from "@/lib/client-utils";
import { buildDefaultResultTemplate } from "@/lib/results-defaults";
import {
  RESULT_CATEGORY_GROUPS,
  RESULT_FIELD_KEYS,
  ResultAdConfig,
  ResultEntry,
  ResultFieldKey,
  ResultProgram,
  ResultsAdminSnapshot,
  ResultTemplateConfig,
  ResultTemplateScopeType,
} from "@/lib/results-types";
import { ResultPosterPreview } from "@/components/ResultPosterPreview";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const noneValue = "__none__";
const posterRenderVersion = "path-text-v1";

const emptyEntries: ResultEntry[] = [1, 2, 3].map((position) => ({
  position: position as 1 | 2 | 3,
  name: "",
  unit: UNIT_LIST[0],
  chestNumber: "",
  codeLetter: "",
  points: "",
}));

const fieldLabels: Record<ResultFieldKey, string> = {
  resultNumber: "Result Number",
  categoryName: "Category",
  competitionName: "Competition",
  firstPosition: "1st Position Label",
  firstName: "1st Name",
  firstUnit: "1st Unit",
  secondPosition: "2nd Position Label",
  secondName: "2nd Name",
  secondUnit: "2nd Unit",
  thirdPosition: "3rd Position Label",
  thirdName: "3rd Name",
  thirdUnit: "3rd Unit",
};

const previewValuesBase: Record<ResultFieldKey, string> = {
  resultNumber: "Result 01",
  categoryName: "High School",
  competitionName: "Language Game English",
  firstPosition: "1",
  firstName: "Muhammed Fayaz TA",
  firstUnit: "Karassery",
  secondPosition: "2",
  secondName: "Abdul Badusha KC",
  secondUnit: "Sarkkarparamb",
  thirdPosition: "3",
  thirdName: "Muhammed Ajlan",
  thirdUnit: "Nellikkaparamb",
};

function buildFreshTemplate(): ResultTemplateConfig {
  return {
    ...buildDefaultResultTemplate(),
    id: "",
    name: "New Result Template",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function scopeTargets(programs: ResultProgram[], scopeType: ResultTemplateScopeType) {
  if (scopeType === "program") {
    return programs.map((program) => ({ value: program.id, label: `${program.categoryGroup} - ${program.competitionName}` }));
  }
  if (scopeType === "category") {
    const values = new Set<string>();
    programs.forEach((program) => {
      values.add(program.categoryGroup);
      values.add(program.category);
    });
    return Array.from(values).map((value) => ({ value, label: value }));
  }
  return [];
}

function templateAppliesToProgram(template: ResultTemplateConfig, program: ResultProgram) {
  if (!template.active) return false;
  if (template.scopeType === "global") return true;
  if (template.scopeType === "program") return template.scopeValue === program.id;
  return template.scopeValue === program.category || template.scopeValue === program.categoryGroup;
}

type ResultsStudioMode = "publish" | "templates";

export function AdminResultsDashboard() {
  return <ResultsStudio mode="publish" />;
}

export function ResultTemplatesManager() {
  return <ResultsStudio mode="templates" />;
}

function ResultsStudio({ mode }: { mode: ResultsStudioMode }) {
  const [snapshot, setSnapshot] = useState<ResultsAdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<string>("General");
  const [programId, setProgramId] = useState("");
  const [templateId, setTemplateId] = useState<string>(noneValue);
  const [entries, setEntries] = useState<ResultEntry[]>(emptyEntries);
  const [templateDraft, setTemplateDraft] = useState<ResultTemplateConfig>(buildFreshTemplate);
  const [activeField, setActiveField] = useState<ResultFieldKey>("competitionName");
  const [dragEnabled, setDragEnabled] = useState(true);
  const [adDraft, setAdDraft] = useState<ResultAdConfig>({
    id: "",
    name: "Sponsor Ad",
    imageUrl: "",
    rangeStart: 1,
    rangeEnd: 20,
    scopeType: "global",
    scopeValue: null,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const templateUploadRef = useRef<HTMLInputElement>(null);
  const adUploadRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/results", { cache: "no-store" });
      if (!response.ok) throw new Error("Load failed");
      const data = await response.json() as ResultsAdminSnapshot;
      setSnapshot(data);
      const firstProgram = data.programs.find((program) => program.categoryGroup === category) ?? data.programs[0];
      if (firstProgram && !programId) {
        setProgramId(firstProgram.id);
      }
      if (data.templates[0] && !templateDraft.id) {
        setTemplateDraft({ ...data.templates[0], resultNumberFormat: "number" });
      }
    } catch {
      toast.error("Could not load result dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const programs = useMemo(() => snapshot?.programs ?? [], [snapshot?.programs]);
  const templates = useMemo(() => snapshot?.templates ?? [], [snapshot?.templates]);
  const ads = useMemo(() => snapshot?.ads ?? [], [snapshot?.ads]);
  const results = useMemo(() => snapshot?.results ?? [], [snapshot?.results]);
  const remainingPrograms = Math.max(0, programs.length - results.length);
  const activeTemplates = templates.filter((template) => template.active).length;

  const filteredPrograms = useMemo(
    () => programs.filter((program) => program.categoryGroup === category),
    [category, programs],
  );

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === programId) ?? filteredPrograms[0],
    [filteredPrograms, programId, programs],
  );

  const matchingTemplates = useMemo(() => {
    if (!selectedProgram) return templates.filter((template) => template.active);
    return templates.filter((template) => templateAppliesToProgram(template, selectedProgram));
  }, [selectedProgram, templates]);

  const publishPreviewTemplate = useMemo(() => {
    const selectedTemplate = templateId !== noneValue
      ? templates.find((template) => template.id === templateId)
      : undefined;

    return selectedTemplate ?? matchingTemplates[0] ?? templates[0] ?? buildDefaultResultTemplate();
  }, [matchingTemplates, templateId, templates]);

  const existingSelectedResult = useMemo(
    () => results.find((result) => result.programId === selectedProgram?.id),
    [results, selectedProgram?.id],
  );

  const publishPreviewValues = useMemo<Record<ResultFieldKey, string>>(() => {
    const resultNumber = existingSelectedResult?.resultNumber ?? results.length + 1;
    const padded = String(resultNumber).padStart(2, "0");
    const byPosition = new Map(entries.map((entry) => [entry.position, entry]));
    const first = byPosition.get(1);
    const second = byPosition.get(2);
    const third = byPosition.get(3);

    return {
      resultNumber: padded,
      categoryName: selectedProgram?.category ?? category,
      competitionName: selectedProgram?.publicCompetitionName ?? "Competition",
      firstPosition: "1",
      firstName: first?.name.trim() || "First winner name",
      firstUnit: first?.unit ?? UNIT_LIST[0],
      secondPosition: "2",
      secondName: second?.name.trim() || "Second winner name",
      secondUnit: second?.unit ?? UNIT_LIST[1],
      thirdPosition: "3",
      thirdName: third?.name.trim() || "Third winner name",
      thirdUnit: third?.unit ?? UNIT_LIST[2],
    };
  }, [category, entries, existingSelectedResult?.resultNumber, results.length, selectedProgram]);

  const patchEntry = (position: 1 | 2 | 3, patch: Partial<ResultEntry>) => {
    setEntries((prev) => prev.map((entry) => (entry.position === position ? { ...entry, ...patch } : entry)));
  };

  const onCategoryChange = (nextCategory: string) => {
    setCategory(nextCategory);
    const nextProgram = programs.find((program) => program.categoryGroup === nextCategory);
    setProgramId(nextProgram?.id ?? "");
  };

  const uploadAsset = async (file: File, kind: "template" | "ad") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const response = await fetch("/api/admin/results/uploads", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Upload failed");
    }
    return await response.json() as { url: string; width: number; height: number };
  };

  const onTemplateFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const uploaded = await uploadAsset(file, "template");
      setTemplateDraft((prev) => ({ ...prev, backgroundImage: uploaded.url }));
      toast.success(`Template image uploaded (${uploaded.width}x${uploaded.height}).`);
    } catch {
      toast.error("Could not upload template image. Check Blob configuration.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const onAdFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const uploaded = await uploadAsset(file, "ad");
      setAdDraft((prev) => ({ ...prev, imageUrl: uploaded.url }));
      toast.success(`Ad uploaded (${uploaded.width}x${uploaded.height}).`);
    } catch {
      toast.error("Could not upload ad image. Check Blob configuration.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const publish = async () => {
    if (!selectedProgram) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: selectedProgram.id,
          templateId: templateId === noneValue ? undefined : templateId,
          entries,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Publish failed");
      }
      toast.success("Result published and poster generated.");
      setEntries(emptyEntries);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish result.");
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/results/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...templateDraft, resultNumberFormat: "number" }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Template save failed");
      }
      const data = await response.json() as { template: ResultTemplateConfig };
      setTemplateDraft(data.template);
      toast.success("Result template saved.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  };

  const saveAd = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/results/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adDraft),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Ad save failed");
      }
      const data = await response.json() as { ad: ResultAdConfig };
      setAdDraft(data.ad);
      toast.success("Ad rule saved.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save ad.");
    } finally {
      setSaving(false);
    }
  };

  const downloadPoster = async (url: string, name: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    downloadBlob(blob, `${name}.png`);
  };

  const posterUrlForResult = (result: ResultsAdminSnapshot["results"][number]) =>
    `/api/results/${result.id}/poster?templateId=${encodeURIComponent(result.templateId)}&v=${posterRenderVersion}`;

  const field = templateDraft.fields[activeField];
  const previewValues = useMemo(() => {
    const padded = "01";
    const resultNumber = padded;
    return {
      ...previewValuesBase,
      resultNumber,
    };
  }, []);
  const templateScopeOptions = scopeTargets(programs, templateDraft.scopeType);
  const adScopeOptions = scopeTargets(programs, adDraft.scopeType);
  const metricCards = mode === "publish"
    ? [
        {
          label: "Published",
          value: results.length,
          detail: `${remainingPrograms} competitions pending`,
          icon: BadgeCheck,
          tone: "emerald" as const,
        },
        {
          label: "Programs",
          value: programs.length,
          detail: "Loaded from valuation catalog",
          icon: ListChecks,
          tone: "sky" as const,
        },
        {
          label: "Templates",
          value: templates.length,
          detail: "Available for result publishing",
          icon: FileImage,
          tone: "violet" as const,
        },
      ]
    : [
        {
          label: "Poster Templates",
          value: templates.length,
          detail: `${activeTemplates} active template${activeTemplates === 1 ? "" : "s"}`,
          icon: FileImage,
          tone: "violet" as const,
        },
        {
          label: "Catalog Programs",
          value: programs.length,
          detail: "Available for category and competition scoping",
          icon: ListChecks,
          tone: "sky" as const,
        },
        {
          label: "Scoped Defaults",
          value: templates.filter((template) => template.scopeType !== "global").length,
          detail: "Category or competition specific designs",
          icon: BadgeCheck,
          tone: "emerald" as const,
        },
        {
          label: "Ad Rules",
          value: ads.length,
          detail: "Range and scope based sponsor strips",
          icon: Megaphone,
          tone: "amber" as const,
        },
      ];

  if (loading && !snapshot) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-white">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading result studio...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={`grid gap-4 sm:grid-cols-2 ${mode === "publish" ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
        {metricCards.map((metric) => (
          <AdminMetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-3">
        {(mode === "publish"
          ? [
              {
                title: "1. Select program",
                description: "Choose the category and competition, then select the best matching result template.",
              },
              {
                title: "2. Enter winners",
                description: "Only names and units render on posters. Chest, code, and points stay internal.",
              },
              {
                title: "3. Preview and publish",
                description: "Review the generated poster preview, then publish the official PNG.",
              },
            ]
          : [
              {
                title: "1. Upload design",
                description: "Add a poster background and keep the output ratio suitable for social sharing.",
              },
              {
                title: "2. Configure fields",
                description: "Position category, competition, result number, and winner text using safe boxes.",
              },
              {
                title: "3. Assign ads",
                description: "Attach sponsor strips by result-number range and optional category or competition scope.",
              },
            ]).map((item) => (
          <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
          </div>
        ))}
      </section>

      <Tabs defaultValue={mode === "templates" ? "templates" : "publish"} className="space-y-4">
        <TabsList className="h-auto flex-wrap rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {mode === "publish" ? <TabsTrigger value="publish"><Trophy className="h-4 w-4" /> Publish</TabsTrigger> : null}
          {mode === "templates" ? <TabsTrigger value="templates"><FileImage className="h-4 w-4" /> Poster Templates</TabsTrigger> : null}
          {mode === "templates" ? <TabsTrigger value="ads"><Megaphone className="h-4 w-4" /> Sponsor Ads</TabsTrigger> : null}
          {mode === "publish" ? <TabsTrigger value="published"><BadgeCheck className="h-4 w-4" /> Published</TabsTrigger> : null}
        </TabsList>

        {mode === "publish" ? <TabsContent value="publish" className="mt-4">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
            <Card>
              <CardHeader>
                <CardTitle>Publish Result</CardTitle>
                <CardDescription>Select category and program, enter top three winners, then generate the official poster.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={onCategoryChange}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RESULT_CATEGORY_GROUPS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Competition</Label>
                    <Select value={selectedProgram?.id ?? ""} onValueChange={setProgramId}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {filteredPrograms.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.category !== program.categoryGroup ? `${program.competitionName} (${program.category})` : program.competitionName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={noneValue}>Best matching template</SelectItem>
                      {matchingTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.position} className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Badge variant="outline">Position {entry.position}</Badge>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <div className="space-y-1.5 lg:col-span-2">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</Label>
                          <Input value={entry.name} onChange={(event) => patchEntry(entry.position, { name: event.target.value })} />
                        </div>
                        <div className="space-y-1.5 lg:col-span-1">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</Label>
                          <Select value={entry.unit} onValueChange={(value) => patchEntry(entry.position, { unit: value as ResultEntry["unit"] })}>
                            <SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {UNIT_LIST.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 lg:col-span-1">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Chest
                            <span className="mt-0.5 block text-[11px] font-normal uppercase text-slate-400">Internal</span>
                          </Label>
                          <Input value={entry.chestNumber} onChange={(event) => patchEntry(entry.position, { chestNumber: event.target.value })} />
                        </div>
                        <div className="space-y-1.5 lg:col-span-1">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Code
                            <span className="mt-0.5 block text-[11px] font-normal uppercase text-slate-400">Internal</span>
                          </Label>
                          <Input value={entry.codeLetter} onChange={(event) => patchEntry(entry.position, { codeLetter: event.target.value })} />
                        </div>
                        <div className="space-y-1.5 lg:col-span-1">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Points
                            <span className="mt-0.5 block text-[11px] font-normal uppercase text-slate-400">Internal</span>
                          </Label>
                          <Input value={entry.points} onChange={(event) => patchEntry(entry.position, { points: event.target.value })} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={publish} disabled={saving || !selectedProgram} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish Result
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              <Card>
                <CardHeader>
                  <CardTitle>Selection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="font-semibold text-slate-900">{selectedProgram?.competitionName ?? "No program selected"}</p>
                  {selectedProgram && (
                    <p className="text-slate-500">{selectedProgram.category}</p>
                  )}
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    Result numbers are assigned when a competition is first published and stay fixed on edits.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Poster Preview</CardTitle>
                  <CardDescription>Updates as winner details are entered.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResultPosterPreview template={publishPreviewTemplate} values={publishPreviewValues} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent> : null}

        {mode === "templates" ? <TabsContent value="templates" className="mt-4">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Template Editor</CardTitle>
                    <CardDescription>Upload the poster design and position dynamic result fields inside safe boxes.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setTemplateDraft(buildFreshTemplate())}>
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Edit Existing</Label>
                    <Select value={templateDraft.id || noneValue} onValueChange={(value) => {
                      if (value === noneValue) {
                        setTemplateDraft(buildFreshTemplate());
                        return;
                      }
                      const template = templates.find((item) => item.id === value);
                      if (template) setTemplateDraft({ ...template, resultNumberFormat: "number" });
                    }}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>New template</SelectItem>
                        {templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={templateDraft.name} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Result Number</Label>
                    <Input readOnly value="01" className="bg-slate-50 font-semibold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Select value={templateDraft.scopeType} onValueChange={(value) => setTemplateDraft((prev) => ({ ...prev, scopeType: value as ResultTemplateScopeType, scopeValue: null }))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">All results</SelectItem>
                        <SelectItem value="category">Category specific</SelectItem>
                        <SelectItem value="program">Competition specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Scope Target</Label>
                    <Select
                      value={templateDraft.scopeValue ?? noneValue}
                      disabled={templateDraft.scopeType === "global"}
                      onValueChange={(value) => setTemplateDraft((prev) => ({ ...prev, scopeValue: value === noneValue ? null : value }))}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>No target</SelectItem>
                        {templateScopeOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Width</Label>
                    <Input type="number" value={templateDraft.size.width} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, size: { ...prev.size, width: Number(event.target.value) } }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Poster Height</Label>
                    <Input type="number" value={templateDraft.size.posterHeight} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, size: { ...prev.size, posterHeight: Number(event.target.value) } }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ad Height</Label>
                    <Input type="number" value={templateDraft.size.adHeight} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, size: { ...prev.size, adHeight: Number(event.target.value) } }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Final Ratio</Label>
                    <Input readOnly value={`${templateDraft.size.width}:${templateDraft.size.posterHeight + templateDraft.size.adHeight}`} />
                  </div>
                </div>

                <input ref={templateUploadRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onTemplateFile} />
                <Button variant="outline" onClick={() => templateUploadRef.current?.click()} disabled={saving}>
                  <ImageUp className="h-4 w-4" />
                  Upload Background
                </Button>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Field</Label>
                      <Select value={activeField} onValueChange={(value) => setActiveField(value as ResultFieldKey)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESULT_FIELD_KEYS.map((key) => <SelectItem key={key} value={key}>{fieldLabels[key]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input type="color" value={field.color} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, fields: { ...prev.fields, [activeField]: { ...field, color: event.target.value } } }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select
                        value={field.fontFamily}
                        onValueChange={(value) => setTemplateDraft((prev) => ({
                          ...prev,
                          fields: {
                            ...prev.fields,
                            [activeField]: { ...field, fontFamily: value },
                          },
                        }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Noto Sans Malayalam">Noto Sans Malayalam</SelectItem>
                          <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                          <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                          <SelectItem value="'Merriweather', serif">Merriweather</SelectItem>
                          <SelectItem value="'Oswald', sans-serif">Oswald</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Drag to Position</Label>
                      <Select
                        value={dragEnabled ? "on" : "off"}
                        onValueChange={(value) => setDragEnabled(value === "on")}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">On</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {(["x", "y", "width", "height"] as const).map((key) => (
                      <div key={key} className="space-y-1.5">
                        <Label>{key.toUpperCase()} %</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={Math.round(field[key] * 1000) / 10}
                          onChange={(event) => setTemplateDraft((prev) => ({
                            ...prev,
                            fields: {
                              ...prev.fields,
                              [activeField]: { ...field, [key]: Number(event.target.value) / 100 },
                            },
                          }))}
                        />
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <Label>Font</Label>
                      <Input type="number" value={field.fontSize} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, fields: { ...prev.fields, [activeField]: { ...field, fontSize: Number(event.target.value) } } }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Min Font</Label>
                      <Input type="number" value={field.minFontSize} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, fields: { ...prev.fields, [activeField]: { ...field, minFontSize: Number(event.target.value) } } }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Weight</Label>
                      <Input type="number" step="100" value={field.fontWeight} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, fields: { ...prev.fields, [activeField]: { ...field, fontWeight: Number(event.target.value) } } }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Align</Label>
                      <Select value={field.textAlign} onValueChange={(value) => setTemplateDraft((prev) => ({ ...prev, fields: { ...prev.fields, [activeField]: { ...field, textAlign: value as typeof field.textAlign } } }))}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button onClick={saveTemplate} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>{templateDraft.size.width}x{templateDraft.size.posterHeight} poster, {templateDraft.size.width}x{templateDraft.size.posterHeight + templateDraft.size.adHeight} with ad.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResultPosterPreview
                  template={templateDraft}
                  values={previewValues}
                  editable
                  dragEnabled={dragEnabled}
                  activeField={activeField}
                  onSelectField={(key) => setActiveField(key)}
                  onFieldChange={(key, patch) =>
                    setTemplateDraft((prev) => ({
                      ...prev,
                      fields: {
                        ...prev.fields,
                        [key]: { ...prev.fields[key], ...patch },
                      },
                    }))
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent> : null}

        {mode === "templates" ? <TabsContent value="ads" className="mt-4">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Ad Assignment</CardTitle>
                <CardDescription>Assign sponsor strips by result number range and optional category or competition scope.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Edit Existing</Label>
                    <Select value={adDraft.id || noneValue} onValueChange={(value) => {
                      if (value === noneValue) {
                        setAdDraft((prev) => ({ ...prev, id: "", name: "Sponsor Ad", imageUrl: "" }));
                        return;
                      }
                      const ad = ads.find((item) => item.id === value);
                      if (ad) setAdDraft(ad);
                    }}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>New ad</SelectItem>
                        {ads.map((ad) => <SelectItem key={ad.id} value={ad.id}>{ad.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={adDraft.name} onChange={(event) => setAdDraft((prev) => ({ ...prev, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>From Result</Label>
                    <Input type="number" min="1" value={adDraft.rangeStart} onChange={(event) => setAdDraft((prev) => ({ ...prev, rangeStart: Number(event.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>To Result</Label>
                    <Input type="number" min="1" value={adDraft.rangeEnd} onChange={(event) => setAdDraft((prev) => ({ ...prev, rangeEnd: Number(event.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Select value={adDraft.scopeType} onValueChange={(value) => setAdDraft((prev) => ({ ...prev, scopeType: value as ResultTemplateScopeType, scopeValue: null }))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">All results</SelectItem>
                        <SelectItem value="category">Category specific</SelectItem>
                        <SelectItem value="program">Competition specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Scope Target</Label>
                    <Select
                      value={adDraft.scopeValue ?? noneValue}
                      disabled={adDraft.scopeType === "global"}
                      onValueChange={(value) => setAdDraft((prev) => ({ ...prev, scopeValue: value === noneValue ? null : value }))}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={noneValue}>No target</SelectItem>
                        {adScopeOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <input ref={adUploadRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onAdFile} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => adUploadRef.current?.click()} disabled={saving}>
                    <ImageUp className="h-4 w-4" />
                    Upload Ad
                  </Button>
                  <Button onClick={saveAd} disabled={saving || !adDraft.imageUrl}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Ad
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ad Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {adDraft.imageUrl ? (
                  <img src={adDraft.imageUrl} alt="" className="w-full rounded-lg border border-slate-200 bg-white object-contain" />
                ) : (
                  <div className="flex aspect-[4/1] items-center justify-center rounded-lg border border-dashed text-sm text-slate-500">
                    Upload an ad image
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent> : null}

        {mode === "publish" ? <TabsContent value="published" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Published Results</CardTitle>
              <CardDescription>Generated posters are locked to their result number and assigned ad.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.length ? results.map((result) => (
                <div key={result.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">Result {String(result.resultNumber).padStart(2, "0")} - {result.competitionName}</p>
                    <p className="text-sm text-slate-500">{result.category} · {new Date(result.publishedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.open(posterUrlForResult(result), "_blank", "noopener,noreferrer")}>Open</Button>
                    <Button onClick={() => downloadPoster(posterUrlForResult(result), `result-${result.resultNumber}`)}>Download</Button>
                  </div>
                </div>
              )) : (
                <AdminEmptyState
                  icon={Trophy}
                  title="No results published yet"
                  description="Published result posters will appear here with fixed result numbers, download links, and assigned sponsor ads."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent> : null}
      </Tabs>
    </div>
  );
}
