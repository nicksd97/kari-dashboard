"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useGesture } from "@use-gesture/react";
import type { Project, Checklist, Checkin, TimelineEntry } from "@/lib/types";
import {
  STATUS_COLORS_SOFT,
  STATUS_LABELS,
  EMPLOYEE_COLORS,
} from "@/lib/types";

interface TimelineProps {
  projects: Project[];
  checkins?: Checkin[];
  timelineEntries?: TimelineEntry[];
}

// A row in the timeline — either from check-in data or project assignment fallback
interface TimelineRow {
  project: Project;
  y: number;
  fromCheckins: boolean; // true = solid bar, false = semi-transparent (fallback)
  checkinStartDate?: string; // override dates from check-in data
  checkinEndDate?: string;
}

const EMPLOYEES = ["Roar", "Andrii", "Marci"];
const LEFT_COL = 240;
const ROW_HEIGHT = 44; // Increased to 44px for touch targets
const BAR_HEIGHT = 28; // Increased bar height
const EMP_HEADER = 36;
const HEADER_HEIGHT = 56;
const MONTH_ROW = 28;
const DAY_ROW = 28;

// --- Utilities ---

function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(n);
}

function dayIndex(rangeStartStr: string, date: string) {
  return daysBetween(rangeStartStr, date);
}

// --- Bar colors ---

interface BarStyle {
  bg: string;
  border: string;
}

function getBarStyle(p: Project, today: string): BarStyle {
  if (p.status === "ferdig") {
    return { bg: "#BDBDBD", border: "1px solid #A8A8A8" };
  }
  if (
    p.status === "innkommende" ||
    p.status === "planlegging" ||
    (p.start_date && p.start_date > today)
  ) {
    return { bg: "var(--card)", border: "1px dashed #C0C0C0" };
  }
  const overdue = p.estimated_end_date && p.estimated_end_date < today && p.status !== "ferdig";
  if (overdue) {
    return { bg: "#E53935", border: "1px solid #C62828" };
  }
  const nearDeadline =
    p.estimated_end_date &&
    daysBetween(today, p.estimated_end_date) <= 3 &&
    daysBetween(today, p.estimated_end_date) >= 0;
  if (p.status === "venter kunde" || nearDeadline) {
    return { bg: "#FF9800", border: "1px solid #E68900" };
  }
  return { bg: "#4CAF50", border: "1px solid #388E3C" };
}

// --- Stage workflow logic ---

type StageKey = 1 | 2 | 3;

const STAGE_LABELS: Record<StageKey, string> = { 1: "Oppstart", 2: "Pågående", 3: "Avslutning" };

const STAGE_ITEMS: Record<StageKey, string[]> = {
  1: ["Kontrakt signert", "Prosjektmappe opprettet", "Materialliste klar", "Planner-oppgave opprettet", "Kickoff med team"],
  2: ["Vernerunde gjennomført", "Materialer bestilt/levert", "Kvalitetskontroll underveis", "Timer og kostnader loggført", "Oppfølging med kunde"],
  3: ["Kvalitetskontroll ferdig", "Ferdigstillelse-sjekkliste", "FDV-dokumentasjon levert", "Sluttfaktura sendt", "Prosjekt lukket i Planner"],
};

function getActiveStage(status: string): StageKey {
  if (status === "innkommende" || status === "planlegging") return 1;
  if (status === "materialer" || status === "pagaende" || status === "venter kunde") return 2;
  return 3;
}

function getStageState(stageKey: StageKey, activeStage: StageKey, allChecklistsPassed: boolean, isFerdig: boolean): "completed" | "active" | "future" {
  if (isFerdig && allChecklistsPassed) return "completed";
  if (stageKey < activeStage) return "completed";
  if (stageKey === activeStage) return "active";
  return "future";
}

