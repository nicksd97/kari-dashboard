export const dynamic = "force-dynamic";

import { Suspense } from "react";
import {
  fetchLiveProjects,
  fetchLiveLeads,
  fetchLiveCheckins,
  fetchLiveChecklistEntries,
  fetchLiveScores,
  fetchLiveDeviations,
  fetchTimelineData,
  fetchLiveMessageFeed,
} from "@/lib/data";
import Dashboard from "./components/Dashboard";
import { Skeleton } from "@/components/ui/skeleton";

async function DashboardData() {
  const [projects, leads, checkins, checklistEntries, scores, deviations, timelineEntries, messageFeed] = await Promise.all([
    fetchLiveProjects(),
    fetchLiveLeads(),
    fetchLiveCheckins(),
    fetchLiveChecklistEntries(),
    fetchLiveScores(),
    fetchLiveDeviations(),
    fetchTimelineData(),
    fetchLiveMessageFeed(),
  ]);

  return (
    <Dashboard
      initialProjects={projects}
      initialLeads={leads}
      initialCheckins={checkins}
      initialChecklistEntries={checklistEntries}
      initialScores={scores}
      initialDeviations={deviations}
      initialTimelineEntries={timelineEntries}
      initialMessageFeed={messageFeed}
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
