"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Project, Lead, Checkin, ChecklistEntry, EmployeeScore, Deviation } from "@/lib/types";
import {
  fetchLiveProjects,
  fetchLiveLeads,
  fetchLiveCheckins,
  fetchLiveChecklistEntries,
  fetchLiveScores,
  fetchLiveDeviations,
  getDemoData,
  getDemoScores,
} from "@/lib/data";
import StatCards from "./StatCards";
import Timeline from "./Timeline";
import LeadPipeline from "./LeadPipeline";
import ProjectsList from "./ProjectsList";
import DeviationsList from "./DeviationsList";
import Sidebar from "./Sidebar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Tab = "timeline" | "leads";
type Source = "live" | "demo";

interface DashboardProps {
  initialProjects: Project[];
  initialLeads: Lead[];
  initialCheckins: Checkin[];
  initialChecklistEntries: ChecklistEntry[];
  initialScores: EmployeeScore[];
  initialDeviations: Deviation[];
}

export default function Dashboard({
  initialProjects,
  initialLeads,
  initialCheckins,
  initialChecklistEntries,
  initialScores,
  initialDeviations,
}: DashboardProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins);
  const [checklistEntries, setChecklistEntries] = useState<ChecklistEntry[]>(initialChecklistEntries);
  const [scores, setScores] = useState<EmployeeScore[]>(initialScores);
  const [deviations, setDeviations] = useState<Deviation[]>(initialDeviations);
  const [source, setSource] = useState<Source>("live");
  const [tab, setTab] = useState<Tab>("timeline");
  const [refreshing, setRefreshing] = useState(false);

  // Global search state
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const loadLive = useCallback(async () => {
    try {
      const [liveProjects, liveLeads, liveCheckins, liveCl, liveScores, liveDev] = await Promise.all([
        fetchLiveProjects().catch(() => []),
        fetchLiveLeads().catch(() => []),
        fetchLiveCheckins().catch(() => []),
        fetchLiveChecklistEntries().catch(() => []),
        fetchLiveScores().catch(() => []),
        fetchLiveDeviations().catch(() => []),
      ]);
      const p = Array.isArray(liveProjects) ? liveProjects : [];
      const l = Array.isArray(liveLeads) ? liveLeads : [];
      const ci = Array.isArray(liveCheckins) ? liveCheckins : [];
      const cl = Array.isArray(liveCl) ? liveCl : [];
      const sc = Array.isArray(liveScores) ? liveScores : [];
      const dv = Array.isArray(liveDev) ? liveDev : [];
      setProjects(p);
      setLeads(l);
      setCheckins(ci);
      setChecklistEntries(cl);
      setScores(sc);
      setDeviations(dv);
      return p.length > 0 || l.length > 0;
    } catch {
      setProjects([]);
      setLeads([]);
      setCheckins([]);
      setChecklistEntries([]);
      setScores([]);
      setDeviations([]);
      return false;
    }
  }, []);

  const loadDemo = useCallback(() => {
    const demo = getDemoData();
    setProjects(demo.projects);
    setLeads(demo.leads);
    setCheckins(demo.checkins);
    setChecklistEntries(demo.checklistEntries);
    setScores(getDemoScores());
    setDeviations(demo.deviations);
  }, []);

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

  const [now, setNow] = useState("");
  useEffect(() => {
    setNow(
      new Date().toLocaleString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [refreshing]);

  const isLive = source === "live";

  return (
    <div className="flex min-h-screen">
      <Sidebar checkins={checkins} checklistEntries={checklistEntries} scores={scores} />

      <main className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        <div className="mx-auto w-full max-w-[1200px] flex-1 flex flex-col px-4 py-8 sm:px-6 lg:px-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <p className="text-[13px] font-medium tracking-[0.05em] uppercase text-muted-foreground/70">
                  R. Samdal Snekkeri
                </p>
                <h1 className="mt-1 text-[24px] sm:text-[28px] font-bold leading-tight text-foreground">
                  Prosjektoversikt
                </h1>
              </div>

              {/* Data source toggle & Search */}
              <div className="mb-1 ml-auto flex items-center gap-2">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold transition-colors min-h-[32px] cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span className="hidden sm:inline">Søk (Cmd+K)</span>
                </button>

                <button
                  onClick={handleToggle}
                  disabled={refreshing}
                  className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold transition-colors min-h-[32px] cursor-pointer ${
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
                  <span className="hidden sm:inline">{isLive ? "Live data" : "Demo data"}</span>
                  <span className="sm:hidden">{isLive ? "Live" : "Demo"}</span>
                </button>

                {isLive && (
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center justify-center rounded-full w-8 h-8 transition-colors hover:bg-muted cursor-pointer"
                    title="Oppdater data"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`${refreshing ? "animate-spin" : ""} text-muted-foreground`}
                    >
                      <path
                        d="M13.65 2.35A8 8 0 1 0 16 8h-2a6 6 0 1 1-1.76-4.24L10 6h6V0l-2.35 2.35z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mb-8">
            <StatCards projects={projects} leads={leads} />
          </div>

          {/* Tab bar */}
          <div className="mb-6 flex gap-6 border-b border-border">
            <button
              onClick={() => setTab("timeline")}
              className={`relative pb-3 text-[14px] font-medium transition-colors min-h-[44px] cursor-pointer ${tab === "timeline" ? "text-foreground" : "text-muted-foreground/70"}`}
              style={{ letterSpacing: "0.01em" }}
            >
              Prosjekt-tidslinje
              {tab === "timeline" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-foreground" />
              )}
            </button>
            <button
              onClick={() => setTab("leads")}
              className={`relative pb-3 text-[14px] font-medium transition-colors min-h-[44px] cursor-pointer ${tab === "leads" ? "text-foreground" : "text-muted-foreground/70"}`}
              style={{ letterSpacing: "0.01em" }}
            >
              Lead-pipeline
              {tab === "leads" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-foreground" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1">
            {tab === "timeline" ? (
              <>
                <Timeline projects={projects} checkins={checkins} />
                <ProjectsList projects={projects} />
                <DeviationsList deviations={deviations} />
              </>
            ) : (
              <LeadPipeline leads={leads} />
            )}
          </div>

          {/* Footer */}
          <footer className="mt-10 pb-4 text-center text-[11px] font-normal text-muted-foreground/70">
            Kari AI — R. Samdal Snekkeri &middot; Sist oppdatert: {now || "Akkurat nå"}
          </footer>
        </div>
      </main>

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Søk etter prosjekter, leads eller ansatte..." />
        <CommandList>
          <CommandEmpty>Ingen resultater funnet.</CommandEmpty>
          
          {projects.length > 0 && (
            <CommandGroup heading="Prosjekter">
              {projects.map((p) => (
                <CommandItem
                  key={p.project_number}
                  value={`${p.project_number} ${p.name} ${p.customer_name || ""} ${p.assigned || ""}`}
                  onSelect={() => {
                    setSearchOpen(false);
                    router.push(`/project/${p.project_number}`);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-muted-foreground/70 w-10">#{p.project_number}</span>
                    <span className="font-medium flex-1">{p.name}</span>
                    {p.status !== "ferdig" && (
                      <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-sm">
                        {p.status}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {leads.length > 0 && (
            <CommandGroup heading="Leads">
              {leads.map((l) => (
                <CommandItem
                  key={l.email}
                  value={`${l.name} ${l.email} ${l.phone} ${l.address || ""}`}
                  onSelect={() => {
                    setSearchOpen(false);
                    setTab("leads");
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium flex-1">{l.name}</span>
                    <span className="text-[11px] text-muted-foreground/70">{l.source}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {scores.length > 0 && (
            <CommandGroup heading="Ansatte">
              {scores.map((s) => (
                <CommandItem
                  key={s.employee}
                  value={s.employee}
                  onSelect={() => {
                    setSearchOpen(false);
                    // Just close search, maybe we can add a specific action later
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium flex-1">{s.employee}</span>
                    <span className="text-[11px] text-muted-foreground/70">{s.total} poeng denne måneden</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
