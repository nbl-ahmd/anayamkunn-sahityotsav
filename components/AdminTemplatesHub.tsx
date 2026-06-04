import Link from "next/link";
import { ArrowRight, Image as ImageIcon, LayoutTemplate, Megaphone } from "lucide-react";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminTemplatesHub() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-3">Template Workspace</Badge>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Configure result posters.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Upload result poster backgrounds, tune text placement, and manage sponsor ad rules for official publications.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/templates/results">
              Open Result Templates
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <AdminPanel
        title="Result Template Structure"
        description="The result template workspace contains two sections: poster design configuration and sponsor ad assignment."
        icon={LayoutTemplate}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <ImageIcon className="h-4 w-4 text-slate-500" />
              Poster Template
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Upload the background, set final dimensions, position fields, and save scoped defaults.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <Megaphone className="h-4 w-4 text-slate-500" />
              Sponsor Ads
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Upload ad strips and assign them by result-number range, category, or competition.
            </p>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
