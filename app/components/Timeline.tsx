"use client";

import { useState, useRef, useCallback } from "react";
import type { Project, Checklist } from "@/lib/types";
import {
  STATUS_COLORS_SOFT,
  STATUS_LABELS,
  EMPLOYEE_COLORS,
} from "@/lib/types";

interface TimelineProps {
  projects: Project[];
}

const EMPLOYEES = ["Roar", "Andrii", "Marci"];
const LEFT_COL = 200;
const ROW_HEIGHT = 52;
const BAR_HEIGHT = 32;
const HEADER_HEIGHT = 40;
const MONTH_HEADER = 44;
const GROUP_GAP = 16;

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

// --- Traffic light bar colors ---

interface BarStyle {
  bg: string;
  textColor: string;
  border: string;
  isDashed: boolean;
  useHatching: boolean;
}

function getBarStyle(p: Project, today: string): BarStyle {
  // GRAY: completed
  if (p.status === "ferdig") {
    return {
      bg: "#B0B0B0",
      textColor: "#4a4a4a",
      border: "2px solid transparent",
      isDashed: false,
      useHatching: true,
    };
  }

  // WHITE: future / not started
  if (
    p.status === "innkommende" ||
    p.status === "planlegging" ||
    (p.start_date && p.start_date > today)
  ) {
    return {
      bg: "#ffffff",
      textColor: "#4a4a4a",
      border: "2px dashed #c4c4c4",
      isDashed: true,
      useHatching: false,
    };
  }

  // RED: overdue or checklist failures
  const isOverdue =
    p.estimated_end_date && p.estimated_end_date < today && p.status !== "ferdig";
  const hasChecklistFailure =
    p.checklists &&
    p.checklists.length > 0 &&
    p.checklists.some((c) => c.total > 0 && c.done < c.total * 0.5);

  if (isOverdue || hasChecklistFailure) {
    return {
      bg: "#F09595",
      textColor: "#ffffff",
      border: "2px solid transparent",
      isDashed: false,
      useHatching: false,
    };
  }

  // YELLOW: venter kunde, or deadline within 5 days
  const nearDeadline =
    p.estimated_end_date &&
    daysBetween(today, p.estimated_end_date) <= 5 &&
    daysBetween(today, p.estimated_end_date) >= 0;

  if (p.status === "venter kunde" || nearDeadline) {
    return {
      bg: "#FAC775",
      textColor: "#ffffff",
      border: "2px solid transparent",
      isDashed: false,
      useHatching: false,
    };
  }

  // GREEN: active and on track
  return {
    bg: "#9FE1CB",
    textColor: "#ffffff",
    border: "2px solid transparent",
    isDashed: false,
    useHatching: false,
  };
}

// --- Stage workflow logic ---

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
  if (
    status === "materialer" ||
    status === "pagaende" ||
    status === "venter kunde"
  )
    return 2;
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
    const itemName = STAGE_ITEMS[2][itemIndex];
    if (itemName === "Vernerunde gjennomført") {
      const v = cls.find((c) =>
        c.name.toLowerCase().includes("vernerunde")
      );
      return v ? v.done === v.total : false;
    }
    if (itemName === "Kvalitetskontroll underveis") {
      const q = cls.find((c) =>
        c.name.toLowerCase().includes("kvalitetskontroll")
      );
      return q ? q.done === q.total : false;
    }
  }

  if (stageKey === 3) {
    const itemName = STAGE_ITEMS[3][itemIndex];
    if (itemName === "Kvalitetskontroll ferdig") {
      const q = cls.find((c) =>
        c.name.toLowerCase().includes("kvalitetskontroll")
      );
      return q ? q.done === q.total : false;
    }
    if (itemName === "Ferdigstillelse-sjekkliste") {
      const f = cls.find((c) =>
        c.name.toLowerCase().includes("ferdigstillelse")
      );
      return f ? f.done === f.total : false;
    }
    if (itemName === "Sluttfaktura sendt") {
      return isFerdig || activeStage === 3;
    }
    if (itemName === "Prosjekt lukket i Planner") {
      return isFerdig;
    }
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
    if (itemIndex === 0)
      return (
        cls.find((c) => c.name.toLowerCase().includes("vernerunde")) ||
        null
      );
    if (itemIndex === 2)
      return (
        cls.find((c) =>
          c.name.toLowerCase().includes("kvalitetskontroll")
        ) || null
      );
  }
  if (stageKey === 3) {
    if (itemIndex === 0)
      return (
        cls.find((c) =>
          c.name.toLowerCase().includes("kvalitetskontroll")
        ) || null
      );
    if (itemIndex === 1)
      return (
        cls.find((c) =>
          c.name.toLowerCase().includes("ferdigstillelse")
        ) || null
      );
  }
  return null;
}

