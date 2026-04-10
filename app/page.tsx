import { Suspense } from "react";
import {
  fetchLiveProjects,
  fetchLiveLeads,
  fetchLiveCheckins,
  fetchLiveChecklistEntries,
  fetchLiveScores,
  fetchLiveDeviations,
} from "@/lib/data";
import Dashboard from "./components/Dashboard";
import { Skeleton } from "@/components/ui/skeleton";

async function DashboardData() {
  const [projects, leads, checkins, checklistEntries, scores, deviations] = await Promise.all([
    fetchLiveProjects(),
    fetchLiveLeads(),
    fetchLiveCheckins(),
    fetchLiveChecklistEntries(),
    fetchLiveScores(),
    fetchLiveDeviations(),
  ]);

  return (
    <Dashboard
      initialProjects={projects}
      initialLeads={leads}
      initialCheckins={checkins}
      initialChecklistEntries={checklistEntries}
      initialScores={scores}
      initialDeviations={deviations}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <p className="text-sm text-muted-foreground animate-pulse">Laster prosjekter...</p>
          </div>
        </div>
      }
    >
      <DashboardData />
    </Suspense>
  );
}
