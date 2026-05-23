"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, RotateCcw, Save, TrendingUp, Users } from "lucide-react";
import { UNIT_LIST } from "@/lib/constants";
import { LeaderboardSnapshot, ManualUnitCountMap } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminPanel } from "@/components/admin/AdminPanel";

function zeroCounts(): ManualUnitCountMap {
  return Object.fromEntries(UNIT_LIST.map((unit) => [unit, 0])) as ManualUnitCountMap;
}

export function AdminManualCountsView() {
  const [manualUnitCounts, setManualUnitCounts] = useState<ManualUnitCountMap>(zeroCounts());
  const [leaderboard, setLeaderboard] = useState<LeaderboardSnapshot | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/admin/template", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Load failed");
        }

        const data = (await response.json()) as {
          leaderboard: LeaderboardSnapshot;
          manualUnitCounts: ManualUnitCountMap;
        };

        if (cancelled) {
          return;
        }

        setLeaderboard(data.leaderboard);
        setManualUnitCounts(data.manualUnitCounts);
      } catch {
        if (!cancelled) {
          toast.error("Could not load manual count data.");
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateManualUnitCount = (unit: (typeof UNIT_LIST)[number], nextValue: string) => {
    const numeric = Number(nextValue);
    const normalized = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;

    setManualUnitCounts((prev) => ({
      ...prev,
      [unit]: normalized,
    }));
  };

  const totalManual = useMemo(
    () => Object.values(manualUnitCounts).reduce((sum, value) => sum + value, 0),
    [manualUnitCounts],
  );
  const totalLive = useMemo(
    () => leaderboard?.liveUnitTotals.reduce((sum, value) => sum + value.count, 0) ?? 0,
    [leaderboard],
  );
  const highestManual = useMemo(
    () =>
      UNIT_LIST.map((unit) => ({ unit, count: manualUnitCounts[unit] ?? 0 }))
        .sort((left, right) => right.count - left.count || left.unit.localeCompare(right.unit))[0],
    [manualUnitCounts],
  );

  const saveManualCounts = async () => {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/unit-counts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counts: manualUnitCounts,
        }),
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      const data = (await response.json()) as {
        manualUnitCounts: ManualUnitCountMap;
        leaderboard: LeaderboardSnapshot;
        nextCounter: number;
      };

      setManualUnitCounts(data.manualUnitCounts);
      setLeaderboard(data.leaderboard);
      toast.success(`Manual counts updated. Next frame number: #${data.nextCounter}.`);
    } catch {
      toast.error("Failed to update manual unit counts.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Manual Added"
          value={totalManual}
          detail="Offline or missed frame counts"
          icon={Calculator}
          tone="amber"
        />
        <AdminMetricCard
          label="Live Records"
          value={totalLive}
          detail="Generated from public frame flows"
          icon={TrendingUp}
          tone="sky"
        />
        <AdminMetricCard
          label="Top Manual Unit"
          value={highestManual?.count ?? 0}
          detail={highestManual?.unit ?? "No unit yet"}
          icon={Users}
          tone="emerald"
        />
      </section>

      <AdminPanel
        title="Manual Unit Count Adjustments"
        description="Add counts from offline or missed events so leaderboard and frame numbering stay correct."
        icon={Calculator}
        action={
          <Button onClick={saveManualCounts} disabled={saving} className="gap-2">
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Updating..." : "Save Counts"}
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {UNIT_LIST.map((unit) => (
              <div key={unit} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Label className="block text-sm font-black text-slate-800">{unit}</Label>
                  <span className="text-xs font-semibold text-slate-500">
                    Live {leaderboard?.liveUnitTotals.find((item) => item.unit === unit)?.count ?? 0}
                  </span>
                </div>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={manualUnitCounts[unit] ?? 0}
                  onChange={(event) => updateManualUnitCount(unit, event.target.value)}
                  className="bg-white"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Combined total: <span className="font-bold text-slate-950">{leaderboard?.total ?? totalManual + totalLive}</span>
            </p>
            <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setManualUnitCounts(zeroCounts())}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button onClick={saveManualCounts} disabled={saving} className="gap-2">
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Updating..." : "Update Unit Counts"}
            </Button>
            </div>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
