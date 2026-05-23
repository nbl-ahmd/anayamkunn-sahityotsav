"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FAMILY_FRAME_TEMPLATE_ID,
  FONT_OPTIONS,
  UNIT_LIST,
  getDefaultTemplate,
  getFamilyFrameRoute,
} from "@/lib/constants";
import { copyToClipboard, fileToDataUrl } from "@/lib/client-utils";
import { LeaderboardSnapshot, TemplateConfig, TextLayout } from "@/lib/types";
import { FrameCanvas } from "@/components/FrameCanvas";
import { FrameUploader } from "@/components/FrameUploader";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Save,
  RotateCcw,
  Link2,
  Image as ImageIcon,
  Type,
  LayoutTemplate,
  BarChart3,
  Users,
  Crown,
  Layers,
  ExternalLink,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

interface AdminPayload {
  template: TemplateConfig;
  leaderboard: LeaderboardSnapshot;
}

type TextKey = "unit" | "counter" | "family";

const defaultPhotoTransform = { x: 0, y: 0, scale: 1 };

export function AdminDashboard() {
  const [template, setTemplate] = useState<TemplateConfig | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardSnapshot | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string>("");
  const [activePanel, setActivePanel] = useState<"template" | "typography">("template");
  const [activeText, setActiveText] = useState<TextKey>("unit");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [photoTransform, setPhotoTransform] = useState(defaultPhotoTransform);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");
  const [previewWidth, setPreviewWidth] = useState(360);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/template", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Load failed");
        }

        const data = (await response.json()) as AdminPayload;
        if (cancelled) {
          return;
        }

        setTemplate(data.template);
        setLeaderboard(data.leaderboard);
        setSelectedFrameId(data.template.frames[0]?.id ?? "");
      } catch {
        if (!cancelled) {
          toast.error("Could not load dashboard data.");
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const wrap = previewWrapRef.current;
    if (!wrap) {
      return;
    }

    const update = () => {
      setPreviewWidth(Math.max(240, Math.min(620, wrap.clientWidth)));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(wrap);

    return () => observer.disconnect();
  }, []);

  const previewHeight = useMemo(() => {
    if (!template) {
      return Math.round(previewWidth * 1.2);
    }
    const ratio = template.frameViewport.height / template.frameViewport.width;
    return Math.round(previewWidth * ratio);
  }, [previewWidth, template]);

  const selectedFrame = useMemo(() => {
    if (!template) {
      return undefined;
    }
    return template.frames.find((frame) => frame.id === selectedFrameId) ?? template.frames[0];
  }, [selectedFrameId, template]);

  const currentText = useMemo<TextLayout>(() => {
    if (!template) {
      return getDefaultTemplate().unitText;
    }
    if (activeText === "unit") {
      return template.unitText;
    }
    if (activeText === "counter") {
      return template.counterText;
    }
    return template.familyText;
  }, [activeText, template]);

  const currentBackgroundColorInput = useMemo(() => {
    const value = currentText.backgroundColor ?? "";
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : "#334155";
  }, [currentText.backgroundColor]);

  const topUnit = leaderboard?.unitTotals[0];
  const totalFramed = leaderboard?.total ?? 0;
  const activeUnits = leaderboard?.unitTotals.filter((item) => item.count > 0).length ?? 0;
  const frameCount = template?.frames.length ?? 0;

  const setTextLayout = (key: TextKey, next: TextLayout) => {
    setTemplate((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        unitText: key === "unit" ? next : prev.unitText,
        counterText: key === "counter" ? next : prev.counterText,
        familyText: key === "family" ? { ...prev.familyText, ...next } : prev.familyText,
      };
    });
  };

  const patchActiveText = (patch: Partial<TextLayout>) => {
    setTemplate((prev) => {
      if (!prev) {
        return prev;
      }

      const target =
        activeText === "unit"
          ? prev.unitText
          : activeText === "counter"
            ? prev.counterText
            : prev.familyText;
      const next = { ...target, ...patch };

      return {
        ...prev,
        unitText: activeText === "unit" ? next : prev.unitText,
        counterText: activeText === "counter" ? next : prev.counterText,
        familyText: activeText === "family" ? { ...prev.familyText, ...next } : prev.familyText,
      };
    });
  };

  const onSamplePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setPreviewPhoto(dataUrl);
    setPhotoTransform(defaultPhotoTransform);
  };

  const addFrames = (frames: TemplateConfig["frames"]) => {
    setTemplate((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        frames: [...prev.frames, ...frames],
      };
    });

    if (frames[0]) {
      setSelectedFrameId(frames[0].id);
    }
  };

  const removeFrame = (frameId: string) => {
    setTemplate((prev) => {
      if (!prev || prev.frames.length <= 1) {
        return prev;
      }

      const frames = prev.frames.filter((frame) => frame.id !== frameId);
      if (!frames.length) {
        return prev;
      }

      if (selectedFrameId === frameId) {
        setSelectedFrameId(frames[0].id);
      }

      return {
        ...prev,
        frames,
      };
    });
  };

  const moveFrame = (from: number, to: number) => {
    setTemplate((prev) => {
      if (!prev) {
        return prev;
      }
      if (to < 0 || to >= prev.frames.length) {
        return prev;
      }

      const nextFrames = [...prev.frames];
      const [item] = nextFrames.splice(from, 1);
      nextFrames.splice(to, 0, item);

      return {
        ...prev,
        frames: nextFrames,
      };
    });
  };

  const saveTemplate = async () => {
    if (!template) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      const data = (await response.json()) as { template: TemplateConfig };
      setTemplate(data.template);
      toast.success("Template saved successfully.");
    } catch {
      toast.error("Failed to save template. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  const resetTextLayout = () => {
    const defaults = getDefaultTemplate();
    setTemplate((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        unitText: defaults.unitText,
        counterText: defaults.counterText,
        familyText: defaults.familyText,
      };
    });
  };

  const applyVisionPreset = () => {
    const defaults = getDefaultTemplate();
    setTemplate((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        unitText: defaults.unitText,
        counterText: defaults.counterText,
        familyText: defaults.familyText,
      };
    });
    setActiveText("unit");
    toast.success("Vision preset applied. Review and save when ready.");
  };

  const baseLink = origin
    ? `${origin}${getFamilyFrameRoute(template?.id ?? FAMILY_FRAME_TEMPLATE_ID)}`
    : "";

  const copyLink = async (link: string, unit: string) => {
    if (!link) {
      return;
    }

    const ok = await copyToClipboard(link);
    if (ok) {
      toast.success(`Link for ${unit} copied!`);
    } else {
      toast.error("Could not copy link on this browser.");
    }
  };

  const openLink = (link: string) => {
    if (!link) {
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-[400px] border border-dashed rounded-xl bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-medium animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10 xl:gap-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Photos Framed"
          value={totalFramed}
          detail="Total generated framed photos"
          icon={BarChart3}
          tone="sky"
        />
        <AdminMetricCard
          label="Active Units"
          value={activeUnits}
          detail="Units with at least one framed post"
          icon={Users}
          tone="emerald"
        />
        <AdminMetricCard
          label="Leading Unit"
          value={topUnit?.unit ?? "No activity"}
          detail={topUnit ? `${topUnit.count} framed photo(s)` : "Waiting for first framed upload"}
          icon={Crown}
          tone="amber"
        />
        <AdminMetricCard
          label="Frames Uploaded"
          value={frameCount}
          detail={frameCount > 0 ? "Template variants ready to publish" : "Upload at least one frame to go live"}
          icon={Layers}
          tone={frameCount > 0 ? "violet" : "rose"}
        />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Workspace Actions</p>
          <p className="text-xs text-slate-500">Save after adjusting labels, frame order, and placements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={applyVisionPreset} className="bg-white">
            <Wand2 className="mr-2 h-4 w-4" />
            Apply Vision Preset
          </Button>
          <Button variant="outline" onClick={resetTextLayout} className="bg-white">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Typography
          </Button>
          <Button onClick={saveTemplate} disabled={saving} className="gap-2 shadow-sm">
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <div className="order-2 flex flex-col gap-6 xl:order-1">
          <div className="inline-flex w-full max-w-md rounded-lg bg-slate-100/90 p-1">
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                activePanel === "template" ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActivePanel("template")}
            >
              <LayoutTemplate className="h-4 w-4" />
              Template & Frames
            </button>
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                activePanel === "typography" ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActivePanel("typography")}
            >
              <Type className="h-4 w-4" />
              Text Settings
            </button>
          </div>

          {activePanel === "template" ? (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <CardTitle className="text-lg font-semibold text-slate-900">Frames Editor</CardTitle>
                <CardDescription>
                  Upload transparent overlays and choose which frame is active in the live preview.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5 sm:p-6">
                <FrameUploader onFramesAdd={addFrames} />

                {template.frames.length > 0 ? (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">Uploaded Frames</Label>
                    <div className="space-y-2">
                      {template.frames.map((frame, index) => (
                        <div
                          key={frame.id}
                          className={`flex flex-col gap-3 rounded-xl border p-3 transition-all sm:flex-row sm:items-center sm:justify-between ${
                            frame.id === selectedFrame?.id
                              ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex flex-1 items-center gap-3 text-left text-sm font-medium"
                            onClick={() => setSelectedFrameId(frame.id)}
                          >
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                                frame.id === selectedFrame?.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <span
                              className={`truncate ${
                                frame.id === selectedFrame?.id ? "text-primary" : "text-slate-700"
                              }`}
                            >
                              {frame.name}
                            </span>
                          </button>

                          <div className="flex items-center gap-1 rounded-lg border bg-slate-50 p-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="hover:bg-white hover:text-slate-900"
                              onClick={() => moveFrame(index, index - 1)}
                              disabled={index === 0}
                              aria-label={`Move ${frame.name} up`}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="hover:bg-white hover:text-slate-900"
                              onClick={() => moveFrame(index, index + 1)}
                              disabled={index === template.frames.length - 1}
                              aria-label={`Move ${frame.name} down`}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <div className="mx-1 h-4 w-px bg-slate-200"></div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeFrame(frame.id)}
                              aria-label={`Remove ${frame.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">No frame uploaded yet</p>
                      <p className="mt-1 text-sm">
                        Users can generate shares only after at least one frame is uploaded and saved.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <CardTitle className="text-lg font-semibold text-slate-900">Typography Controls</CardTitle>
                <CardDescription>
                  Fine-tune unit and counter labels. You can also drag text directly inside the preview.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                  <div className="mb-6 inline-flex rounded-lg bg-slate-100/90 p-1">
                    <button
                      type="button"
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                        activeText === "unit"
                          ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      onClick={() => setActiveText("unit")}
                    >
                      Unit Text
                    </button>
                    <button
                      type="button"
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                        activeText === "counter"
                          ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      onClick={() => setActiveText("counter")}
                    >
                      Counter Text
                    </button>
                    <button
                      type="button"
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                        activeText === "family"
                          ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      onClick={() => setActiveText("family")}
                    >
                      Family Box
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Font Family
                      </Label>
                      <Select value={currentText.fontFamily} onValueChange={(val) => patchActiveText({ fontFamily: val })}>
                        <SelectTrigger className="w-full bg-slate-50/60">
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font} value={font}>
                              {font.replace(/["']/g, "")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Font Weight
                      </Label>
                      <Select
                        value={currentText.fontWeight.toString()}
                        onValueChange={(val) => patchActiveText({ fontWeight: Number(val) })}
                      >
                        <SelectTrigger className="w-full bg-slate-50/60">
                          <SelectValue placeholder="Select weight" />
                        </SelectTrigger>
                        <SelectContent>
                          {[400, 500, 600, 700, 800].map((weight) => (
                            <SelectItem key={weight} value={weight.toString()}>
                              {weight}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Size</Label>
                        <span className="text-xs font-medium text-primary">{currentText.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={96}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary"
                        value={currentText.fontSize}
                        onChange={(e) => patchActiveText({ fontSize: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Color Hex</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="h-10 w-10 cursor-pointer rounded-md border border-slate-200 bg-slate-50/60 p-1"
                          value={currentText.color}
                          onChange={(e) => patchActiveText({ color: e.target.value })}
                        />
                        <Input
                          value={currentText.color}
                          onChange={(e) => patchActiveText({ color: e.target.value })}
                          className="flex-1 bg-slate-50/60 font-mono text-sm uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Badge / Box Color
                      </Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="h-10 w-10 cursor-pointer rounded-md border border-slate-200 bg-slate-50/60 p-1"
                          value={currentBackgroundColorInput}
                          onChange={(e) => patchActiveText({ backgroundColor: e.target.value })}
                        />
                        <Input
                          value={currentText.backgroundColor ?? "#334155"}
                          onChange={(e) => patchActiveText({ backgroundColor: e.target.value })}
                          className="flex-1 bg-slate-50/60 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Show Background Box
                      </Label>
                      <Select
                        value={(currentText.showBackground ?? true) ? "on" : "off"}
                        onValueChange={(val) => patchActiveText({ showBackground: val === "on" })}
                      >
                        <SelectTrigger className="w-full bg-slate-50/60">
                          <SelectValue placeholder="Background" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">On</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Text Align
                      </Label>
                      <Select
                        value={currentText.textAlign ?? "center"}
                        onValueChange={(val: "left" | "center" | "right") =>
                          patchActiveText({ textAlign: val })
                        }
                      >
                        <SelectTrigger className="w-full bg-slate-50/60">
                          <SelectValue placeholder="Alignment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Roundness
                        </Label>
                        <span className="text-xs font-medium text-slate-500">
                          {Math.round(currentText.borderRadius ?? 10)}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary"
                        value={Math.round(currentText.borderRadius ?? 10)}
                        onChange={(e) => patchActiveText({ borderRadius: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          X Position
                        </Label>
                        <span className="text-xs font-medium text-slate-500">
                          {Math.round(currentText.x * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={95}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary"
                        value={Math.round(currentText.x * 100)}
                        onChange={(e) => patchActiveText({ x: Number(e.target.value) / 100 })}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Y Position
                        </Label>
                        <span className="text-xs font-medium text-slate-500">
                          {Math.round(currentText.y * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={95}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary"
                        value={Math.round(currentText.y * 100)}
                        onChange={(e) => patchActiveText({ y: Number(e.target.value) / 100 })}
                      />
                    </div>

                    {activeText === "family" && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Box Width
                            </Label>
                            <span className="text-xs font-medium text-slate-500">
                              {Math.round(template.familyText.width * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={8}
                            max={90}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary"
                            value={Math.round(template.familyText.width * 100)}
                            onChange={(e) =>
                              setTemplate((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      familyText: {
                                        ...prev.familyText,
                                        width: Number(e.target.value) / 100,
                                      },
                                    }
                                  : prev,
                              )
                            }
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Box Height
                            </Label>
                            <span className="text-xs font-medium text-slate-500">
                              {Math.round(template.familyText.height * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={6}
                            max={50}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary"
                            value={Math.round(template.familyText.height * 100)}
                            onChange={(e) =>
                              setTemplate((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      familyText: {
                                        ...prev.familyText,
                                        height: Number(e.target.value) / 100,
                                      },
                                    }
                                  : prev,
                              )
                            }
                          />
                        </div>

                      </>
                    )}
                  </div>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Link2 className="h-5 w-5 text-primary" />
                Rapid Links
              </CardTitle>
              <CardDescription>
                Share pre-generated unit links with volunteers. Each link opens the framing flow with that unit locked.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {UNIT_LIST.map((unit) => {
                  const link = `${baseLink}?unit=${encodeURIComponent(unit)}`;
                  const unitCount = leaderboard?.unitTotals.find((entry) => entry.unit === unit)?.count ?? 0;

                  return (
                    <div key={unit} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="truncate font-semibold text-slate-800">{unit}</span>
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                          {unitCount} framed
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => copyLink(link, unit)}
                          disabled={!baseLink}
                          className="flex-1 gap-1.5"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openLink(link)}
                          disabled={!baseLink}
                          className="gap-1.5 bg-white"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="order-1 xl:order-2">
          <div className="space-y-4 xl:sticky xl:top-6">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm ring-1 ring-black/[0.03]">
              <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900">Live Preview</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Drag the labels directly on canvas and preview how the final frame will look.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="group relative overflow-hidden">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onSamplePhoto}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    />
                    <Button variant="outline" size="sm" className="pointer-events-none gap-2 bg-white text-xs">
                      <ImageIcon className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors" />
                      {previewPhoto ? "Replace sample" : "Upload sample"}
                    </Button>
                  </div>

                  {previewPhoto && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => {
                        setPreviewPhoto(null);
                        setPhotoTransform(defaultPhotoTransform);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                <p className="mb-4 text-xs text-slate-500">
                  Family name input is now in the user-facing flow. Preview shows a sample value for layout testing.
                </p>

                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {activeText === "unit"
                      ? "Editing unit text"
                      : activeText === "counter"
                        ? "Editing counter text"
                        : "Editing family box"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    {selectedFrame ? selectedFrame.name : "No frame selected"}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,_#ffffff,_#f1f5f9)] p-3 sm:p-5">
                  <div
                    ref={previewWrapRef}
                    className="relative mx-auto flex w-full max-w-[420px] items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-black/10 ring-1 ring-black/5"
                    style={{
                      aspectRatio: template
                        ? `${template.frameViewport.width} / ${template.frameViewport.height}`
                        : "1/1",
                    }}
                  >
                    <FrameCanvas
                      frameImage={selectedFrame?.image}
                      photo={previewPhoto}
                      width={previewWidth}
                      height={previewHeight}
                      unitLabel="Karassery Unit"
                      familyName="Sample Family Name for Preview"
                      counterLabel="#128"
                      unitText={template.unitText}
                      counterText={template.counterText}
                      familyText={template.familyText}
                      photoTransform={photoTransform}
                      onPhotoTransformChange={setPhotoTransform}
                      editableText
                      activeText={activeText}
                      onActiveTextChange={setActiveText}
                      onUnitTextChange={(next) => setTextLayout("unit", next)}
                      onCounterTextChange={(next) => setTextLayout("counter", next)}
                      onFamilyTextChange={(next) =>
                        setTemplate((prev) =>
                          prev
                            ? {
                                ...prev,
                                familyText: next,
                              }
                            : prev,
                        )
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Tip</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  On touch devices, drag text with one finger and pinch to resize. Use the sliders for precise
                  positioning before saving.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
