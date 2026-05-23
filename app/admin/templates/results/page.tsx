import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { ResultTemplatesManager } from "@/components/AdminResultsDashboard";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/lib/admin-auth";

export default async function AdminResultTemplatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!isValidAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      title="Result Templates"
      subtitle="Configure result poster designs, dynamic text placement, and sponsor ad rules."
    >
      <ResultTemplatesManager />
    </AdminShell>
  );
}
