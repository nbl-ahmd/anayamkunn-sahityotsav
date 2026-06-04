"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Clock, Plus, Save, Settings2, Trash2, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppSettings } from "@/lib/types";
import { toast } from "sonner";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";

function toDatetimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const pad = (num: number) => num.toString().padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function AdminSettingsView() {
  const [sahithyolsavDate, setSahithyolsavDate] = useState("");
  const [unitNames, setUnitNames] = useState<string[]>([]);
  const [newUnitName, setNewUnitName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/admin/settings", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Load failed");
        }

        const data = (await response.json()) as { settings: AppSettings };
        if (cancelled) {
          return;
        }

        setSahithyolsavDate(toDatetimeLocalValue(data.settings.sahithyolsavDate));
        setUnitNames(data.settings.unitNames);
      } catch {
        if (!cancelled) {
          toast.error("Could not load app settings.");
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = async () => {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sahithyolsavDate: sahithyolsavDate ? new Date(sahithyolsavDate).toISOString() : null,
          unitNames,
        }),
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      const data = (await response.json()) as { settings: AppSettings };
      setSahithyolsavDate(toDatetimeLocalValue(data.settings.sahithyolsavDate));
      setUnitNames(data.settings.unitNames);
      toast.success("Settings updated.");
    } catch {
      toast.error("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await saveSettings();
  };

  const dateLabel = sahithyolsavDate ? new Date(sahithyolsavDate).toLocaleString("en-IN") : "Not set";

  const addUnit = () => {
    const normalized = newUnitName.trim().replace(/\s+/g, " ");
    if (!normalized) {
      return;
    }
    if (unitNames.some((unit) => unit.toLowerCase() === normalized.toLowerCase())) {
      toast.error("Unit already exists.");
      return;
    }
    setUnitNames((current) => [...current, normalized]);
    setNewUnitName("");
  };

  const removeUnit = (unitName: string) => {
    if (unitNames.length <= 1) {
      toast.error("At least one unit is required.");
      return;
    }
    setUnitNames((current) => current.filter((unit) => unit !== unitName));
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <AdminMetricCard
          label="Countdown"
          value={sahithyolsavDate ? "Active" : "Hidden"}
          detail={dateLabel}
          icon={Clock}
          tone={sahithyolsavDate ? "emerald" : "amber"}
        />
        <AdminMetricCard
          label="Scope"
          value={unitNames.length}
          detail="Units available in result forms"
          icon={Settings2}
          tone="sky"
        />
      </section>

      <AdminPanel
        title="Sahithyolsav Countdown Date"
        description="Set the target date and time used by the homepage countdown."
        icon={CalendarDays}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sahithyolsav-date">Event date and time</Label>
            <Input
              id="sahithyolsav-date"
              type="datetime-local"
              value={sahithyolsavDate}
              onChange={(event) => setSahithyolsavDate(event.target.value)}
            />
            <p className="text-xs text-slate-500">
              Leave empty to hide countdown values.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Current value: <span className="font-semibold text-slate-900">{dateLabel}</span>
            </p>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title="Unit Names"
        description="Manage the units shown in result-entry dropdowns and result poster data."
        icon={Users}
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newUnitName}
              onChange={(event) => setNewUnitName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addUnit();
                }
              }}
              placeholder="Add unit name"
            />
            <Button type="button" onClick={addUnit} className="gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unitNames.map((unit) => (
              <div key={unit} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="truncate text-sm font-semibold text-slate-900">{unit}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-600"
                  onClick={() => removeUnit(unit)}
                  aria-label={`Remove ${unit}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Save settings to apply units across admin result dropdowns.
            </p>
            <Button type="button" disabled={saving} onClick={saveSettings} className="gap-2">
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Units"}
            </Button>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