function isItemComplete(stageKey: StageKey, itemIndex: number, activeStage: StageKey, checklists: Checklist[] | undefined, isFerdig: boolean, allChecklistsPassed: boolean): boolean {
  if (isFerdig && allChecklistsPassed) return true;
  if (stageKey < activeStage) return true;
  if (stageKey > activeStage) return false;
  const cls = checklists || [];
  if (stageKey === 2) {
    const item = STAGE_ITEMS[2][itemIndex];
    if (item === "Vernerunde gjennomført") { const v = cls.find((c) => c.name.toLowerCase().includes("vernerunde")); return v ? v.done === v.total : false; }
    if (item === "Kvalitetskontroll underveis") { const q = cls.find((c) => c.name.toLowerCase().includes("kvalitetskontroll")); return q ? q.done === q.total : false; }
  }
  if (stageKey === 3) {
    const item = STAGE_ITEMS[3][itemIndex];
    if (item === "Kvalitetskontroll ferdig") { const q = cls.find((c) => c.name.toLowerCase().includes("kvalitetskontroll")); return q ? q.done === q.total : false; }
    if (item === "Ferdigstillelse-sjekkliste") { const f = cls.find((c) => c.name.toLowerCase().includes("ferdigstillelse")); return f ? f.done === f.total : false; }
    if (item === "Sluttfaktura sendt") return isFerdig || activeStage === 3;
    if (item === "Prosjekt lukket i Planner") return isFerdig;
  }
  return false;
}

function getChecklistForItem(stageKey: StageKey, itemIndex: number, checklists: Checklist[] | undefined): Checklist | null {
  const cls = checklists || [];
  if (stageKey === 2) {
    if (itemIndex === 0) return cls.find((c) => c.name.toLowerCase().includes("vernerunde")) || null;
    if (itemIndex === 2) return cls.find((c) => c.name.toLowerCase().includes("kvalitetskontroll")) || null;
  }
  if (stageKey === 3) {
    if (itemIndex === 0) return cls.find((c) => c.name.toLowerCase().includes("kvalitetskontroll")) || null;
    if (itemIndex === 1) return cls.find((c) => c.name.toLowerCase().includes("ferdigstillelse")) || null;
  }
  return null;
}

// --- Main component ---

