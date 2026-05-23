import Link from "next/link";
import { ArrowRight, Image as ImageIcon, LayoutTemplate, Megaphone, Users } from "lucide-react";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const templateWorkspaces = [
  {
    href: "/admin/templates/family",
    title: "Family Frame Templates",
    description: "Manage family frame overlays, typography, unit links, and the public framing workflow.",
    icon: Users,
    badge: "Family layouts",
    action: "Open family templates",
    tone: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  {
    href: "/admin/templates/results",
    title: "Result Poster Templates",
    description: "Upload result poster backgrounds, configure text placement, and manage sponsor ad rules.",
    icon: ImageIcon,
    badge: "Results and ads",
    action: "Open result templates",
    tone: "bg-violet-50 text-violet-700 ring-violet-200",
  },
];

export function AdminTemplatesHub() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-3">Template Workspace</Badge>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Choose what you want to configure.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Family frame layouts and result poster templates are separate workflows, so each editor stays focused and easier to use during the event.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/results">
              Publish Results
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {templateWorkspaces.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="mt-2 h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
            </div>
            <Badge variant="secondary" className="mt-5">{item.badge}</Badge>
            <h3 className="mt-4 text-xl font-black text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
            <p className="mt-5 text-sm font-bold text-slate-900">{item.action}</p>
          </Link>
        ))}
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
