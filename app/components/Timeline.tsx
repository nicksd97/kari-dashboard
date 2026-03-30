"use client";

import { useState, useRef, useCallback } from "react";
import type { Project, Checklist } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS, EMPLOYEE_COLORS } from "@/lib/types";

interface TimelineProps {
  projects: Project[];
}

const EMPLOYEES = ["Roar", "Andrii", "Marci"];
const LEFT_COL = 180;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 32;

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
  return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(n);
}

export default function Timeline({ projects }: TimelineProps) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute timeline range
  const datedProjects = projects.filter((p) => p.start_date && p.estimated_end_date);
  const today = new Date().toISOString().split("T")[0];

  const allDates = datedProjects.flatMap((p) => [p.start_date!, p.estimated_end_date!]);
  allDates.push(today);
  const minDate = allDates.sort()[0];
  const maxDate = allDates.sort().reverse()[0];

  // Extend range to start of min month and end of max month + 1
  const rangeStart = new Date(minDate);
  rangeStart.setDate(1);
  const rangeEnd = new Date(maxDate);
  rangeEnd.setMonth(rangeEnd.getMonth() + 1);
  rangeEnd.setDate(rangeEnd.getDate() + 15);

  const totalDays = daysBetween(
    rangeStart.toISOString().split("T")[0],
    rangeEnd.toISOString().split("T")[0]
  );
  const dayWidth = Math.max(8, 900 / totalDays);
  const timelineWidth = totalDays * dayWidth;

  function dateToX(date: string) {
    return daysBetween(rangeStart.toISOString().split("T")[0], date) * dayWidth;
  }

  // Group projects by employee
  const grouped: Record<string, Project[]> = {};
  for (const emp of EMPLOYEES) grouped[emp] = [];
  grouped["Ikke tildelt"] = [];

  for (const p of datedProjects) {
    const key = p.assigned && EMPLOYEES.includes(p.assigned) ? p.assigned : "Ikke tildelt";
    grouped[key].push(p);
  }

  // Also add undated projects to "Ikke tildelt"
  const undated = projects.filter((p) => !p.start_date || !p.estimated_end_date);

  // Generate month labels
  const months: { label: string; x: number }[] = [];
  const cursor = new Date(rangeStart);
  while (cursor < rangeEnd) {
    const label = cursor.toLocaleDateString("nb-NO", { month: "short", year: "numeric" });
    const x = dateToX(cursor.toISOString().split("T")[0]);
    months.push({ label, x });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Today line
  const todayX = dateToX(today);

  // Build dependency lookup
  const projectByNumber = new Map(projects.map((p) => [p.project_number, p]));

  // Calculate rows
  let currentY = 0;
  const rows: { project: Project; y: number; group: string }[] = [];

  for (const emp of [...EMPLOYEES, "Ikke tildelt"]) {
    const group = grouped[emp];
    if (group.length === 0 && emp !== "Ikke tildelt") continue;

    currentY += HEADER_HEIGHT;
    for (const p of group) {
      rows.push({ project: p, y: currentY, group: emp });
      currentY += ROW_HEIGHT;
    }
  }

  // Add undated projects section
  if (undated.length > 0) {
    currentY += HEADER_HEIGHT;
    for (const p of undated) {
      rows.push({ project: p, y: currentY, group: "Uten dato" });
      currentY += ROW_HEIGHT;
    }
  }

  const totalHeight = currentY + 20;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPopupPos({
      x: e.clientX - rect.left + 16,
      y: e.clientY - rect.top - 8,
    });
  }, []);

  const hoveredData = hoveredProject
    ? projects.find((p) => p.project_number === hoveredProject)
    : null;

  // Dependency lines
  const depLines: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
  for (const row of rows) {
    if (row.project.dependency) {
      const dep = projectByNumber.get(row.project.dependency);
      if (dep?.estimated_end_date && row.project.start_date) {
        const depRow = rows.find((r) => r.project.project_number === dep.project_number);
        if (depRow) {
          depLines.push({
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

  // Render group headers
  let headerY = 0;
  const headers: { label: string; y: number; color: string }[] = [];
  for (const emp of [...EMPLOYEES, "Ikke tildelt"]) {
    const group = grouped[emp];
    if (group.length === 0 && emp !== "Ikke tildelt") continue;
    headers.push({
      label: emp,
      y: headerY,
      color: EMPLOYEE_COLORS[emp] || "#888780",
    });
    headerY += HEADER_HEIGHT + group.length * ROW_HEIGHT;
  }
  if (undated.length > 0) {
    headers.push({ label: "Uten dato", y: headerY, color: "#888780" });
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      onMouseMove={handleMouseMove}
    >
      <div
        className="relative"
        style={{ minWidth: LEFT_COL + timelineWidth + 40, height: totalHeight + 40 }}
      >
        {/* Month labels */}
        <div
          className="sticky top-0 z-10 flex border-b border-gray-100 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90"
          style={{ paddingLeft: LEFT_COL }}
        >
          {months.map((m) => (
            <div
              key={m.label}
              className="text-[11px] font-medium text-gray-400 dark:text-gray-500 py-1.5"
              style={{
                position: "absolute",
                left: LEFT_COL + m.x,
              }}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Today line */}
        <div
          className="absolute z-20 w-px bg-red-500"
          style={{
            left: LEFT_COL + todayX,
            top: 0,
            height: totalHeight + 40,
          }}
        >
          <span className="absolute -top-0 -translate-x-1/2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            I dag
          </span>
        </div>

        {/* Group headers + rows */}
        <div style={{ paddingTop: 32 }}>
          {headers.map((h) => (
            <div
              key={h.label}
              className="flex items-center gap-2 px-3 py-1"
              style={{ height: HEADER_HEIGHT, marginTop: h.y > 0 ? 0 : undefined }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: h.color }}
              />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {h.label}
              </span>
            </div>
          ))}
        </div>

        {/* Project bars */}
        {rows.map((row) => {
          const p = row.project;
          if (!p.start_date || !p.estimated_end_date) {
            // Undated project - show as text only
            return (
              <div
                key={p.project_number}
                className="absolute flex items-center px-3 text-xs text-gray-500"
                style={{
                  top: 32 + row.y,
                  left: 0,
                  height: ROW_HEIGHT,
                  width: LEFT_COL + timelineWidth,
                }}
              >
                <span className="w-[180px] truncate pr-2 font-medium text-gray-700 dark:text-gray-300">
                  #{p.project_number} {p.name}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: STATUS_COLORS[p.status] || "#ddd",
                    color: "#333",
                  }}
                >
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
            );
          }

          const x = dateToX(p.start_date);
          const width = Math.max(
            30,
            dateToX(p.estimated_end_date) - x
          );
          const isFerdig = p.status === "ferdig";
          const isHovered = hoveredProject === p.project_number;

          return (
            <div
              key={p.project_number}
              className="absolute flex items-center"
              style={{ top: 32 + row.y, left: 0, height: ROW_HEIGHT }}
            >
              {/* Left label */}
              <div className="w-[180px] truncate pr-2 pl-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                #{p.project_number} {p.name}
              </div>

              {/* Bar */}
              <div
                className="absolute rounded-md cursor-pointer transition-all text-[11px] font-medium flex items-center px-2 overflow-hidden whitespace-nowrap"
                style={{
                  left: LEFT_COL + x,
                  width,
                  height: 28,
                  top: (ROW_HEIGHT - 28) / 2,
                  backgroundColor: STATUS_COLORS[p.status] || "#ddd",
                  opacity: isFerdig ? 0.6 : 1,
                  border: isHovered ? "2px solid rgba(0,0,0,0.3)" : "2px solid transparent",
                  color: "#1a1a2e",
                }}
                onMouseEnter={() => setHoveredProject(p.project_number)}
                onMouseLeave={() => setHoveredProject(null)}
              >
                {p.name}
              </div>
            </div>
          );
        })}

        {/* Dependency lines */}
        <svg
          className="absolute top-8 pointer-events-none"
          style={{
            left: LEFT_COL,
            width: timelineWidth,
            height: totalHeight,
          }}
        >
          {depLines.map((line, i) => (
            <line
              key={i}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke="#888"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              markerEnd="url(#arrow)"
            />
          ))}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#888" />
            </marker>
          </defs>
        </svg>

        {/* Hover popup */}
        {hoveredData && (
          <HoverPopup project={hoveredData} x={popupPos.x} y={popupPos.y} projects={projects} />
        )}
      </div>
    </div>
  );
}

function HoverPopup({
  project: p,
  x,
  y,
  projects,
}: {
  project: Project;
  x: number;
  y: number;
  projects: Project[];
}) {
  const dep = p.dependency ? projects.find((pr) => pr.project_number === p.dependency) : null;
  const duration =
    p.start_date && p.estimated_end_date
      ? daysBetween(p.start_date, p.estimated_end_date)
      : null;

  const allChecklistsDone =
    p.checklists && p.checklists.length > 0 && p.checklists.every((c) => c.done === c.total);
  const showWarning = p.status === "ferdig" && p.checklists && p.checklists.length > 0 && !allChecklistsDone;

  return (
    <div
      className="absolute z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
      style={{ left: x, top: y, pointerEvents: "none" }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-gray-400">#{p.project_number}</p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{p.name}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor: STATUS_COLORS[p.status] || "#ddd",
            color: "#1a1a2e",
          }}
        >
          {STATUS_LABELS[p.status] || p.status}
        </span>
      </div>

      {p.assigned && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: EMPLOYEE_COLORS[p.assigned] || "#888" }}
          />
          {p.assigned}
        </div>
      )}

      {dep && (
        <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
          Avhenger av #{dep.project_number} {dep.name}
          {dep.status !== "ferdig" && (
            <span className="ml-1 text-amber-600 font-medium">(ikke ferdig)</span>
          )}
        </p>
      )}

      <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
        {p.start_date && (
          <div>
            <span className="text-gray-400">Start:</span> {formatDate(p.start_date)}
          </div>
        )}
        {p.estimated_end_date && (
          <div>
            <span className="text-gray-400">Slutt:</span> {formatDate(p.estimated_end_date)}
          </div>
        )}
        {p.agreed_price && (
          <div>
            <span className="text-gray-400">Pris:</span> {formatPrice(p.agreed_price)}
          </div>
        )}
        {duration && (
          <div>
            <span className="text-gray-400">Varighet:</span> {duration} dager
          </div>
        )}
      </div>

      {p.checklists && p.checklists.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2 dark:border-gray-700">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Sjekklister</p>
          {p.checklists.map((c) => (
            <ChecklistIcon key={c.name} checklist={c} />
          ))}
        </div>
      )}

      {showWarning && (
        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Sjekklister må godkjennes før prosjektet kan lukkes
        </div>
      )}
    </div>
  );
}

function ChecklistIcon({ checklist }: { checklist: Checklist }) {
  const ratio = checklist.total > 0 ? checklist.done / checklist.total : 0;
  let bg: string, icon: string;
  if (ratio === 1) {
    bg = "#22c55e";
    icon = "\u2713";
  } else if (ratio > 0) {
    bg = "#f59e0b";
    icon = "!";
  } else {
    bg = "#ef4444";
    icon = "!";
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
        style={{ backgroundColor: bg }}
      >
        {icon}
      </span>
      <span className="text-gray-700 dark:text-gray-300 shrink-0">{checklist.name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 min-w-[40px]">
        <div
          className="h-full rounded-full"
          style={{ width: `${ratio * 100}%`, backgroundColor: bg }}
        />
      </div>
      <span className="text-gray-500 dark:text-gray-400 shrink-0">
        {checklist.done}/{checklist.total}
      </span>
    </div>
  );
}
