import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminResultsDashboard } from "@/components/AdminResultsDashboard";
import { AdminShell } from "@/components/AdminShell";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/lib/admin-auth";

export default async function AdminResultsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!isValidAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      title="Publish Results"
      subtitle="Enter winners, select a template, preview the poster, and publish official results."
    >
      <AdminResultsDashboard />
    </AdminShell>
  );
}
