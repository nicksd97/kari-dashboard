"use client";

import { useEffect, useState } from "react";
import type { Project, Lead } from "@/lib/types";
import { fetchProjects, fetchLeads } from "@/lib/data";
import StatCards from "./StatCards";
import Timeline from "./Timeline";
import LeadPipeline from "./LeadPipeline";

type Tab = "timeline" | "leads";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [tab, setTab] = useState<Tab>("timeline");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [projResult, leadResult] = await Promise.all([
        fetchProjects(),
        fetchLeads(),
      ]);
      setProjects(projResult.projects);
      setLeads(leadResult.leads);
      setIsLive(projResult.isLive || leadResult.isLive);
      setLoading(false);
    }
    load();
  }, []);

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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col px-6 py-8 sm:px-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-end gap-4">
          <div>
            <p className="text-[13px] font-medium tracking-[0.05em] uppercase"
               style={{ color: "var(--muted-light)" }}>
              R. Samdal Snekkeri
            </p>
            <h1 className="mt-1 text-[28px] font-bold leading-tight text-gray-900 dark:text-gray-50">
              Prosjektoversikt
            </h1>
          </div>
          <span
            className={`mb-1 ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
              isLive
                ? "bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-800"
                : "bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isLive ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            {isLive ? "Live data" : "Demo data"}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-8">
        <StatCards projects={projects} leads={leads} />
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-6" style={{ borderBottom: "1px solid var(--divider)" }}>
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
      <footer className="mt-10 pb-4 text-center text-[11px] font-normal" style={{ color: "var(--muted-light)" }}>
        Kari AI — R. Samdal Snekkeri &middot; Sist oppdatert: {now}
      </footer>
    </div>
  );
}
