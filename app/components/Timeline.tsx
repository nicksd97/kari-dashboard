"use client";

import { useState, useRef, useCallback } from "react";
import type { Project, Checklist, Checkin } from "@/lib/types";
import {
  STATUS_COLORS_SOFT,
  STATUS_LABELS,
  EMPLOYEE_COLORS,
} from "@/lib/types";

interface TimelineProps {
  projects: Project[];
  checkins?: Checkin[];
}

const EMPLOYEES = ["Roar", "Andrii", "Marci"];
const LEFT_COL = 200;
const ROW_HEIGHT = 44;
const BAR_HEIGHT = 28;
const EMP_HEADER = 36;
const MONTH_BAR = 48;
const GROUP_GAP = 8;

// --- Utilities ---

function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(n);
}

// --- Bar colors: blue/amber/coral/gray/white ---

interface BarStyle {
  bg: string;
  border: string;
  textColor: string;
  showStatusPill: boolean;
}

function getBarStyle(p: Project, today: string): BarStyle {
  // Completed → light gray, flat
  if (p.status === "ferdig") {
    return {
      bg: "#E0E0E0",
      border: "1px solid #D0D0D0",
      textColor: "#777",
      showStatusPill: false,
    };
  }

  // Not started → white + dashed
  if (
    p.status === "innkommende" ||
    p.status === "planlegging" ||
    (p.start_date && p.start_date > today)
  ) {
    return {
      bg: "#ffffff",
      border: "1px dashed #D0D0D0",
      textColor: "#555",
      showStatusPill: true,
    };
  }

  // Overdue → coral
  const overdue =
    p.estimated_end_date &&
    p.estimated_end_date < today &&
    p.status !== "ferdig";
  if (overdue) {
    return {
      bg: "#E06050",
      border: "1px solid #C9503F",
      textColor: "#fff",
      showStatusPill: false,
    };
  }

  // Needs attention → amber
  const nearDeadline =
    p.estimated_end_date &&
    daysBetween(today, p.estimated_end_date) <= 5 &&
    daysBetween(today, p.estimated_end_date) >= 0;

  if (p.status === "venter kunde" || nearDeadline) {
    return {
      bg: "#E5A940",
      border: "1px solid #CF952F",
      textColor: "#fff",
      showStatusPill: false,
    };
  }

  // Active → clean blue
  return {
    bg: "#4A90D9",
    border: "1px solid #3D7CC0",
    textColor: "#fff",
    showStatusPill: false,
  };
}

// --- Stage workflow logic (unchanged from before) ---

type StageKey = 1 | 2 | 3;

const STAGE_LABELS: Record<StageKey, string> = {
  1: "Oppstart",
  2: "Pågående",
  3: "Avslutning",
};

const STAGE_ITEMS: Record<StageKey, string[]> = {
  1: [
    "Kontrakt signert",
    "Prosjektmappe opprettet",
    "Materialliste klar",
    "Planner-oppgave opprettet",
    "Kickoff med team",
  ],
  2: [
    "Vernerunde gjennomført",
    "Materialer bestilt/levert",
    "Kvalitetskontroll underveis",
    "Timer og kostnader loggført",
    "Oppfølging med kunde",
  ],
  3: [
    "Kvalitetskontroll ferdig",
    "Ferdigstillelse-sjekkliste",
    "FDV-dokumentasjon levert",
    "Sluttfaktura sendt",
    "Prosjekt lukket i Planner",
  ],
};

function getActiveStage(status: string): StageKey {
  if (status === "innkommende" || status === "planlegging") return 1;
  if (status === "materialer" || status === "pagaende" || status === "venter kunde") return 2;
  return 3;
}

function getStageState(
  stageKey: StageKey,
  activeStage: StageKey,
  allChecklistsPassed: boolean,
  isFerdig: boolean
): "completed" | "active" | "future" {
  if (isFerdig && allChecklistsPassed) return "completed";
  if (stageKey < activeStage) return "completed";
  if (stageKey === activeStage) return "active";
  return "future";
}

