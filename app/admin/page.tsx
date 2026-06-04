import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AdminOverviewDashboard } from "@/components/AdminOverviewDashboard";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/lib/admin-auth";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!isValidAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      title="Admin Overview"
      subtitle="Operational dashboard for result publishing, poster templates, and event settings."
    >
      <AdminOverviewDashboard />
    </AdminShell>
  );
}
