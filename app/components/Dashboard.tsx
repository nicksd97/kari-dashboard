"use client";

import { useEffect, useState, useCallback } from "react";
import type { Project, Lead, Checkin, ChecklistEntry } from "@/lib/types";
import {
  fetchProjects,
  fetchLeads,
  fetchCheckins,
  fetchChecklistEntries,
  getDemoData,
} from "@/lib/data";
import StatCards from "./StatCards";
import Timeline from "./Timeline";
import LeadPipeline from "./LeadPipeline";
import Sidebar from "./Sidebar";

type Tab = "timeline" | "leads";
type Source = "live" | "demo";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checklistEntries, setChecklistEntries] = useState<ChecklistEntry[]>([]);
  const [source, setSource] = useState<Source>("live");
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [tab, setTab] = useState<Tab>("timeline");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLive = useCallback(async () => {
    const [projResult, leadResult, checkinResult, clResult] = await Promise.all([
      fetchProjects(),
      fetchLeads(),
      fetchCheckins(),
      fetchChecklistEntries(),
    ]);
    const hasLive = projResult.isLive || leadResult.isLive;
    setLiveAvailable(hasLive);
    setProjects(projResult.projects);
    setLeads(leadResult.leads);
    setCheckins(checkinResult);
    setChecklistEntries(clResult);
    return hasLive;
  }, []);

  const loadDemo = useCallback(() => {
    const demo = getDemoData();
    setProjects(demo.projects);
    setLeads(demo.leads);
    setCheckins(demo.checkins);
    setChecklistEntries(demo.checklistEntries);
  }, []);

  // Initial load: try live, fall back to demo
  useEffect(() => {
    async function init() {
      const hasLive = await loadLive();
      if (!hasLive) setSource("demo");
      setLoading(false);
    }
    init();
  }, [loadLive]);

  const handleToggle = useCallback(async () => {
    if (source === "live") {
      setSource("demo");
      loadDemo();
    } else {
      setSource("live");
      setRefreshing(true);
      await loadLive();
      setRefreshing(false);
    }
  }, [source, loadLive, loadDemo]);

  const handleRefresh = useCallback(async () => {
    if (source !== "live") return;
    setRefreshing(true);
    await loadLive();
    setRefreshing(false);
  }, [source, loadLive]);

  const now = new Date().toLocaleString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100" />
      </div>
    );
  }

  const isLive = source === "live";

  return (
    <div className="flex min-h-screen">
      <Sidebar checkins={checkins} checklistEntries={checklistEntries} />

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="mx-auto w-full max-w-[1200px] flex-1 flex flex-col px-6 py-8 sm:px-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-end gap-4">
              <div>
                <p
                  className="text-[13px] font-medium tracking-[0.05em] uppercase"
                  style={{ color: "var(--muted-light)" }}
                >
                  R. Samdal Snekkeri
                </p>
                <h1 className="mt-1 text-[28px] font-bold leading-tight text-gray-900 dark:text-gray-50">
                  Prosjektoversikt
                </h1>
              </div>

              {/* Data source toggle */}
              <div className="mb-1 ml-auto flex items-center gap-1.5">
                <button
                  onClick={handleToggle}
                  disabled={refreshing}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    isLive
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800 dark:hover:bg-blue-950/60"
                      : "bg-green-50 text-green-700 ring-1 ring-green-200 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-800 dark:hover:bg-green-950/60"
                  }`}
                >
                  {refreshing ? (
                    <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isLive ? "bg-blue-500" : "bg-green-500"
                      }`}
                    />
                  )}
                  {isLive ? "Live data" : "Demo data"}
                </button>

                {/* Refresh button (only in live mode) */}
                {isLive && (
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center justify-center rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    title="Oppdater data"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={refreshing ? "animate-spin" : ""}
                      style={{ color: "var(--muted-light)" }}
                    >
                      <path
                        d="M13.65 2.35A8 8 0 1 0 16 8h-2a6 6 0 1 1-1.76-4.24L10 6h6V0l-2.35 2.35z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                )}

                {/* Hint when live has no data */}
                {isLive && !liveAvailable && (
                  <span className="text-[10px]" style={{ color: "var(--muted-light)" }}>
                    (tom)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mb-8">
            <StatCards projects={projects} leads={leads} />
          </div>

          {/* Tab bar */}
          <div
            className="mb-6 flex gap-6"
            style={{ borderBottom: "1px solid var(--divider)" }}
          >
            <button
              onClick={() => setTab("timeline")}
              className="relative pb-3 text-[14px] font-medium transition-colors"
              style={{
                color: tab === "timeline" ? "var(--foreground)" : "var(--muted-light)",
                letterSpacing: "0.01em",
              }}
            >
              Prosjekt-tidslinje
              {tab === "timeline" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gray-900 dark:bg-gray-100" />
              )}
            </button>
            <button
              onClick={() => setTab("leads")}
              className="relative pb-3 text-[14px] font-medium transition-colors"
              style={{
                color: tab === "leads" ? "var(--foreground)" : "var(--muted-light)",
                letterSpacing: "0.01em",
              }}
            >
              Lead-pipeline
              {tab === "leads" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gray-900 dark:bg-gray-100" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1">
            {tab === "timeline" ? (
              <Timeline projects={projects} />
            ) : (
              <LeadPipeline leads={leads} />
            )}
          </div>

          {/* Footer */}
          <footer
            className="mt-10 pb-4 text-center text-[11px] font-normal"
            style={{ color: "var(--muted-light)" }}
          >
            Kari AI — R. Samdal Snekkeri &middot; Sist oppdatert: {now}
          </footer>
        </div>
      </main>
    </div>
  );
}
