import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminMetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: "slate" | "emerald" | "amber" | "sky" | "rose" | "violet";
  className?: string;
}

const toneClasses = {
  slate: "bg-slate-50 text-slate-700 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function AdminMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "slate",
  className,
}: AdminMetricCardProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <div className={cn("rounded-lg p-2 ring-1", toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}
