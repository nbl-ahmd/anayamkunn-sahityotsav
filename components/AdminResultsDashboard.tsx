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
import { buildDefaultResultTemplate, clonePositionMarkers } from "@/lib/results-defaults";
import { RESULT_FONT_OPTIONS } from "@/lib/results-fonts";
import { positionFieldKeys } from "@/lib/results-layout";
import {
  RESULT_CATEGORY_GROUPS,
  RESULT_FIELD_KEYS,
  RESULT_POSITION_KEYS,
  ResultAdConfig,
  ResultEntry,
  ResultFieldKey,
  ResultLayoutOverride,
  ResultPositionKey,
  ResultPositionMarker,
  ResultProgram,
  ResultsAdminSnapshot,
  ResultTemplateConfig,
  ResultTemplateFields,
  ResultTemplatePositionMarkers,
  ResultTemplateScopeType,
  ResultTextBox,
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
const posterRenderVersion = "path-marker-v1";

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

const winnerNameFields: ResultFieldKey[] = ["firstName", "secondName", "thirdName"];
const winnerUnitFields: ResultFieldKey[] = ["firstUnit", "secondUnit", "thirdUnit"];

type PublishLayoutTarget = "field" | "winnerNames" | "winnerUnits";

const positionLabels: Record<ResultPositionKey, string> = {
  first: "1st Position",
  second: "2nd Position",
  third: "3rd Position",
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

function cloneFields(fields: ResultTemplateFields): ResultTemplateFields {
  return RESULT_FIELD_KEYS.reduce((next, key) => ({
    ...next,
    [key]: { ...fields[key] },
  }), {} as ResultTemplateFields);
}

function cloneLayout(template: ResultTemplateConfig): ResultLayoutOverride {
  return {
    fields: cloneFields(template.fields),
    positionMarkers: clonePositionMarkers(template.positionMarkers),
  };
}

function defaultShapeMarker(position: ResultPositionKey): ResultPositionMarker {
  const index = RESULT_POSITION_KEYS.indexOf(position);
  const y = [0.47, 0.61, 0.75][index] ?? 0.47;
  const colors = position === "first"
    ? ["#f43f5e"]
    : position === "second"
      ? ["#f5c542", "#f43f5e"]
      : ["#5b0f6b", "#f5c542", "#f43f5e"];
  return {
    mode: "shape",
    visible: true,
    x: 0.17,
    y,
    width: 0.026,
    height: 0.026,
    repeat: index + 1,
    direction: "horizontal",
    gap: 0.008,
    shape: "square",
    colors,
    rotation: 0,
    opacity: 1,
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

function scopePriority(
  item: { scopeType: ResultTemplateScopeType; scopeValue: string | null },
  program: ResultProgram,
): number {
  if (item.scopeType === "program" && item.scopeValue === program.id) return 4;
  if (item.scopeType === "category" && item.scopeValue === program.category) return 3;
  if (item.scopeType === "category" && item.scopeValue === program.categoryGroup) return 2;
  if (item.scopeType === "global") return 1;
  return 0;
}

function resolvePreviewAd(ads: ResultAdConfig[], resultNumber: number, program: ResultProgram | undefined): ResultAdConfig | null {
  if (!program) {
    return null;
  }

  return ads
    .filter((ad) => ad.active && ad.imageUrl && ad.rangeStart <= resultNumber && ad.rangeEnd >= resultNumber)
    .filter((ad) => {
      if (ad.scopeType === "global") return true;
      if (ad.scopeType === "program") return ad.scopeValue === program.id;
      return ad.scopeValue === program.category || ad.scopeValue === program.categoryGroup;
    })
    .sort((left, right) => scopePriority(right, program) - scopePriority(left, program))[0] ?? null;
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
  const [visiblePositions, setVisiblePositions] = useState<Record<2 | 3, boolean>>({ 2: true, 3: true });
  const [publishLayoutOpen, setPublishLayoutOpen] = useState(false);
  const [publishLayoutDraft, setPublishLayoutDraft] = useState<ResultLayoutOverride | null>(null);
  const [publishActiveField, setPublishActiveField] = useState<ResultFieldKey>("firstName");
  const [publishActiveMarker, setPublishActiveMarker] = useState<ResultPositionKey>("first");
  const [publishLayoutTarget, setPublishLayoutTarget] = useState<PublishLayoutTarget>("field");
  const [publishDragEnabled, setPublishDragEnabled] = useState(true);
  const [templateDraft, setTemplateDraft] = useState<ResultTemplateConfig>(buildFreshTemplate);
  const [activeField, setActiveField] = useState<ResultFieldKey>("competitionName");
  const [templateLayoutTarget, setTemplateLayoutTarget] = useState<PublishLayoutTarget>("field");
  const [activeMarker, setActiveMarker] = useState<ResultPositionKey>("first");
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
  const markerUploadRef = useRef<HTMLInputElement>(null);
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

  const publishBaseTemplate = useMemo(() => {
    const selectedTemplate = templateId !== noneValue
      ? templates.find((template) => template.id === templateId)
      : undefined;

    return selectedTemplate ?? matchingTemplates[0] ?? templates[0] ?? buildDefaultResultTemplate();
  }, [matchingTemplates, templateId, templates]);

  useEffect(() => {
    if (publishLayoutOpen) {
      setPublishLayoutDraft(cloneLayout(publishBaseTemplate));
    }
  }, [publishBaseTemplate, publishLayoutOpen]);

  const publishPreviewTemplate = useMemo<ResultTemplateConfig>(() => ({
    ...publishBaseTemplate,
    fields: publishLayoutOpen && publishLayoutDraft ? publishLayoutDraft.fields : publishBaseTemplate.fields,
    positionMarkers:
      publishLayoutOpen && publishLayoutDraft?.positionMarkers
        ? publishLayoutDraft.positionMarkers
        : publishBaseTemplate.positionMarkers,
  }), [publishBaseTemplate, publishLayoutDraft, publishLayoutOpen]);

  const existingSelectedResult = useMemo(
    () => results.find((result) => result.programId === selectedProgram?.id),
    [results, selectedProgram?.id],
  );

  const publishPreviewResultNumber = existingSelectedResult?.resultNumber ?? results.length + 1;
  const publishPreviewAd = useMemo(() => {
    if (existingSelectedResult?.adId) {
      return ads.find((ad) => ad.id === existingSelectedResult.adId) ?? null;
    }

    return resolvePreviewAd(ads, publishPreviewResultNumber, selectedProgram);
  }, [ads, existingSelectedResult?.adId, publishPreviewResultNumber, selectedProgram]);

  const publishPreviewValues = useMemo<Record<ResultFieldKey, string>>(() => {
    const padded = String(publishPreviewResultNumber).padStart(2, "0");
    const byPosition = new Map(entries.map((entry) => [entry.position, entry]));
    const first = byPosition.get(1);
    const second = byPosition.get(2);
    const third = byPosition.get(3);
    const hasSecond = visiblePositions[2];
    const hasThird = visiblePositions[3];

    return {
      resultNumber: padded,
      categoryName: selectedProgram?.category ?? category,
      competitionName: selectedProgram?.publicCompetitionName ?? "Competition",
      firstPosition: "1",
      firstName: first?.name.trim() || "First winner name",
      firstUnit: first?.unit ?? UNIT_LIST[0],
      secondPosition: hasSecond ? "2" : "",
      secondName: hasSecond ? second?.name.trim() || "Second winner name" : "",
      secondUnit: hasSecond ? second?.unit ?? UNIT_LIST[1] : "",
      thirdPosition: hasThird ? "3" : "",
      thirdName: hasThird ? third?.name.trim() || "Third winner name" : "",
      thirdUnit: hasThird ? third?.unit ?? UNIT_LIST[2] : "",
    };
  }, [category, entries, publishPreviewResultNumber, selectedProgram, visiblePositions]);

  const patchEntry = (position: 1 | 2 | 3, patch: Partial<ResultEntry>) => {
    setEntries((prev) => prev.map((entry) => (entry.position === position ? { ...entry, ...patch } : entry)));
  };

  const clearEntry = (position: 2 | 3) => {
    setVisiblePositions((prev) => ({ ...prev, [position]: false }));
    setEntries((prev) =>
      prev.map((entry) =>
        entry.position === position
          ? {
              ...entry,
              name: "",
              chestNumber: "",
              codeLetter: "",
              points: "",
            }
          : entry,
      ),
    );
  };

  const showEntry = (position: 2 | 3) => {
    setVisiblePositions((prev) => ({ ...prev, [position]: true }));
  };

  const setPublishLayoutEnabled = (enabled: boolean) => {
    setPublishLayoutOpen(enabled);
    setPublishLayoutDraft(enabled ? cloneLayout(publishBaseTemplate) : null);
  };

  const publishTargetFields = useMemo(() => {
    if (publishLayoutTarget === "winnerNames") {
      return winnerNameFields;
    }
    if (publishLayoutTarget === "winnerUnits") {
      return winnerUnitFields;
    }
    return [publishActiveField];
  }, [publishActiveField, publishLayoutTarget]);

  const patchPublishField = (key: ResultFieldKey, patch: Partial<ResultTextBox>) => {
    setPublishLayoutDraft((current) => {
      const draft = current ?? cloneLayout(publishBaseTemplate);
      return {
        ...draft,
        fields: {
          ...draft.fields,
          [key]: {
            ...draft.fields[key],
            ...patch,
          },
        },
      };
    });
  };

  const patchPublishTarget = (patch: Partial<ResultTextBox>) => {
    setPublishLayoutDraft((current) => {
      const draft = current ?? cloneLayout(publishBaseTemplate);
      return {
        ...draft,
        fields: publishTargetFields.reduce((next, key) => ({
          ...next,
          [key]: {
            ...next[key],
            ...patch,
          },
        }), draft.fields),
      };
    });
  };

  const patchPublishMarker = (key: ResultPositionKey, marker: ResultPositionMarker) => {
    setPublishLayoutDraft((current) => {
      const draft = current ?? cloneLayout(publishBaseTemplate);
      return {
        ...draft,
        positionMarkers: {
          ...(draft.positionMarkers ?? clonePositionMarkers(publishBaseTemplate.positionMarkers)),
          [key]: marker,
        },
      };
    });
  };

  const resetPublishLayout = () => {
    setPublishLayoutDraft(cloneLayout(publishBaseTemplate));
  };

  const templateTargetFields = useMemo(() => {
    if (templateLayoutTarget === "winnerNames") {
      return winnerNameFields;
    }
    if (templateLayoutTarget === "winnerUnits") {
      return winnerUnitFields;
    }
    return [activeField];
  }, [activeField, templateLayoutTarget]);

  const patchTemplateTarget = (patch: Partial<ResultTextBox>) => {
    setTemplateDraft((prev) => ({
      ...prev,
      fields: templateTargetFields.reduce((fields, key) => ({
        ...fields,
        [key]: {
          ...fields[key],
          ...patch,
        },
      }), prev.fields),
    }));
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

  const onMarkerFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const uploaded = await uploadAsset(file, "template");
      setTemplateDraft((prev) => ({
        ...prev,
        positionMarkers: {
          ...prev.positionMarkers,
          [activeMarker]: {
            mode: "image",
            visible: true,
            x: 0.17,
            y: activeMarker === "first" ? 0.47 : activeMarker === "second" ? 0.61 : 0.75,
            width: 0.06,
            height: 0.06,
            imageUrl: uploaded.url,
            opacity: 1,
          },
        },
      }));
      toast.success(`Marker image uploaded (${uploaded.width}x${uploaded.height}).`);
    } catch {
      toast.error("Could not upload marker image.");
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
          layoutOverride: publishLayoutOpen && publishLayoutDraft ? publishLayoutDraft : null,
          entries,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Publish failed");
      }
      toast.success("Result published and poster generated.");
      setEntries(emptyEntries);
      setVisiblePositions({ 2: true, 3: true });
      setPublishLayoutOpen(false);
      setPublishLayoutDraft(null);
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

  const templateLayoutReferenceKey = templateLayoutTarget === "winnerNames"
    ? "firstName"
    : templateLayoutTarget === "winnerUnits"
      ? "firstUnit"
      : activeField;
  const field = templateDraft.fields[templateLayoutReferenceKey];
  const marker = templateDraft.positionMarkers[activeMarker];
  const publishLayoutReferenceKey = publishLayoutTarget === "winnerNames"
    ? "firstName"
    : publishLayoutTarget === "winnerUnits"
      ? "firstUnit"
      : publishActiveField;
  const publishLayoutField = publishPreviewTemplate.fields[publishLayoutReferenceKey];
  const patchTemplateMarker = (key: ResultPositionKey, nextMarker: ResultPositionMarker) => {
    setTemplateDraft((prev) => ({
      ...prev,
      positionMarkers: {
        ...prev.positionMarkers,
        [key]: nextMarker,
      },
    }));
  };
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
  const templatePreviewAd = adDraft.imageUrl
    ? adDraft
    : ads.find((ad) => ad.active && ad.imageUrl) ?? null;
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

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-950">Poster text adjustment</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Optional per-result layout controls for long names or spacing fixes.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={publishLayoutOpen ? "default" : "outline"}
                      onClick={() => setPublishLayoutEnabled(!publishLayoutOpen)}
                    >
                      {publishLayoutOpen ? "Hide Controls" : "Adjust Text"}
                    </Button>
                  </div>

                  {publishLayoutOpen ? (
                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adjust</Label>
                          <Select value={publishLayoutTarget} onValueChange={(value) => setPublishLayoutTarget(value as PublishLayoutTarget)}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="field">Selected field</SelectItem>
                              <SelectItem value="winnerNames">All winner names</SelectItem>
                              <SelectItem value="winnerUnits">All winner units</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Field</Label>
                          <Select
                            value={publishActiveField}
                            onValueChange={(value) => {
                              setPublishActiveField(value as ResultFieldKey);
                              setPublishLayoutTarget("field");
                            }}
                          >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {RESULT_FIELD_KEYS.map((key) => <SelectItem key={key} value={key}>{fieldLabels[key]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drag on preview</Label>
                          <Select value={publishDragEnabled ? "on" : "off"} onValueChange={(value) => setPublishDragEnabled(value === "on")}>
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
                            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key.toUpperCase()} %</Label>
                            <Input
                              type="number"
                              step="0.5"
                              value={Math.round(publishLayoutField[key] * 1000) / 10}
                              onChange={(event) => patchPublishTarget({ [key]: Number(event.target.value) / 100 })}
                            />
                          </div>
                        ))}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Font</Label>
                          <Input type="number" value={publishLayoutField.fontSize} onChange={(event) => patchPublishTarget({ fontSize: Number(event.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Min Font</Label>
                          <Input type="number" value={publishLayoutField.minFontSize} onChange={(event) => patchPublishTarget({ minFontSize: Number(event.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line Height</Label>
                          <Input type="number" step="0.05" value={publishLayoutField.lineHeight} onChange={(event) => patchPublishTarget({ lineHeight: Number(event.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Align</Label>
                          <Select value={publishLayoutField.textAlign} onValueChange={(value) => patchPublishTarget({ textAlign: value as ResultTextBox["textAlign"] })}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vertical</Label>
                          <Select value={publishLayoutField.verticalAlign} onValueChange={(value) => patchPublishTarget({ verticalAlign: value as ResultTextBox["verticalAlign"] })}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">Top</SelectItem>
                              <SelectItem value="middle">Middle</SelectItem>
                              <SelectItem value="bottom">Bottom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs leading-5 text-slate-500">
                          These changes are saved only with this result poster and will not update the selected template.
                        </p>
                        <Button type="button" variant="outline" onClick={resetPublishLayout}>Reset Layout</Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {entries.map((entry) => {
                    const optionalPosition = entry.position > 1 ? entry.position as 2 | 3 : null;
                    const visible = optionalPosition ? visiblePositions[optionalPosition] : true;

                    if (!visible && optionalPosition) {
                      return (
                        <div key={entry.position} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900">Position {entry.position} omitted</p>
                            <p className="mt-1 text-xs text-slate-500">This placement will not appear in the poster.</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => showEntry(optionalPosition)}>
                            Add
                          </Button>
                        </div>
                      );
                    }

                    return (
                    <div key={entry.position} className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Badge variant="outline">Position {entry.position}</Badge>
                        {optionalPosition ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-7 px-2 text-xs text-slate-500 hover:text-slate-950"
                            onClick={() => clearEntry(optionalPosition)}
                          >
                            Remove
                          </Button>
                        ) : null}
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
                    );
                  })}
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
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    Sponsor ad: <span className="font-semibold text-slate-900">{publishPreviewAd?.name ?? "No ad assigned"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Final Poster Preview</CardTitle>
                  <CardDescription>Shows the generated poster with the assigned sponsor ad when one applies.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResultPosterPreview
                    template={publishPreviewTemplate}
                    values={publishPreviewValues}
                    ad={publishPreviewAd}
                    editable={publishLayoutOpen}
                    dragEnabled={publishDragEnabled}
                    activeField={publishActiveField}
                    activeMarker={publishActiveMarker}
                    onSelectField={(key) => {
                      setPublishActiveField(key);
                      setPublishLayoutTarget("field");
                    }}
                    onSelectMarker={setPublishActiveMarker}
                    onFieldChange={patchPublishField}
                    onMarkerChange={patchPublishMarker}
                  />
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
                      <Label>Adjust</Label>
                      <Select value={templateLayoutTarget} onValueChange={(value) => setTemplateLayoutTarget(value as PublishLayoutTarget)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="field">Selected field</SelectItem>
                          <SelectItem value="winnerNames">All winner names</SelectItem>
                          <SelectItem value="winnerUnits">All winner units</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Field</Label>
                      <Select value={activeField} onValueChange={(value) => {
                        setActiveField(value as ResultFieldKey);
                        setTemplateLayoutTarget("field");
                      }}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESULT_FIELD_KEYS.map((key) => <SelectItem key={key} value={key}>{fieldLabels[key]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input type="color" value={field.color} onChange={(event) => patchTemplateTarget({ color: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select
                        value={field.fontFamily}
                        onValueChange={(value) => patchTemplateTarget({ fontFamily: value })}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESULT_FONT_OPTIONS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                          ))}
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
                          onChange={(event) => patchTemplateTarget({ [key]: Number(event.target.value) / 100 })}
                        />
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <Label>Font</Label>
                      <Input type="number" value={field.fontSize} onChange={(event) => patchTemplateTarget({ fontSize: Number(event.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Min Font</Label>
                      <Input type="number" value={field.minFontSize} onChange={(event) => patchTemplateTarget({ minFontSize: Number(event.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Weight</Label>
                      <Input type="number" step="100" value={field.fontWeight} onChange={(event) => patchTemplateTarget({ fontWeight: Number(event.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Line Height</Label>
                      <Input type="number" step="0.05" value={field.lineHeight} onChange={(event) => patchTemplateTarget({ lineHeight: Number(event.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Align</Label>
                      <Select value={field.textAlign} onValueChange={(value) => patchTemplateTarget({ textAlign: value as typeof field.textAlign })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Vertical</Label>
                      <Select value={field.verticalAlign} onValueChange={(value) => patchTemplateTarget({ verticalAlign: value as typeof field.verticalAlign })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="middle">Middle</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">Position Marker</p>
                      <p className="text-xs text-slate-500">Use numbers, square groups, dots, images, or hide markers for creative templates.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const defaults = buildDefaultResultTemplate();
                          setTemplateDraft((prev) => ({
                            ...prev,
                            positionMarkers: clonePositionMarkers(defaults.positionMarkers),
                          }));
                        }}
                      >
                        Numbers
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTemplateDraft((prev) => ({
                          ...prev,
                          positionMarkers: RESULT_POSITION_KEYS.reduce((next, key) => ({
                            ...next,
                            [key]: defaultShapeMarker(key),
                          }), {} as ResultTemplatePositionMarkers),
                        }))}
                      >
                        Square Stack
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTemplateDraft((prev) => ({
                          ...prev,
                          positionMarkers: RESULT_POSITION_KEYS.reduce((next, key) => ({
                            ...next,
                            [key]: {
                              ...defaultShapeMarker(key),
                              shape: "circle",
                            },
                          }), {} as ResultTemplatePositionMarkers),
                        }))}
                      >
                        Dot Stack
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTemplateDraft((prev) => ({
                          ...prev,
                          positionMarkers: RESULT_POSITION_KEYS.reduce((next, key) => ({
                            ...next,
                            [key]: { mode: "hidden", visible: false },
                          }), {} as ResultTemplatePositionMarkers),
                        }))}
                      >
                        Hide
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select value={activeMarker} onValueChange={(value) => setActiveMarker(value as ResultPositionKey)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESULT_POSITION_KEYS.map((key) => <SelectItem key={key} value={key}>{positionLabels[key]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Marker Type</Label>
                      <Select
                        value={marker.mode}
                        onValueChange={(value) => {
                          if (value === "hidden") {
                            patchTemplateMarker(activeMarker, { mode: "hidden", visible: false });
                            return;
                          }
                          if (value === "shape") {
                            patchTemplateMarker(activeMarker, defaultShapeMarker(activeMarker));
                            return;
                          }
                          if (value === "image") {
                            patchTemplateMarker(activeMarker, {
                              mode: "image",
                              visible: true,
                              x: marker.mode === "text" ? marker.box.x : marker.mode === "hidden" ? 0.17 : marker.x,
                              y: marker.mode === "text" ? marker.box.y : marker.mode === "hidden" ? 0.47 : marker.y,
                              width: 0.06,
                              height: 0.06,
                              imageUrl: "",
                              opacity: 1,
                            });
                            return;
                          }
                          const textBox = marker.mode === "text"
                            ? marker.box
                            : templateDraft.fields[positionFieldKeys[activeMarker]];
                          patchTemplateMarker(activeMarker, {
                            mode: "text",
                            visible: true,
                            text: activeMarker === "first" ? "1" : activeMarker === "second" ? "2" : "3",
                            box: { ...textBox },
                          });
                        }}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text Number</SelectItem>
                          <SelectItem value="shape">Shape Group</SelectItem>
                          <SelectItem value="image">Image/Icon</SelectItem>
                          <SelectItem value="hidden">Hidden</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Drag to Position</Label>
                      <Select value={dragEnabled ? "on" : "off"} onValueChange={(value) => setDragEnabled(value === "on")}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">On</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {marker.mode === "text" ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label>Text</Label>
                        <Input value={marker.text} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, text: event.target.value })} />
                      </div>
                      {(["x", "y", "width", "height"] as const).map((key) => (
                        <div key={key} className="space-y-1.5">
                          <Label>{key.toUpperCase()} %</Label>
                          <Input type="number" step="0.5" value={Math.round(marker.box[key] * 1000) / 10} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, box: { ...marker.box, [key]: Number(event.target.value) / 100 } })} />
                        </div>
                      ))}
                      <div className="space-y-1.5">
                        <Label>Font</Label>
                        <Input type="number" value={marker.box.fontSize} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, box: { ...marker.box, fontSize: Number(event.target.value) } })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Weight</Label>
                        <Input type="number" step="100" value={marker.box.fontWeight} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, box: { ...marker.box, fontWeight: Number(event.target.value) } })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Color</Label>
                        <Input type="color" value={marker.box.color} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, box: { ...marker.box, color: event.target.value } })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Font Family</Label>
                        <Select value={marker.box.fontFamily} onValueChange={(value) => patchTemplateMarker(activeMarker, { ...marker, box: { ...marker.box, fontFamily: value } })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RESULT_FONT_OPTIONS.map((font) => (
                              <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  {marker.mode === "shape" ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      {(["x", "y", "width", "height"] as const).map((key) => (
                        <div key={key} className="space-y-1.5">
                          <Label>{key.toUpperCase()} %</Label>
                          <Input type="number" step="0.5" value={Math.round(marker[key] * 1000) / 10} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, [key]: Number(event.target.value) / 100 })} />
                        </div>
                      ))}
                      <div className="space-y-1.5">
                        <Label>Repeat</Label>
                        <Input type="number" value={marker.repeat} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, repeat: Number(event.target.value) })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Gap %</Label>
                        <Input type="number" step="0.2" value={Math.round(marker.gap * 1000) / 10} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, gap: Number(event.target.value) / 100 })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Shape</Label>
                        <Select value={marker.shape} onValueChange={(value) => patchTemplateMarker(activeMarker, { ...marker, shape: value as typeof marker.shape })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="square">Square</SelectItem>
                            <SelectItem value="roundedSquare">Rounded Square</SelectItem>
                            <SelectItem value="circle">Circle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Direction</Label>
                        <Select value={marker.direction} onValueChange={(value) => patchTemplateMarker(activeMarker, { ...marker, direction: value as typeof marker.direction })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="horizontal">Horizontal</SelectItem>
                            <SelectItem value="vertical">Vertical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Rotation</Label>
                        <Input type="number" value={marker.rotation} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, rotation: Number(event.target.value) })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Opacity</Label>
                        <Input type="number" step="0.05" value={marker.opacity} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, opacity: Number(event.target.value) })} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Colors</Label>
                        <Input value={marker.colors.join(", ")} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, colors: event.target.value.split(",").map((color) => color.trim()).filter(Boolean) })} />
                      </div>
                    </div>
                  ) : null}

                  {marker.mode === "image" ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <input ref={markerUploadRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onMarkerFile} />
                      <Button type="button" variant="outline" onClick={() => markerUploadRef.current?.click()} disabled={saving}>
                        <ImageUp className="h-4 w-4" />
                        Upload Icon
                      </Button>
                      {(["x", "y", "width", "height"] as const).map((key) => (
                        <div key={key} className="space-y-1.5">
                          <Label>{key.toUpperCase()} %</Label>
                          <Input type="number" step="0.5" value={Math.round(marker[key] * 1000) / 10} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, [key]: Number(event.target.value) / 100 })} />
                        </div>
                      ))}
                      <div className="space-y-1.5">
                        <Label>Opacity</Label>
                        <Input type="number" step="0.05" value={marker.opacity} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, opacity: Number(event.target.value) })} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-3">
                        <Label>Image URL</Label>
                        <Input value={marker.imageUrl} onChange={(event) => patchTemplateMarker(activeMarker, { ...marker, imageUrl: event.target.value })} />
                      </div>
                    </div>
                  ) : null}
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
                  ad={templatePreviewAd}
                  editable
                  dragEnabled={dragEnabled}
                  activeField={activeField}
                  activeMarker={activeMarker}
                  onSelectField={(key) => setActiveField(key)}
                  onSelectMarker={setActiveMarker}
                  onFieldChange={(key, patch) =>
                    setTemplateDraft((prev) => ({
                      ...prev,
                      fields: {
                        ...prev.fields,
                        [key]: { ...prev.fields[key], ...patch },
                      },
                    }))
                  }
                  onMarkerChange={patchTemplateMarker}
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
