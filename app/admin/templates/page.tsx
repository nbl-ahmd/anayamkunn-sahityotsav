import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AdminDashboard } from "@/components/AdminDashboard";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/lib/admin-auth";

export default async function AdminTemplatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!isValidAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      title="Frame Templates"
      subtitle="Manage family frame overlays, text placement, live links, and frame activity."
    >
      <AdminDashboard />
    </AdminShell>
  );
}