export default function Timeline({ projects, checkins, timelineEntries }: TimelineProps) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrolledToToday, setScrolledToToday] = useState(false);

  const [zoom, setZoom] = useState(40);
  
  // Prevent default pinch zoom on the container to allow custom useGesture pinch
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const preventPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    el.addEventListener("touchmove", preventPinch, { passive: false });
    return () => el.removeEventListener("touchmove", preventPinch);
  }, []);

  useGesture(
    {
      onPinch: ({ offset: [s] }) => {
        setZoom(Math.max(10, Math.min(80, s)));
      },
    },
    {
      target: scrollRef,
      pinch: { scaleBounds: { min: 10, max: 80 }, modifierKey: "ctrlKey" },
      eventOptions: { passive: false },
    }
  );

  const safeProjects = (projects || []).filter((p) => p.status !== "ferdig");
  const datedProjects = safeProjects.filter((p) => p.start_date && p.estimated_end_date);
  const today = new Date().toISOString().split("T")[0];

  // --- Timeline range ---
  const allProjectDates = datedProjects.flatMap((p) => [p.start_date!, p.estimated_end_date!]);
  // Include check-in dates in range calculation
  const checkinDates = (timelineEntries || []).flatMap((e) => [e.startDate, e.endDate]);
  const allDates = [...allProjectDates, ...checkinDates].filter(Boolean);
  const earliestDate = allDates.length > 0 ? allDates.sort()[0] : today;
  const latestDate = allDates.length > 0 ? allDates.sort().reverse()[0] : today;

  const startAnchor = earliestDate < today ? earliestDate : today;
  const rangeStartD = new Date(startAnchor);
  rangeStartD.setDate(rangeStartD.getDate() - 14);
  const rangeStartStr = rangeStartD.toISOString().split("T")[0];

  const endFromProjects = new Date(latestDate);
  endFromProjects.setDate(endFromProjects.getDate() + 28);
  const endFromToday = new Date(today);
  endFromToday.setDate(endFromToday.getDate() + 42);
  const rangeEndD = endFromProjects > endFromToday ? endFromProjects : endFromToday;
  const rangeEndStr = rangeEndD.toISOString().split("T")[0];

  const totalDays = Math.max(1, daysBetween(rangeStartStr, rangeEndStr));
  const gridWidth = totalDays * zoom;

  // --- Build days array ---
  const days: { dateStr: string; dayNum: number; dow: number; month: number; year: number }[] = [];
  const dCur = new Date(rangeStartD);
  for (let i = 0; i < totalDays; i++) {
    days.push({
      dateStr: dCur.toISOString().split("T")[0],
      dayNum: dCur.getDate(),
      dow: dCur.getDay(),
      month: dCur.getMonth(),
      year: dCur.getFullYear(),
    });
    dCur.setDate(dCur.getDate() + 1);
  }

  // --- Month spans for header ---
  const monthSpans: { label: string; startIdx: number; count: number }[] = [];
  let curKey = "";
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const key = `${d.year}-${d.month}`;
    if (key !== curKey) {
      const label = new Date(d.year, d.month, 1).toLocaleDateString("nb-NO", { month: "long" });
      monthSpans.push({ label: label.charAt(0).toUpperCase() + label.slice(1), startIdx: i, count: 1 });
      curKey = key;
    } else {
      monthSpans[monthSpans.length - 1].count++;
    }
  }

  const todayIdx = dayIndex(rangeStartStr, today);

  // --- Group by employee using check-in data (primary) + project assignment (fallback) ---
  const hasCheckinData = timelineEntries && timelineEntries.length > 0;

  // Build a project lookup by project_number
  const projectByNumber = new Map<string, Project>();
  for (const p of safeProjects) projectByNumber.set(p.project_number, p);

  // Build grouped rows: employee → TimelineRow[]
  const groupedRows: Record<string, TimelineRow[]> = {};
  const allEmployees = new Set<string>();

  // Track which employee+project combos are covered by check-ins
  const checkinCovered = new Set<string>(); // "employeeName|projectNumber"

  if (hasCheckinData) {
    for (const entry of timelineEntries) {
      const emp = entry.employeeName;
      allEmployees.add(emp);
      if (!groupedRows[emp]) groupedRows[emp] = [];
      checkinCovered.add(`${emp}|${entry.projectNumber}`);

      // Find the matching project for full metadata (status, checklists, etc.)
      const matchedProject = projectByNumber.get(entry.projectNumber);
      const project: Project = matchedProject || {
        project_number: entry.projectNumber,
        name: entry.projectName,
        status: "pagaende",
        start_date: entry.startDate,
        estimated_end_date: entry.endDate,
      };

      groupedRows[emp].push({
        project,
        y: 0,
        fromCheckins: true,
        checkinStartDate: entry.startDate,
        checkinEndDate: entry.endDate,
      });
    }
  }

  // Fallback: projects with assigned_to but no check-in data for that employee+project
  for (const p of datedProjects) {
    if (!p.assigned) continue;
    const key = `${p.assigned}|${p.project_number}`;
    if (checkinCovered.has(key)) continue;
    allEmployees.add(p.assigned);
    if (!groupedRows[p.assigned]) groupedRows[p.assigned] = [];
    groupedRows[p.assigned].push({
      project: p,
      y: 0,
      fromCheckins: false,
    });
  }

  // Unassigned dated projects (no check-in, no assigned_to)
  const unassignedDated = datedProjects.filter(
    (p) => !p.assigned && !timelineEntries?.some((e) => e.projectNumber === p.project_number)
  );
  if (unassignedDated.length > 0) {
    groupedRows["Ikke tildelt"] = unassignedDated.map((p) => ({
      project: p,
      y: 0,
      fromCheckins: false,
    }));
    allEmployees.add("Ikke tildelt");
  }

  const undated = safeProjects.filter((p) => !p.start_date || !p.estimated_end_date);

  // Sort employees: known EMPLOYEES first, then others alphabetically, "Ikke tildelt" last
  const sortedEmployees = Array.from(allEmployees).sort((a, b) => {
    if (a === "Ikke tildelt") return 1;
    if (b === "Ikke tildelt") return -1;
    const aIdx = EMPLOYEES.indexOf(a);
    const bIdx = EMPLOYEES.indexOf(b);
    if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
    if (aIdx >= 0) return -1;
    if (bIdx >= 0) return 1;
    return a.localeCompare(b, "nb-NO");
  });

  // --- Layout rows ---
  let y = 0;
  const rows: TimelineRow[] = [];
  const headers: { label: string; color: string; y: number }[] = [];

  for (const emp of sortedEmployees) {
    const group = groupedRows[emp] || [];
    if (group.length === 0) continue;
    headers.push({ label: emp, color: EMPLOYEE_COLORS[emp] || "#999", y });
    y += EMP_HEADER;
    group.forEach((row) => { row.y = y; rows.push(row); y += ROW_HEIGHT; });
  }
  if (undated.length > 0) {
    headers.push({ label: "Uten dato", color: "#999", y });
    y += EMP_HEADER;
    undated.forEach((p) => { rows.push({ project: p, y, fromCheckins: false }); y += ROW_HEIGHT; });
  }

  const totalHeight = Math.max(200, y);

  // --- Scroll to today on mount ---
  useEffect(() => {
    if (scrolledToToday || !scrollRef.current) return;
    const el = scrollRef.current;
    const todayX = todayIdx * zoom;
    const viewWidth = el.clientWidth;
    el.scrollLeft = todayX - viewWidth / 2;
    setScrolledToToday(true);
  }, [scrolledToToday, todayIdx, zoom]);

  // --- Hover handlers ---
  const handleBarMouseMove = useCallback((e: React.MouseEvent) => {
    let px = e.clientX + 16;
    let py = e.clientY + 8;
    if (window.innerHeight - e.clientY < 440) py = e.clientY - 430;
    if (px + 380 > window.innerWidth - 16) px = e.clientX - 396;
    setPopupPos({ x: px, y: py });
  }, []);

  const handleBarEnter = useCallback((pn: string, e: React.MouseEvent) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHoveredProject(pn);
    handleBarMouseMove(e);
  }, [handleBarMouseMove]);

  const handleBarLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setHoveredProject(null), 150);
  }, []);

  const handlePopupEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  }, []);

  const handlePopupLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setHoveredProject(null), 100);
  }, []);

  const hoveredData = hoveredProject
    ? safeProjects.find((p) => p.project_number === hoveredProject)
    : null;

  // --- Empty state ---
  if (safeProjects.length === 0) {
    const activeCheckins = (checkins || []).filter((c) => c.status === "checked_in");
    return (
      <div className="rounded-xl border border-border bg-card min-h-[400px]">
        {activeCheckins.length > 0 && (
          <div className="p-5 pb-3">
            <p className="text-[11px] font-semibold uppercase mb-3 text-muted-foreground/70 tracking-[0.04em]">Aktive i dag</p>
            <div className="flex gap-3 flex-wrap">
              {activeCheckins.map((c) => {
                const empColor = EMPLOYEE_COLORS[c.employee] || "#4CAF50";
                return (
                  <div key={c.employee} className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 py-3 px-4 flex-[1_1_200px] max-w-[340px]">
                    <div className="flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5" style={{ width: 22, height: 22, backgroundColor: empColor }}>{c.employee[0]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground">{c.employee}</span>
                        {c.projectNumber && <span className="text-[11px] font-medium text-muted-foreground/70">#{c.projectNumber}</span>}
                        {c.time && <span className="ml-auto text-[10px] text-muted-foreground/70">kl. {c.time}</span>}
                      </div>
                      {c.summary && <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{c.summary}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center" style={{ minHeight: activeCheckins.length > 0 ? 200 : 400 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-muted-foreground/30">
            <rect x="4" y="12" width="40" height="4" rx="2" fill="currentColor" />
            <rect x="4" y="22" width="28" height="4" rx="2" fill="currentColor" />
            <rect x="4" y="32" width="34" height="4" rx="2" fill="currentColor" />
          </svg>
          <p className="mt-4 text-[15px] font-semibold text-foreground">Ingen prosjekter enn&aring;</p>
          <p className="mt-1 text-[13px] text-muted-foreground/70">Prosjekter vil vises her n&aring;r de opprettes</p>
        </div>
      </div>
    );
  }

  const showDayNum = zoom >= 20;

  // ===================== RENDER =====================
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setZoom(40)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full min-h-[44px] cursor-pointer transition-colors ${zoom >= 30 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
        >
          Uke
        </button>
        <button
          onClick={() => setZoom(15)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full min-h-[44px] cursor-pointer transition-colors ${zoom < 30 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
        >
          Måned
        </button>
      </div>

      <div ref={containerRef} className="rounded-xl overflow-hidden border border-border bg-card">
        <div className="flex">
          {/* ── Fixed left column ── */}
          <div className="shrink-0 bg-card z-20" style={{ width: LEFT_COL, borderRight: "1px solid var(--border)" }}>
            {/* Header spacer */}
            <div className="flex items-end pb-2 pl-5 text-[11px] font-semibold uppercase text-muted-foreground/70 tracking-[0.04em]" style={{ height: HEADER_HEIGHT, borderBottom: "1px solid var(--border)" }}>
              Prosjekt
            </div>
            {/* Employee headers + project labels */}
            <div className="relative" style={{ height: totalHeight }}>
              {headers.map((h) => (
                <div key={h.label} className="absolute flex items-center gap-2 pl-5 bg-secondary/30" style={{ top: h.y, width: LEFT_COL, height: EMP_HEADER, borderBottom: "1px solid var(--border)" }}>
                  <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: h.color }} />
                  <span className="text-[12px] font-semibold text-foreground">{h.label}</span>
                </div>
              ))}
              {rows.map((row, rowIdx) => {
                const p = row.project;
                const isFerdig = p.status === "ferdig";
                return (
                  <div key={`lbl-${p.project_number}-${rowIdx}`} className="absolute flex items-center pl-5 pr-3 bg-card" style={{ top: row.y, width: LEFT_COL, height: ROW_HEIGHT, borderBottom: "1px solid var(--border)", opacity: row.fromCheckins ? 1 : 0.6 }}>
                    <Link href={`/project/${p.project_number}`} className="truncate text-[12px] hover:underline flex items-center h-full w-full">
                      <span className="text-muted-foreground/70 mr-1">#{p.project_number}</span>
                      <span className={isFerdig ? "text-muted-foreground/70 line-through" : "text-foreground"}>{p.name}</span>
                      {p.dependency && <span className="ml-1 text-[10px] italic text-muted-foreground/70">&larr; #{p.dependency}</span>}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Scrollable day grid ── */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto touch-pan-x" style={{ scrollBehavior: "smooth", touchAction: "pan-x" }}>
            <div style={{ width: gridWidth, position: "relative" }}>
              {/* Day header */}
              <div className="sticky top-0 z-10 bg-card" style={{ height: HEADER_HEIGHT, borderBottom: "1px solid var(--border)" }}>
                {/* Month row */}
                {monthSpans.map((m) => (
                  <div key={`m-${m.startIdx}`} className="absolute flex items-center pl-2" style={{ left: m.startIdx * zoom, width: m.count * zoom, top: 0, height: MONTH_ROW, borderLeft: "1px solid var(--border)" }}>
                    <span className="text-[11px] font-semibold whitespace-nowrap text-muted-foreground tracking-[0.02em]">{m.label}</span>
                  </div>
                ))}
                {/* Day number row */}
                {days.map((d, i) => {
                  const isToday = d.dateStr === today;
                  const isWeekend = d.dow === 0 || d.dow === 6;
                  const isFirstOfMonth = i === 0 || d.month !== days[i - 1].month;
                  return (
                    <div
                      key={d.dateStr}
                      className="absolute flex items-center justify-center"
                      style={{
                        left: i * zoom,
                        width: zoom,
                        top: MONTH_ROW,
                        height: DAY_ROW,
                        borderLeft: isFirstOfMonth ? "1px solid var(--border)" : "1px solid var(--border)",
                        backgroundColor: isToday ? "rgba(229, 57, 53, 0.08)" : isWeekend ? "var(--secondary)" : undefined,
                      }}
                    >
                      {showDayNum && (
                        <span className="text-[10px] font-medium" style={{ color: isToday ? "#E53935" : isWeekend ? "var(--muted-foreground)" : "var(--muted-foreground)" }}>
                          {d.dayNum}
                        </span>
                      )}
                    </div>
                  );
                })}
                {/* "I dag" red dot */}
                {todayIdx >= 0 && todayIdx < totalDays && (
                  <div className="absolute z-30" style={{ left: todayIdx * zoom + zoom / 2 - 3, top: MONTH_ROW - 2 }}>
                    <div className="rounded-full" style={{ width: 6, height: 6, backgroundColor: "#E53935" }} />
                  </div>
                )}
              </div>

              {/* Day grid body */}
              <div className="relative" style={{ height: totalHeight }}>
                {/* Day column backgrounds */}
                {days.map((d, i) => {
                  const isToday = d.dateStr === today;
                  const isWeekend = d.dow === 0 || d.dow === 6;
                  const isFirstOfMonth = i === 0 || d.month !== days[i - 1].month;
                  if (!isToday && !isWeekend && !isFirstOfMonth) return null;
                  return (
                    <div
                      key={`bg-${d.dateStr}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: i * zoom,
                        width: zoom,
                        top: 0,
                        height: totalHeight,
                        backgroundColor: isToday ? "rgba(229, 57, 53, 0.04)" : isWeekend ? "var(--secondary)" : undefined,
                        borderLeft: isFirstOfMonth ? "1px solid var(--border)" : undefined,
                        opacity: isWeekend ? 0.3 : 1
                      }}
                    />
                  );
                })}

                {/* Today vertical line */}
                {todayIdx >= 0 && todayIdx < totalDays && (
                  <div className="absolute z-10 pointer-events-none" style={{ left: todayIdx * zoom + zoom / 2, top: 0, width: 1, height: totalHeight, backgroundColor: "#E53935", opacity: 0.5 }} />
                )}

                {/* Employee header row backgrounds */}
                {headers.map((h) => (
                  <div key={`hbg-${h.label}`} className="absolute bg-secondary/30 pointer-events-none" style={{ top: h.y, left: 0, width: gridWidth, height: EMP_HEADER, borderBottom: "1px solid var(--border)" }} />
                ))}

                {/* Row borders */}
                {rows.map((row, rowIdx) => (
                  <div key={`rb-${row.project.project_number}-${rowIdx}`} className="absolute pointer-events-none bg-border" style={{ top: row.y + ROW_HEIGHT - 1, left: 0, width: gridWidth, height: 1 }} />
                ))}

                {/* Project bars */}
                {rows.map((row, rowIdx) => {
                  const p = row.project;
                  // Use check-in dates when available, fall back to project dates
                  const barStart = row.checkinStartDate || p.start_date;
                  const barEnd = row.checkinEndDate || p.estimated_end_date;

                  if (!barStart || !barEnd) {
                    return (
                      <div key={`${p.project_number}-${rowIdx}`} className="absolute flex items-center pl-2" style={{ top: row.y, left: 0, height: ROW_HEIGHT }}>
                        <span className="rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: STATUS_COLORS_SOFT[p.status] || "#eee", color: "#555" }}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </div>
                    );
                  }

                  const startI = dayIndex(rangeStartStr, barStart);
                  const endI = dayIndex(rangeStartStr, barEnd);
                  const barDays = Math.max(1, endI - startI + 1);
                  const barLeft = startI * zoom;
                  const barWidth = barDays * zoom;
                  const isHovered = hoveredProject === p.project_number;
                  const bs = getBarStyle(p, today);
                  const empColor = EMPLOYEE_COLORS[p.assigned || ""] || null;
                  const isFallback = !row.fromCheckins;

                  return (
                    <div
                      key={`${p.project_number}-${rowIdx}`}
                      className="absolute"
                      style={{ top: row.y, left: barLeft, width: barWidth, height: ROW_HEIGHT, opacity: isFallback ? 0.5 : 1 }}
                    >
                      <div
                        className="absolute flex items-center cursor-pointer transition-shadow"
                        style={{
                          left: 0,
                          width: barWidth,
                          height: BAR_HEIGHT,
                          top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                          backgroundColor: bs.bg,
                          border: isHovered ? "1px solid rgba(0,0,0,0.3)" : isFallback ? "1px dashed #B0B0B0" : bs.border,
                          borderRadius: 6,
                          boxShadow: isHovered ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
                        }}
                        onMouseEnter={(e) => handleBarEnter(p.project_number, e)}
                        onMouseMove={handleBarMouseMove}
                        onMouseLeave={handleBarLeave}
                        onClick={(e) => {
                          if (window.innerWidth < 1024) {
                            handleBarEnter(p.project_number, e);
                            setTimeout(() => handleBarLeave(), 3000);
                          }
                        }}
                      >
                        {empColor && showDayNum && (
                          <div
                            className="flex shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white ml-1.5"
                            style={{ width: 16, height: 16, backgroundColor: empColor }}
                          >
                            {(p.assigned || "?")[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Hover popup */}
        {hoveredData && (
          <HoverPopup
            project={hoveredData}
            x={popupPos.x}
            y={popupPos.y}
            projects={safeProjects}
            onMouseEnter={handlePopupEnter}
            onMouseLeave={handlePopupLeave}
          />
        )}
      </div>
    </div>
  );
}

// --- Hover popup ---

function HoverPopup({
  project: p,
  x,
  y,
  projects,
  onMouseEnter,
  onMouseLeave,
}: {
  project: Project;
  x: number;
  y: number;
  projects: Project[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const activeStage = getActiveStage(p.status);
  const [viewingStage, setViewingStage] = useState<StageKey>(activeStage);

  const dep = p.dependency ? projects.find((pr) => pr.project_number === p.dependency) : null;
  const duration =
    p.start_date && p.estimated_end_date ? Math.max(1, daysBetween(p.start_date, p.estimated_end_date)) : null;

  const isFerdig = p.status === "ferdig";
  const allChecklistsPassed =
    !!p.checklists && p.checklists.length > 0 && p.checklists.every((c) => c.done === c.total);
  const showWarning = isFerdig && p.checklists && p.checklists.length > 0 && !allChecklistsPassed;

  const stages: StageKey[] = [1, 2, 3];

  return (
    <div
      className="popup-enter fixed z-[9999] w-[380px] rounded-xl shadow-xl bg-card border border-border"
      style={{ left: x, top: y }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="p-5 pb-0">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <Link href={`/project/${p.project_number}`} className="text-[11px] hover:underline text-muted-foreground/70">#{p.project_number}</Link>
            <p className="mt-0.5 text-[15px] font-bold text-foreground">{p.name}</p>
          </div>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: STATUS_COLORS_SOFT[p.status] || "#eee", color: "#444" }}>
            {STATUS_LABELS[p.status] || p.status}
          </span>
        </div>

        {p.assigned && (
          <div className="mb-3 flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: EMPLOYEE_COLORS[p.assigned] || "#888" }} />
            <span className="font-medium">{p.assigned}</span>
          </div>
        )}

        {dep && (
          <p className="mb-3 text-[12px] text-muted-foreground">
            Avhenger av{" "}
            <span className="font-medium text-foreground">#{dep.project_number} {dep.name}</span>
            {dep.status !== "ferdig" && <span className="ml-1 font-medium" style={{ color: "#E5A940" }}>(ikke ferdig)</span>}
          </p>
        )}

        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] text-foreground">
          {p.start_date && <div><span className="text-muted-foreground/70">Start: </span>{formatDate(p.start_date)}</div>}
          {p.estimated_end_date && <div><span className="text-muted-foreground/70">Slutt: </span>{p.end_date_defaulted ? "Ikke estimert" : formatDate(p.estimated_end_date)}</div>}
          {p.agreed_price != null && <div><span className="text-muted-foreground/70">Pris: </span>{formatPrice(p.agreed_price)}</div>}
          {duration != null && <div><span className="text-muted-foreground/70">Varighet: </span>{duration} {duration === 1 ? "dag" : "dager"}</div>}
        </div>
      </div>

      <div className="px-5 pt-4 pb-3 border-t border-border">
        <div className="flex items-center mb-4">
          {stages.map((s, i) => {
            const state = getStageState(s, activeStage, allChecklistsPassed, isFerdig);
            const isViewing = viewingStage === s;
            let bg: string, borderCol: string, text: string;
            if (state === "completed") { bg = "#22c55e"; borderCol = "#22c55e"; text = "#fff"; }
            else if (state === "active") { bg = "#4CAF50"; borderCol = "#4CAF50"; text = "#fff"; }
            else { bg = "transparent"; borderCol = "var(--border)"; text = "var(--muted-foreground)"; }
            return (
              <div key={s} className="flex items-center flex-1">
                <button className="flex flex-col items-center gap-1 flex-1 cursor-pointer min-h-[44px]" onClick={() => setViewingStage(s)}>
                  <div className="flex items-center justify-center rounded-full text-[11px] font-semibold" style={{ width: 24, height: 24, backgroundColor: bg, border: `2px solid ${borderCol}`, color: text, boxShadow: isViewing ? "0 0 0 2px rgba(76,175,80,0.2)" : "none" }}>
                    {state === "completed" ? "\u2713" : s}
                  </div>
                  <span className={`text-[10px] font-medium ${isViewing ? "text-foreground" : "text-muted-foreground/70"}`}>{STAGE_LABELS[s]}</span>
                </button>
                {i < 2 && (
                  <svg width="16" height="10" viewBox="0 0 16 10" className="-mt-3.5 mx-0.5 opacity-30 text-foreground">
                    <path d="M2,1 L8,5 L2,9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <div className="mb-1">
          <p className="text-[10px] font-semibold uppercase mb-1.5 text-muted-foreground/70 tracking-[0.04em]">{viewingStage}. {STAGE_LABELS[viewingStage]}</p>
          {STAGE_ITEMS[viewingStage].map((item, idx) => {
            const done = isItemComplete(viewingStage, idx, activeStage, p.checklists, isFerdig, allChecklistsPassed);
            const linked = getChecklistForItem(viewingStage, idx, p.checklists);
            return (
              <div key={item} className="flex items-center gap-2 h-6">
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0"><circle cx="7" cy="7" r="6" fill="#22c55e" /><path d="M4,7 L6,9.5 L10,4.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0"><circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--border)" strokeWidth="1" /></svg>
                )}
                <span className={`text-[12px] ${done ? "text-muted-foreground/70 line-through" : "text-foreground"}`}>{item}</span>
                {linked && <span className="ml-auto text-[10px] text-muted-foreground/70">{linked.done}/{linked.total}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {showWarning && (
        <div className="mx-5 mb-4 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
          Sjekklister m&aring; godkjennes f&oslash;r prosjektet kan lukkes
        </div>
      )}
      <div className="h-1" />
    </div>
  );
}