// Helper to produce 10% opacity of a hex color
function colorAt10(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.10)`;
}

// --- Main component ---

export default function Timeline({ projects }: TimelineProps) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(
    null
  );
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const datedProjects = projects.filter(
    (p) => p.start_date && p.estimated_end_date
  );
  const today = new Date().toISOString().split("T")[0];

  const allDates = datedProjects.flatMap((p) => [
    p.start_date!,
    p.estimated_end_date!,
  ]);
  allDates.push(today);
  const minDate = allDates.sort()[0];
  const maxDate = allDates.sort().reverse()[0];

  const rangeStart = new Date(minDate);
  rangeStart.setDate(1);
  const rangeEnd = new Date(maxDate);
  rangeEnd.setMonth(rangeEnd.getMonth() + 1);
  rangeEnd.setDate(rangeEnd.getDate() + 15);

  const totalDays = daysBetween(
    rangeStart.toISOString().split("T")[0],
    rangeEnd.toISOString().split("T")[0]
  );
  const dayWidth = Math.max(10, 1000 / totalDays);
  const timelineWidth = totalDays * dayWidth;

  function dateToX(date: string) {
    return (
      daysBetween(rangeStart.toISOString().split("T")[0], date) * dayWidth
    );
  }

  const grouped: Record<string, Project[]> = {};
  for (const emp of EMPLOYEES) grouped[emp] = [];
  grouped["Ikke tildelt"] = [];

  for (const p of datedProjects) {
    const key =
      p.assigned && EMPLOYEES.includes(p.assigned)
        ? p.assigned
        : "Ikke tildelt";
    grouped[key].push(p);
  }

  const undated = projects.filter(
    (p) => !p.start_date || !p.estimated_end_date
  );

  const months: { label: string; x: number }[] = [];
  const cursor = new Date(rangeStart);
  while (cursor < rangeEnd) {
    const label = cursor.toLocaleDateString("nb-NO", {
      month: "short",
      year: "numeric",
    });
    const x = dateToX(cursor.toISOString().split("T")[0]);
    months.push({ label, x });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const todayX = dateToX(today);
  const projectByNumber = new Map(
    projects.map((p) => [p.project_number, p])
  );

  // Calculate rows with GROUP_GAP between sections
  let currentY = 0;
  let sectionIndex = 0;
  const rows: {
    project: Project;
    y: number;
    group: string;
    indexInGroup: number;
  }[] = [];
  const groupSections: {
    label: string;
    color: string;
    y: number;
    height: number;
    isFirst: boolean;
  }[] = [];

  const allGroups = [...EMPLOYEES, "Ikke tildelt"];
  for (const emp of allGroups) {
    const group = grouped[emp];
    if (group.length === 0 && emp !== "Ikke tildelt") continue;

    // Add gap before each group except the first
    if (sectionIndex > 0) currentY += GROUP_GAP;

    const sectionStart = currentY;
    currentY += HEADER_HEIGHT;
    group.forEach((p, idx) => {
      rows.push({ project: p, y: currentY, group: emp, indexInGroup: idx });
      currentY += ROW_HEIGHT;
    });
    groupSections.push({
      label: emp,
      color: EMPLOYEE_COLORS[emp] || "#888780",
      y: sectionStart,
      height: currentY - sectionStart,
      isFirst: sectionIndex === 0,
    });
    sectionIndex++;
  }

  if (undated.length > 0) {
    if (sectionIndex > 0) currentY += GROUP_GAP;
    const sectionStart = currentY;
    currentY += HEADER_HEIGHT;
    undated.forEach((p, idx) => {
      rows.push({
        project: p,
        y: currentY,
        group: "Uten dato",
        indexInGroup: idx,
      });
      currentY += ROW_HEIGHT;
    });
    groupSections.push({
      label: "Uten dato",
      color: "#888780",
      y: sectionStart,
      height: currentY - sectionStart,
      isFirst: sectionIndex === 0,
    });
  }

  const totalHeight = Math.max(500, currentY + 20);

  const handleBarMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const scrollTop = containerRef.current.scrollTop;
      setPopupPos({
        x: e.clientX - rect.left + scrollLeft + 20,
        y: e.clientY - rect.top + scrollTop - 12,
      });
    },
    []
  );

  const handleBarEnter = useCallback(
    (projectNumber: string, e: React.MouseEvent) => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      setHoveredProject(projectNumber);
      handleBarMouseMove(e);
    },
    [handleBarMouseMove]
  );

  const handleBarLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => {
      setHoveredProject(null);
    }, 150);
  }, []);

  const handlePopupEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  }, []);

  const handlePopupLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => {
      setHoveredProject(null);
    }, 100);
  }, []);

  const hoveredData = hoveredProject
    ? projects.find((p) => p.project_number === hoveredProject)
    : null;

  const depArrows: {
    from: { x: number; y: number };
    to: { x: number; y: number };
  }[] = [];
  for (const row of rows) {
    if (row.project.dependency) {
      const dep = projectByNumber.get(row.project.dependency);
      if (dep?.estimated_end_date && row.project.start_date) {
        const depRow = rows.find(
          (r) => r.project.project_number === dep.project_number
        );
        if (depRow) {
          depArrows.push({
            from: {
              x: dateToX(dep.estimated_end_date),
              y: depRow.y + ROW_HEIGHT / 2,
            },
            to: {
              x: dateToX(row.project.start_date),
              y: row.y + ROW_HEIGHT / 2,
            },
          });
        }
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-x-auto rounded-xl"
      style={{
        border: "1px solid var(--card-border)",
        backgroundColor: "var(--card-bg)",
        minHeight: 500,
      }}
    >
      <div
        className="relative"
        style={{
          minWidth: LEFT_COL + timelineWidth + 60,
          height: totalHeight + MONTH_HEADER,
        }}
      >
        {/* Month header row */}
        <div
          className="sticky top-0 z-10 flex"
          style={{
            height: MONTH_HEADER,
            paddingLeft: LEFT_COL,
            borderBottom: "1px solid var(--divider)",
            backgroundColor: "var(--card-bg)",
          }}
        >
          {months.map((m, i) => {
            const nextX =
              i < months.length - 1 ? months[i + 1].x : timelineWidth;
            return (
              <div
                key={m.label}
                className="absolute flex items-end pb-2"
                style={{ left: LEFT_COL + m.x, width: nextX - m.x }}
              >
                <span
                  className="text-[12px] font-medium uppercase"
                  style={{
                    color: "var(--muted-light)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Vertical gridlines */}
        {months.map((m) => (
          <div
            key={`grid-${m.label}`}
            className="absolute"
            style={{
              left: LEFT_COL + m.x,
              top: MONTH_HEADER,
              width: 1,
              height: totalHeight,
              background: "var(--divider)",
              opacity: 0.5,
            }}
          />
        ))}

        {/* Today line */}
        <div
          className="absolute z-20"
          style={{
            left: LEFT_COL + todayX,
            top: 0,
            height: totalHeight + MONTH_HEADER,
            width: 2,
            backgroundColor: "#ef4444",
          }}
        >
          <span
            className="absolute -translate-x-1/2 rounded-b-md px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: "#ef4444", top: 0 }}
          >
            I dag
          </span>
        </div>

        {/* Employee group sections */}
        {groupSections.map((section) => (
          <div key={section.label}>
            {/* Group header with employee color tint background + top border */}
            <div
              className="absolute flex items-center gap-2.5 px-4"
              style={{
                top: MONTH_HEADER + section.y,
                left: 0,
                right: 0,
                height: HEADER_HEIGHT,
                backgroundColor: colorAt10(section.color),
                borderLeft: `3px solid ${section.color}`,
                borderTop: section.isFirst
                  ? "none"
                  : `3px solid ${section.color}`,
                borderBottom: "1px solid var(--divider)",
                minWidth: LEFT_COL + timelineWidth + 60,
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: section.color }}
              />
              <span
                className="text-[12px] font-semibold uppercase"
                style={{
                  color: "var(--foreground)",
                  letterSpacing: "0.04em",
                }}
              >
                {section.label}
              </span>
            </div>
          </div>
        ))}

        {/* Alternating row backgrounds */}
        {rows.map((row) => (
          <div
            key={`bg-${row.project.project_number}`}
            className="absolute"
            style={{
              top: MONTH_HEADER + row.y,
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
              backgroundColor:
                row.indexInGroup % 2 === 1
                  ? "var(--surface)"
                  : "var(--card-bg)",
              minWidth: LEFT_COL + timelineWidth + 60,
            }}
          />
        ))}

        {/* Project rows */}
        {rows.map((row) => {
          const p = row.project;

          if (!p.start_date || !p.estimated_end_date) {
            return (
              <div
                key={p.project_number}
                className="absolute flex items-center px-4"
                style={{
                  top: MONTH_HEADER + row.y,
                  left: 0,
                  height: ROW_HEIGHT,
                  width: LEFT_COL + timelineWidth,
                }}
              >
                <span
                  className="text-[12px] font-medium"
                  style={{
                    width: LEFT_COL - 16,
                    color: "var(--foreground)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  #{p.project_number} {p.name}
                </span>
                <span
                  className="ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor:
                      STATUS_COLORS_SOFT[p.status] || "#ddd",
                    color: "#1a1a2e",
                  }}
                >
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
            );
          }

          const x = dateToX(p.start_date);
          const width = Math.max(
            60,
            dateToX(p.estimated_end_date) - x
          );
          const isFerdig = p.status === "ferdig";
          const isHovered = hoveredProject === p.project_number;
          const barStyle = getBarStyle(p, today);

          return (
            <div
              key={p.project_number}
              className="absolute flex items-center"
              style={{
                top: MONTH_HEADER + row.y,
                left: 0,
                height: ROW_HEIGHT,
              }}
            >
              <div
                className="truncate pl-4 pr-3 text-[12px] font-medium"
                style={{
                  width: LEFT_COL,
                  color: isFerdig
                    ? "var(--muted-light)"
                    : "var(--foreground)",
                  textDecoration: isFerdig ? "line-through" : "none",
                }}
              >
                <span style={{ color: "var(--muted-light)" }}>
                  #{p.project_number}
                </span>{" "}
                {p.name}
              </div>

              <div
                className={`absolute flex items-center gap-1.5 rounded-lg px-3 cursor-pointer transition-all duration-150 overflow-hidden whitespace-nowrap ${
                  barStyle.useHatching ? "bar-completed" : ""
                }`}
                style={{
                  left: LEFT_COL + x,
                  width,
                  height: BAR_HEIGHT,
                  top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                  backgroundColor: barStyle.bg,
                  border: isHovered
                    ? "2px solid rgba(0,0,0,0.3)"
                    : barStyle.border,
                  color: barStyle.textColor,
                  boxShadow: isHovered
                    ? "0 2px 8px rgba(0,0,0,0.15)"
                    : "0 1px 2px rgba(0,0,0,0.05)",
                }}
                onMouseEnter={(e) =>
                  handleBarEnter(p.project_number, e)
                }
                onMouseMove={handleBarMouseMove}
                onMouseLeave={handleBarLeave}
              >
                <span
                  className="text-[11px] font-medium"
                  style={{ opacity: 0.7 }}
                >
                  #{p.project_number}
                </span>
                <span className="text-[12px] font-medium truncate">
                  {p.name}
                </span>
                {/* Show status label inside white/dashed bars */}
                {barStyle.isDashed && (
                  <span
                    className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                    style={{
                      backgroundColor:
                        STATUS_COLORS_SOFT[p.status] || "#eee",
                      color: "#555",
                    }}
                  >
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Dependency arrows */}
        <svg
          className="absolute pointer-events-none"
          style={{
            left: LEFT_COL,
            top: MONTH_HEADER,
            width: timelineWidth,
            height: totalHeight,
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L8,3 L0,6 Z" fill="#9ca3af" />
            </marker>
          </defs>
          {depArrows.map((arrow, i) => {
            const midX = (arrow.from.x + arrow.to.x) / 2;
            return (
              <path
                key={i}
                d={`M ${arrow.from.x} ${arrow.from.y} C ${midX} ${arrow.from.y}, ${midX} ${arrow.to.y}, ${arrow.to.x} ${arrow.to.y}`}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </svg>

        {/* Hover popup */}
        {hoveredData && (
          <HoverPopup
            project={hoveredData}
            x={popupPos.x}
            y={popupPos.y}
            projects={projects}
            onMouseEnter={handlePopupEnter}
            onMouseLeave={handlePopupLeave}
          />
        )}
      </div>
    </div>
  );
}

// --- Hover popup with stage workflow ---

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

  const dep = p.dependency
    ? projects.find((pr) => pr.project_number === p.dependency)
    : null;
  const duration =
    p.start_date && p.estimated_end_date
      ? daysBetween(p.start_date, p.estimated_end_date)
      : null;

  const isFerdig = p.status === "ferdig";
  const allChecklistsPassed =
    !!p.checklists &&
    p.checklists.length > 0 &&
    p.checklists.every((c) => c.done === c.total);

  const showWarning =
    isFerdig &&
    p.checklists &&
    p.checklists.length > 0 &&
    !allChecklistsPassed;

  // Use the active stage's color for the stage indicator
  const stageStatusColor =
    STATUS_COLORS_SOFT[p.status] || "#9ca3af";

  const stages: StageKey[] = [1, 2, 3];

  return (
    <div
      className="popup-enter absolute z-50 rounded-xl bg-[var(--card-bg)]"
      style={{
        left: x,
        top: y,
        width: 400,
        border: "1px solid var(--card-border)",
        boxShadow:
          "0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.08)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Top section */}
      <div className="p-5 pb-0">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p
              className="text-[11px] font-medium"
              style={{ color: "var(--muted-light)" }}
            >
              #{p.project_number}
            </p>
            <p className="mt-0.5 text-[15px] font-bold text-gray-900 dark:text-gray-100">
              {p.name}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{
              backgroundColor:
                STATUS_COLORS_SOFT[p.status] || "#ddd",
              color: "#1a1a2e",
            }}
          >
            {STATUS_LABELS[p.status] || p.status}
          </span>
        </div>

        {p.assigned && (
          <div
            className="mb-3 flex items-center gap-2 text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor:
                  EMPLOYEE_COLORS[p.assigned] || "#888",
              }}
            />
            <span className="font-medium">{p.assigned}</span>
          </div>
        )}

        {dep && (
          <p
            className="mb-3 text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Avhenger av{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              #{dep.project_number} {dep.name}
            </span>
            {dep.status !== "ferdig" && (
              <span className="ml-1 font-semibold text-amber-600">
                (ikke ferdig)
              </span>
            )}
          </p>
        )}

        <div
          className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]"
          style={{ color: "var(--foreground)" }}
        >
          {p.start_date && (
            <div>
              <span style={{ color: "var(--muted-light)" }}>
                Start:{" "}
              </span>
              {formatDate(p.start_date)}
            </div>
          )}
          {p.estimated_end_date && (
            <div>
              <span style={{ color: "var(--muted-light)" }}>
                Slutt:{" "}
              </span>
              {formatDate(p.estimated_end_date)}
            </div>
          )}
          {p.agreed_price != null && (
            <div>
              <span style={{ color: "var(--muted-light)" }}>
                Pris:{" "}
              </span>
              {formatPrice(p.agreed_price)}
            </div>
          )}
          {duration != null && (
            <div>
              <span style={{ color: "var(--muted-light)" }}>
                Varighet:{" "}
              </span>
              {duration} dager
            </div>
          )}
        </div>
      </div>

      {/* Stage workflow */}
      <div
        className="px-5 pt-4 pb-2"
        style={{ borderTop: "1px solid var(--divider)" }}
      >
        {/* 3 stage indicators */}
        <div className="flex items-center justify-between mb-4">
          {stages.map((s, i) => {
            const state = getStageState(
              s,
              activeStage,
              allChecklistsPassed,
              isFerdig
            );
            const isViewing = viewingStage === s;

            let circleBg: string;
            let circleBorder: string;
            let circleText: string;

            if (state === "completed") {
              circleBg = "#22c55e";
              circleBorder = "#22c55e";
              circleText = "#fff";
            } else if (state === "active") {
              circleBg = stageStatusColor;
              circleBorder = stageStatusColor;
              circleText = "#1a1a2e";
            } else {
              circleBg = "transparent";
              circleBorder = "#d1d5db";
              circleText = "#9ca3af";
            }

            return (
              <div
                key={s}
                className="flex items-center"
                style={{ flex: 1 }}
              >
                <button
                  className="flex flex-col items-center gap-1 flex-1 cursor-pointer group"
                  onClick={() => setViewingStage(s)}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-[12px] font-bold transition-all duration-150"
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: circleBg,
                      border: `2px solid ${circleBorder}`,
                      color: circleText,
                      boxShadow: isViewing
                        ? "0 0 0 3px rgba(55,138,221,0.25)"
                        : "none",
                    }}
                  >
                    {state === "completed" ? "\u2713" : s}
                  </div>
                  <span
                    className="text-[11px] font-medium transition-colors"
                    style={{
                      color: isViewing
                        ? "var(--foreground)"
                        : "var(--muted-light)",
                    }}
                  >
                    {STAGE_LABELS[s]}
                  </span>
                </button>

                {i < 2 && (
                  <span
                    className="text-[14px] font-light mx-0.5 -mt-4"
                    style={{ color: "var(--muted-light)" }}
                  >
                    &rarr;
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Items for the viewed stage */}
        <div className="mb-3">
          <p
            className="text-[10px] font-semibold uppercase mb-2"
            style={{
              color: "var(--muted-light)",
              letterSpacing: "0.05em",
            }}
          >
            {viewingStage}. {STAGE_LABELS[viewingStage]}
          </p>

          <div className="space-y-0">
            {STAGE_ITEMS[viewingStage].map((item, idx) => {
              const done = isItemComplete(
                viewingStage,
                idx,
                activeStage,
                p.checklists,
                isFerdig,
                allChecklistsPassed
              );
              const linked = getChecklistForItem(
                viewingStage,
                idx,
                p.checklists
              );

              return (
                <div
                  key={item}
                  className="flex items-center gap-2.5"
                  style={{ height: 24 }}
                >
                  {done ? (
                    <span
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: "#22c55e" }}
                    >
                      &#x2713;
                    </span>
                  ) : (
                    <span
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{
                        border: "1.5px solid #d1d5db",
                      }}
                    />
                  )}
                  <span
                    className="text-[13px]"
                    style={{
                      color: done
                        ? "var(--muted-light)"
                        : "var(--foreground)",
                      textDecoration: done
                        ? "line-through"
                        : "none",
                    }}
                  >
                    {item}
                  </span>
                  {linked && (
                    <span
                      className="ml-auto text-[10px] font-medium"
                      style={{ color: "var(--muted-light)" }}
                    >
                      {linked.done}/{linked.total}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Warning banner */}
      {showWarning && (
        <div className="mx-5 mb-4 rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Sjekklister m&aring; godkjennes f&oslash;r prosjektet kan
          lukkes
        </div>
      )}

      <div style={{ height: 4 }} />
    </div>
  );
}
