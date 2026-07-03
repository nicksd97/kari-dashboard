"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Project, Lead, Checkin, Deviation, TimelineEntry, MessageFeedEntry } from "@/lib/types";
import {
  fetchLiveProjects,
  fetchLiveLeads,
  fetchLiveCheckins,
  fetchLiveDeviations,
  fetchLiveMessageFeed,
  getDemoData,
} from "@/lib/data";
import StatCards from "./StatCards";
import Timeline from "./Timeline";
import LeadPipeline from "./LeadPipeline";
import ProjectsList from "./ProjectsList";
import DeviationsList from "./DeviationsList";
import MessageFeed from "./MessageFeed";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Tab = "timeline" | "leads" | "messages";
type Source = "live" | "demo";

interface DashboardProps {
  initialProjects: Project[];
  initialLeads: Lead[];
  initialCheckins: Checkin[];
  initialDeviations: Deviation[];
  initialTimelineEntries: TimelineEntry[];
  initialMessageFeed: MessageFeedEntry[];
}

export default function Dashboard({
  initialProjects,
  initialLeads,
  initialCheckins,
  initialDeviations,
  initialTimelineEntries,
  initialMessageFeed,
}: DashboardProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [checkins, setCheckins] = useState<Checkin[]>(initialCheckins);
  const [deviations, setDeviations] = useState<Deviation[]>(initialDeviations);
  const [timelineEntries] = useState<TimelineEntry[]>(initialTimelineEntries);
  const [messageFeed, setMessageFeed] = useState<MessageFeedEntry[]>(initialMessageFeed);
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
      const [liveProjects, liveLeads, liveCheckins, liveDev, liveMsgs] = await Promise.all([
        fetchLiveProjects().catch(() => []),
        fetchLiveLeads().catch(() => []),
        fetchLiveCheckins().catch(() => []),
        fetchLiveDeviations().catch(() => []),
        fetchLiveMessageFeed().catch(() => []),
      ]);
      const p = Array.isArray(liveProjects) ? liveProjects : [];
      const l = Array.isArray(liveLeads) ? liveLeads : [];
      const ci = Array.isArray(liveCheckins) ? liveCheckins : [];
      const dv = Array.isArray(liveDev) ? liveDev : [];
      const msgs = Array.isArray(liveMsgs) ? liveMsgs : [];
      setProjects(p);
      setLeads(l);
      setCheckins(ci);
      setDeviations(dv);
      setMessageFeed(msgs);
      return p.length > 0 || l.length > 0;
    } catch {
      setProjects([]);
      setLeads([]);
      setCheckins([]);
      setDeviations([]);
      setMessageFeed([]);
      return false;
    }
  }, []);

  const loadDemo = useCallback(() => {
    const demo = getDemoData();
    setProjects(demo.projects);
    setLeads(demo.leads);
    setCheckins(demo.checkins);
    setDeviations(demo.deviations);
    setMessageFeed(demo.messageFeed || []);
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
    <div style={{ background: '#f2f0ea', minHeight: '100vh' }}>
      <style>{`
        .p-card { background:#fff; border:1px solid #e7e4db; border-radius:12px; box-shadow:0 1px 2px rgba(20,25,24,.06),0 8px 24px rgba(20,25,24,.06); }
        .p-tab { font-size:13px; font-weight:600; color:#4a534f; border:0; background:transparent; padding:7px 15px; border-radius:7px; cursor:pointer; }
        .p-tab.on { background:#1f4b4a; color:#fff; }
      `}</style>
      <main className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '22px 20px 60px' }} className="w-full flex-1 flex flex-col">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#1f4b4a', color: '#f2f0ea', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18 }}>RS</div>
              <div>
                <h1 style={{ fontWeight: 700, fontSize: 20, margin: 0, letterSpacing: '-.2px', color: '#191d1c' }}>Prosjektoversikt</h1>
                <p style={{ margin: '1px 0 0', color: '#4a534f', fontSize: 12.5 }}>R. Samdal Snekkeri · Kontraktsfestede jobber &amp; fremdrift</p>
              </div>
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

          {/* Stat cards */}
          <div className="mb-8">
            <StatCards projects={projects} leads={leads} />
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button
              onClick={() => setTab("timeline")}
              className={`p-tab ${tab === "timeline" ? "on" : ""}`}
            >
              Prosjekt-tidslinje
            </button>
            <button
              onClick={() => setTab("leads")}
              className={`p-tab ${tab === "leads" ? "on" : ""}`}
            >
              Lead-pipeline
            </button>
            <button
              onClick={() => setTab("messages")}
              className={`p-tab ${tab === "messages" ? "on" : ""}`}
            >
              Meldinger
            </button>
          </div>

          {/* Content */}
          <div className="flex-1">
            {tab === "timeline" ? (
              <>
                <Timeline projects={projects} checkins={checkins} timelineEntries={timelineEntries} />
                <ProjectsList projects={projects} />
                <DeviationsList deviations={deviations} />
              </>
            ) : tab === "leads" ? (
              <LeadPipeline leads={leads} />
            ) : (
              <MessageFeed messages={messageFeed} />
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
                  value={`${p.project_number} ${p.name} ${p.customer_name || ""} ${(p.assigned_employees ?? []).join(" ")}`}
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
        </CommandList>
      </CommandDialog>
    </div>
  );
}