function isItemComplete(
  stageKey: StageKey,
  itemIndex: number,
  activeStage: StageKey,
  checklists: Checklist[] | undefined,
  isFerdig: boolean,
  allChecklistsPassed: boolean
): boolean {
  if (isFerdig && allChecklistsPassed) return true;
  if (stageKey < activeStage) return true;
  if (stageKey > activeStage) return false;
  const cls = checklists || [];
  if (stageKey === 2) {
    const item = STAGE_ITEMS[2][itemIndex];
    if (item === "Vernerunde gjennomført") {
      const v = cls.find((c) => c.name.toLowerCase().includes("vernerunde"));
      return v ? v.done === v.total : false;
    }
    if (item === "Kvalitetskontroll underveis") {
      const q = cls.find((c) => c.name.toLowerCase().includes("kvalitetskontroll"));
      return q ? q.done === q.total : false;
    }
  }
  if (stageKey === 3) {
    const item = STAGE_ITEMS[3][itemIndex];
    if (item === "Kvalitetskontroll ferdig") {
      const q = cls.find((c) => c.name.toLowerCase().includes("kvalitetskontroll"));
      return q ? q.done === q.total : false;
    }
    if (item === "Ferdigstillelse-sjekkliste") {
      const f = cls.find((c) => c.name.toLowerCase().includes("ferdigstillelse"));
      return f ? f.done === f.total : false;
    }
    if (item === "Sluttfaktura sendt") return isFerdig || activeStage === 3;
    if (item === "Prosjekt lukket i Planner") return isFerdig;
  }
  return false;
}

