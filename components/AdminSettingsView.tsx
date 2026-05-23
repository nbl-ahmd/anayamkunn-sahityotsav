"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Clock, Save, Settings2 } from "lucide-react";
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sahithyolsavDate: sahithyolsavDate ? new Date(sahithyolsavDate).toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      const data = (await response.json()) as { settings: AppSettings };
      setSahithyolsavDate(toDatetimeLocalValue(data.settings.sahithyolsavDate));
      toast.success("Settings updated.");
    } catch {
      toast.error("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = sahithyolsavDate ? new Date(sahithyolsavDate).toLocaleString("en-IN") : "Not set";

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
          value="Global"
          detail="Applies to public homepage countdown"
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
    </div>
  );
}
