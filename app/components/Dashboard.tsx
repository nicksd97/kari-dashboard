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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
              R. Samdal Snekkeri
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              Prosjektoversikt
            </h1>
          </div>
          <span
            className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isLive
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {isLive ? "Live data" : "Demo data"}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6">
        <StatCards projects={projects} leads={leads} />
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          onClick={() => setTab("timeline")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "timeline"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Prosjekt-tidslinje
        </button>
        <button
          onClick={() => setTab("leads")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "leads"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Lead-pipeline
        </button>
      </div>

      {/* Content */}
      {tab === "timeline" ? (
        <Timeline projects={projects} />
      ) : (
        <LeadPipeline leads={leads} />
      )}
    </div>
  );
}