function getChecklistForItem(
  stageKey: StageKey,
  itemIndex: number,
  checklists: Checklist[] | undefined
): Checklist | null {
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

export default function Timeline({ projects, checkins }: TimelineProps) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeProjects = projects || [];

  const datedProjects = safeProjects.filter((p) => p.start_date && p.estimated_end_date);
  const today = new Date().toISOString().split("T")[0];

  const allDates = datedProjects.flatMap((p) => [p.start_date!, p.estimated_end_date!]);
  allDates.push(today);
  const minDate = allDates.sort()[0];
  const maxDate = allDates.sort().reverse()[0];

  // Tight range: start of earliest month → latest date + 14 days
  const rangeStart = new Date(minDate);
  rangeStart.setDate(1);
  const rangeEnd = new Date(maxDate);
  rangeEnd.setDate(rangeEnd.getDate() + 14);

  const rangeStartStr = rangeStart.toISOString().split("T")[0];
  const rangeEndStr = rangeEnd.toISOString().split("T")[0];
  const totalDays = Math.max(1, daysBetween(rangeStartStr, rangeEndStr));

  // Returns percentage (0–100) of timeline width
  function dateToPct(date: string) {
    return (daysBetween(rangeStartStr, date) / totalDays) * 100;
  }

  // Group by employee
  const grouped: Record<string, Project[]> = {};
  for (const emp of EMPLOYEES) grouped[emp] = [];
  grouped["Ikke tildelt"] = [];
  for (const p of datedProjects) {
    const key = p.assigned && EMPLOYEES.includes(p.assigned) ? p.assigned : "Ikke tildelt";
    grouped[key].push(p);
  }
  const undated = safeProjects.filter((p) => !p.start_date || !p.estimated_end_date);

  // Month labels (only months that overlap with the range)
  const months: { label: string; pct: number }[] = [];
  const cur = new Date(rangeStart);
  while (cur < rangeEnd) {
    const d = cur.toISOString().split("T")[0];
    months.push({
      label: cur.toLocaleDateString("nb-NO", { month: "short", year: "numeric" }),
      pct: dateToPct(d),
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  const todayPct = dateToPct(today);

  // Simple layout: one row per project, stacked under each employee
  let y = 0;
  let groupIdx = 0;
  const rows: { project: Project; y: number; rowIndex: number }[] = [];
  const headers: { label: string; color: string; y: number }[] = [];

  for (const emp of [...EMPLOYEES, "Ikke tildelt"]) {
    const group = grouped[emp];
    if (group.length === 0 && emp !== "Ikke tildelt") continue;
    if (groupIdx > 0) y += GROUP_GAP;
    headers.push({ label: emp, color: EMPLOYEE_COLORS[emp] || "#999", y });
    y += EMP_HEADER;
    group.forEach((p, i) => {
      rows.push({ project: p, y, rowIndex: i });
      y += ROW_HEIGHT;
    });
    groupIdx++;
  }

  if (undated.length > 0) {
    if (groupIdx > 0) y += GROUP_GAP;
    headers.push({ label: "Uten dato", color: "#999", y });
    y += EMP_HEADER;
    undated.forEach((p, i) => {
      rows.push({ project: p, y, rowIndex: i });
      y += ROW_HEIGHT;
    });
  }

  const totalHeight = Math.max(500, y + 20);

  // Hover handlers
  const POPUP_HEIGHT_EST = 420;
  const POPUP_WIDTH = 380;

  const handleBarMouseMove = useCallback((e: React.MouseEvent) => {
    let px = e.clientX + 16;
    let py = e.clientY + 8;
    if (window.innerHeight - e.clientY < POPUP_HEIGHT_EST + 20) {
      py = e.clientY - POPUP_HEIGHT_EST - 10;
    }
    if (px + POPUP_WIDTH > window.innerWidth - 16) {
      px = e.clientX - POPUP_WIDTH - 16;
    }
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

  // Empty state (must be after all hooks to avoid React error #300)
  if (safeProjects.length === 0) {
    const activeCheckins = (checkins || []).filter((c) => c.status === "checked_in");

    return (
      <div
        className="rounded-xl"
        style={{
          border: "1px solid var(--card-border)",
          backgroundColor: "var(--card-bg)",
          minHeight: 400,
        }}
      >
        {/* "Aktive i dag" cards from checkin data */}
        {activeCheckins.length > 0 && (
          <div className="p-5 pb-3">
            <p
              className="text-[11px] font-semibold uppercase mb-3"
              style={{ color: "var(--muted-light)", letterSpacing: "0.04em" }}
            >
              Aktive i dag
            </p>
            <div className="flex gap-3 flex-wrap">
              {activeCheckins.map((c) => {
                const empColor = EMPLOYEE_COLORS[c.employee] || "#4A90D9";
                return (
                  <div
                    key={c.employee}
                    className="flex items-start gap-3 rounded-lg"
                    style={{
                      border: "1px solid var(--card-border)",
                      backgroundColor: "var(--surface)",
                      padding: "12px 16px",
                      flex: "1 1 200px",
                      maxWidth: 340,
                    }}
                  >
                    <div
                      className="flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5"
                      style={{ width: 22, height: 22, backgroundColor: empColor }}
                    >
                      {c.employee[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                          {c.employee}
                        </span>
                        {c.projectNumber && (
                          <span className="text-[11px] font-medium" style={{ color: "var(--muted-light)" }}>
                            #{c.projectNumber}
                          </span>
                        )}
                        {c.time && (
                          <span className="ml-auto text-[10px]" style={{ color: "var(--muted-light)" }}>
                            kl. {c.time}
                          </span>
                        )}
                      </div>
                      {c.summary && (
                        <p className="mt-1 text-[12px] leading-snug" style={{ color: "var(--muted)" }}>
                          {c.summary}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty timeline message */}
        <div
          className="flex flex-col items-center justify-center"
          style={{ minHeight: activeCheckins.length > 0 ? 200 : 400 }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ color: "var(--muted-light)", opacity: 0.5 }}>
            <rect x="4" y="12" width="40" height="4" rx="2" fill="currentColor" />
            <rect x="4" y="22" width="28" height="4" rx="2" fill="currentColor" />
            <rect x="4" y="32" width="34" height="4" rx="2" fill="currentColor" />
          </svg>
          <p className="mt-4 text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>
            Ingen prosjekter enn&aring;
          </p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--muted-light)" }}>
            Prosjekter vil vises her n&aring;r de opprettes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl"
      style={{
        border: "1px solid var(--card-border)",
        backgroundColor: "var(--card-bg)",
        minHeight: 500,
      }}
    >
      <div className="relative" style={{ height: totalHeight + MONTH_BAR }}>

        {/* ── Month header bar ── */}
        <div
          className="sticky top-0 z-10 flex"
          style={{
            height: MONTH_BAR,
            borderBottom: "1px solid var(--divider)",
            backgroundColor: "var(--card-bg)",
          }}
        >
          {/* Left column header */}
          <div
            className="shrink-0 flex items-end pb-2.5 pl-4 text-[11px] font-medium"
            style={{
              width: LEFT_COL,
              color: "var(--muted-light)",
              borderRight: "1px solid var(--divider)",
            }}
          >
            Prosjekt
          </div>

          {/* Timeline header area (months + I dag pill) */}
          <div className="relative flex-1">
            {/* "I dag" pill */}
            <div
              className="absolute z-30 -translate-x-1/2"
              style={{ left: `${todayPct}%`, top: 4 }}
            >
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap"
                style={{ backgroundColor: "#E8655020", color: "#E06050" }}
              >
                I dag
              </span>
            </div>

            {months.map((m, i) => {
              const nextPct = i < months.length - 1 ? months[i + 1].pct : 100;
              return (
                <div
                  key={m.label}
                  className="absolute flex items-end pb-2.5 pl-2"
                  style={{
                    left: `${m.pct}%`,
                    width: `${nextPct - m.pct}%`,
                    top: 0,
                    height: MONTH_BAR,
                  }}
                >
                  <span
                    className="text-[11px] font-medium whitespace-nowrap"
                    style={{ color: "var(--muted-light)", letterSpacing: "0.03em" }}
                  >
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Body: left column + timeline area ── */}
        <div className="absolute flex" style={{ top: MONTH_BAR, left: 0, right: 0, height: totalHeight }}>

          {/* Left column area (for border) */}
          <div
            className="shrink-0 relative"
            style={{ width: LEFT_COL, borderRight: "1px solid var(--divider)" }}
          />

          {/* Timeline area (gridlines, today line, bars) */}
          <div className="relative flex-1">
            {/* Vertical gridlines */}
            {months.map((m) => (
              <div
                key={`g-${m.label}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${m.pct}%`,
                  top: 0,
                  width: 1,
                  height: totalHeight,
                  backgroundColor: "#F0F0F0",
                }}
              />
            ))}

            {/* "I dag" line */}
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: `${todayPct}%`,
                top: 0,
                width: 1,
                height: totalHeight,
                backgroundColor: "#E06050",
                opacity: 0.6,
              }}
            />
          </div>
        </div>

        {/* ── Employee headers (full width) ── */}
        {headers.map((h) => (
          <div
            key={h.label}
            className="absolute flex items-center gap-2 px-4"
            style={{
              top: MONTH_BAR + h.y,
              left: 0,
              right: 0,
              height: EMP_HEADER,
              backgroundColor: "var(--card-bg)",
              borderBottom: "1px solid var(--divider)",
            }}
          >
            <span
              className="rounded-full"
              style={{ width: 6, height: 6, backgroundColor: h.color }}
            />
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {h.label}
            </span>
          </div>
        ))}

        {/* ── Row backgrounds (alternating) ── */}
        {rows.map((row) => (
          <div
            key={`bg-${row.project.project_number}`}
            className="absolute"
            style={{
              top: MONTH_BAR + row.y,
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
              backgroundColor: row.rowIndex % 2 === 1 ? "var(--row-alt)" : "var(--card-bg)",
            }}
          />
        ))}

        {/* ── Project rows ── */}
        {rows.map((row) => {
          const p = row.project;

          // Undated: show name + status badge only, no bar
          if (!p.start_date || !p.estimated_end_date) {
            return (
              <div
                key={p.project_number}
                className="absolute flex items-center"
                style={{ top: MONTH_BAR + row.y, left: 0, right: 0, height: ROW_HEIGHT }}
              >
                <div className="shrink-0 truncate pl-4 pr-3 text-[12px]" style={{ width: LEFT_COL }}>
                  <span style={{ color: "var(--muted-light)" }}>#{p.project_number}</span>{" "}
                  <span style={{ color: "var(--foreground)" }}>{p.name}</span>
                  {p.dependency && (
                    <span className="ml-1 text-[10px] italic" style={{ color: "#999" }}>
                      &larr; etter #{p.dependency}
                    </span>
                  )}
                </div>
                <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
                  <span
                    className="absolute rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      top: (ROW_HEIGHT - 20) / 2,
                      left: 8,
                      backgroundColor: STATUS_COLORS_SOFT[p.status] || "#eee",
                      color: "#555",
                    }}
                  >
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
              </div>
            );
          }

          const startPct = dateToPct(p.start_date);
          const endPct = dateToPct(p.estimated_end_date);
          const widthPct = Math.max(2, endPct - startPct);
          const isFerdig = p.status === "ferdig";
          const isHovered = hoveredProject === p.project_number;
          const bs = getBarStyle(p, today);

          return (
            <div
              key={p.project_number}
              className="absolute flex items-center"
              style={{ top: MONTH_BAR + row.y, left: 0, right: 0, height: ROW_HEIGHT }}
            >
              {/* Left label + dependency text */}
              <div
                className="shrink-0 truncate pl-4 pr-3 text-[12px]"
                style={{ width: LEFT_COL }}
              >
                <span style={{ color: "var(--muted-light)", fontWeight: 400 }}>
                  #{p.project_number}
                </span>{" "}
                <span
                  style={{
                    color: isFerdig ? "var(--muted-light)" : "var(--foreground)",
                    fontWeight: 400,
                    textDecoration: isFerdig ? "line-through" : "none",
                  }}
                >
                  {p.name}
                </span>
                {p.dependency && (
                  <span className="ml-1 text-[10px] italic" style={{ color: "#999" }}>
                    &larr; #{p.dependency}
                  </span>
                )}
              </div>

              {/* Timeline area for this row */}
              <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
                <div
                  className="absolute flex items-center gap-1.5 px-2.5 cursor-pointer transition-shadow duration-100 overflow-hidden whitespace-nowrap"
                  style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                    height: BAR_HEIGHT,
                    top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                    backgroundColor: bs.bg,
                    border: isHovered ? "1px solid rgba(0,0,0,0.25)" : bs.border,
                    borderRadius: 6,
                    color: bs.textColor,
                    boxShadow: isHovered ? "0 2px 8px rgba(0,0,0,0.10)" : "none",
                    minWidth: 24,
                  }}
                  onMouseEnter={(e) => handleBarEnter(p.project_number, e)}
                  onMouseMove={handleBarMouseMove}
                  onMouseLeave={handleBarLeave}
                >
                  <span className="text-[11px] font-medium truncate">{p.name}</span>
                  {bs.showStatusPill && (
                    <span
                      className="ml-auto shrink-0 rounded-full px-1.5 py-px text-[9px] font-medium"
                      style={{
                        backgroundColor: STATUS_COLORS_SOFT[p.status] || "#eee",
                        color: "#555",
                      }}
                    >
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

      </div>

      {/* ── Hover popup (fixed positioning, outside scroll container) ── */}
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
      className="popup-enter"
      style={{
        position: "fixed",
        left: x,
        top: y,
        width: 380,
        zIndex: 9999,
        backgroundColor: "var(--card-bg)",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Top section */}
      <div className="p-5 pb-0">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px]" style={{ color: "var(--muted-light)" }}>
              #{p.project_number}
            </p>
            <p className="mt-0.5 text-[15px] font-bold" style={{ color: "var(--foreground)" }}>
              {p.name}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ backgroundColor: STATUS_COLORS_SOFT[p.status] || "#eee", color: "#444" }}
          >
            {STATUS_LABELS[p.status] || p.status}
          </span>
        </div>

        {p.assigned && (
          <div className="mb-3 flex items-center gap-2 text-[13px]" style={{ color: "var(--muted)" }}>
            <span
              className="rounded-full"
              style={{ width: 8, height: 8, backgroundColor: EMPLOYEE_COLORS[p.assigned] || "#888" }}
            />
            <span className="font-medium">{p.assigned}</span>
          </div>
        )}

        {dep && (
          <p className="mb-3 text-[12px]" style={{ color: "var(--muted)" }}>
            Avhenger av{" "}
            <span className="font-medium" style={{ color: "var(--foreground)" }}>
              #{dep.project_number} {dep.name}
            </span>
            {dep.status !== "ferdig" && (
              <span className="ml-1 font-medium" style={{ color: "#E5A940" }}>
                (ikke ferdig)
              </span>
            )}
          </p>
        )}

        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]" style={{ color: "var(--foreground)" }}>
          {p.start_date && (
            <div><span style={{ color: "var(--muted-light)" }}>Start: </span>{formatDate(p.start_date)}</div>
          )}
          {p.estimated_end_date && (
            <div><span style={{ color: "var(--muted-light)" }}>Slutt: </span>{p.end_date_defaulted ? "Ikke estimert" : formatDate(p.estimated_end_date)}</div>
          )}
          {p.agreed_price != null && (
            <div><span style={{ color: "var(--muted-light)" }}>Pris: </span>{formatPrice(p.agreed_price)}</div>
          )}
          {duration != null && (
            <div><span style={{ color: "var(--muted-light)" }}>Varighet: </span>{duration} {duration === 1 ? "dag" : "dager"}</div>
          )}
        </div>
      </div>

      {/* Stage workflow */}
      <div className="px-5 pt-4 pb-3" style={{ borderTop: "1px solid var(--divider)" }}>
        {/* Stage indicators with line connectors */}
        <div className="flex items-center mb-4">
          {stages.map((s, i) => {
            const state = getStageState(s, activeStage, allChecklistsPassed, isFerdig);
            const isViewing = viewingStage === s;

            let bg: string, borderCol: string, text: string;
            if (state === "completed") {
              bg = "#22c55e"; borderCol = "#22c55e"; text = "#fff";
            } else if (state === "active") {
              bg = "#4A90D9"; borderCol = "#4A90D9"; text = "#fff";
            } else {
              bg = "transparent"; borderCol = "#D0D0D0"; text = "#999";
            }

            return (
              <div key={s} className="flex items-center" style={{ flex: 1 }}>
                <button
                  className="flex flex-col items-center gap-1 flex-1 cursor-pointer"
                  onClick={() => setViewingStage(s)}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-100"
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: bg,
                      border: `2px solid ${borderCol}`,
                      color: text,
                      boxShadow: isViewing ? "0 0 0 2px rgba(74,144,217,0.2)" : "none",
                    }}
                  >
                    {state === "completed" ? "\u2713" : s}
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: isViewing ? "var(--foreground)" : "var(--muted-light)" }}
                  >
                    {STAGE_LABELS[s]}
                  </span>
                </button>

                {/* Chevron connector */}
                {i < 2 && (
                  <svg width="16" height="10" viewBox="0 0 16 10" className="-mt-3.5 mx-0.5" style={{ opacity: 0.3 }}>
                    <path d="M2,1 L8,5 L2,9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Items */}
        <div className="mb-1">
          <p
            className="text-[10px] font-semibold uppercase mb-1.5"
            style={{ color: "var(--muted-light)", letterSpacing: "0.04em" }}
          >
            {viewingStage}. {STAGE_LABELS[viewingStage]}
          </p>
          {STAGE_ITEMS[viewingStage].map((item, idx) => {
            const done = isItemComplete(viewingStage, idx, activeStage, p.checklists, isFerdig, allChecklistsPassed);
            const linked = getChecklistForItem(viewingStage, idx, p.checklists);
            return (
              <div key={item} className="flex items-center gap-2" style={{ height: 24 }}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
                    <circle cx="7" cy="7" r="6" fill="#22c55e" />
                    <path d="M4,7 L6,9.5 L10,4.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
                    <circle cx="7" cy="7" r="5.5" fill="none" stroke="#D0D0D0" strokeWidth="1" />
                  </svg>
                )}
                <span
                  className="text-[12px]"
                  style={{
                    color: done ? "var(--muted-light)" : "var(--foreground)",
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  {item}
                </span>
                {linked && (
                  <span className="ml-auto text-[10px]" style={{ color: "var(--muted-light)" }}>
                    {linked.done}/{linked.total}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showWarning && (
        <div
          className="mx-5 mb-4 rounded-lg px-3 py-2 text-[11px] font-medium"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          Sjekklister m&aring; godkjennes f&oslash;r prosjektet kan lukkes
        </div>
      )}

      <div style={{ height: 4 }} />
    </div>
  );
}
