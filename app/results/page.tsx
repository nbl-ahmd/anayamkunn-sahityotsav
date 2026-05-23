import { AppShell } from "@/components/AppShell";
import { ResultsBrowser } from "@/components/ResultsBrowser";
import { getPublicResultsSnapshot } from "@/lib/results-store";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const snapshot = await getPublicResultsSnapshot();

  return (
    <AppShell title="Contest Results" subtitle="View, share, and download official result posters.">
      <ResultsBrowser snapshot={snapshot} />
    </AppShell>
  );
}
