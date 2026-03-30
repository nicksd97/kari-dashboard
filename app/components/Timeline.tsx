"use client";

import { useState, useRef, useCallback } from "react";
import type { Project, Checklist } from "@/lib/types";
import { STATUS_COLORS, STATUS_COLORS_SOFT, STATUS_LABELS, EMPLOYEE_COLORS } from "@/lib/types";

interface TimelineProps {
  projects: Project[];
}

const EMPLOYEES = ["Roar", "Andrii", "Marci"];
const LEFT_COL = 200;
const ROW_HEIGHT = 52;
const BAR_HEIGHT = 32;
const HEADER_HEIGHT = 40;
const MONTH_HEADER = 44;

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

// Determine if a status color is dark enough to need white text
function textColorForStatus(status: string): string {
  const dark = ["pagaende", "materialer", "innkommende", "ferdig", "fakturering"];
  return dark.includes(status) ? "#1a1a2e" : "#1a1a2e";
}

export default function Timeline({ projects }: TimelineProps) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Group projects by employee
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

  // Generate month labels
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

  // Calculate rows - track group boundaries for alternating bg
  let currentY = 0;
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
  }[] = [];

  for (const emp of [...EMPLOYEES, "Ikke tildelt"]) {
    const group = grouped[emp];
    if (group.length === 0 && emp !== "Ikke tildelt") continue;

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
    });
  }

  if (undated.length > 0) {
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
    });
  }

  const totalHeight = Math.max(500, currentY + 20);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    setPopupPos({
      x: e.clientX - rect.left + scrollLeft + 20,
      y: e.clientY - rect.top + scrollTop - 12,
    });
  }, []);

  const hoveredData = hoveredProject
    ? projects.find((p) => p.project_number === hoveredProject)
    : null;

  // Dependency arrows (curved)
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
      onMouseMove={handleMouseMove}
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
              i < months.length - 1
                ? months[i + 1].x
                : timelineWidth;
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

        {/* Vertical gridlines for months */}
        {months.map((m) => (
          <div
            key={`grid-${m.label}`}
            className="absolute"
            style={{
              left: LEFT_COL + m.x,
              top: MONTH_HEADER,
              bottom: 0,
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

        {/* Group sections with alternating rows */}
        {groupSections.map((section) => (
          <div key={section.label}>
            {/* Group header */}
            <div
              className="absolute flex items-center gap-2.5 px-4"
              style={{
                top: MONTH_HEADER + section.y,
                left: 0,
                right: 0,
                height: HEADER_HEIGHT,
                backgroundColor: "var(--surface)",
                borderLeft: `3px solid ${section.color}`,
                borderBottom: "1px solid var(--divider)",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
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
                row.indexInGroup % 2 === 1 ? "var(--surface)" : "transparent",
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
                    backgroundColor: STATUS_COLORS_SOFT[p.status] || "#ddd",
                    color: "#1a1a2e",
                  }}
                >
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
            );
          }

          const x = dateToX(p.start_date);
          const width = Math.max(60, dateToX(p.estimated_end_date) - x);
          const isFerdig = p.status === "ferdig";
          const isHovered = hoveredProject === p.project_number;

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
              {/* Left label */}
              <div
                className="truncate pl-4 pr-3 text-[12px] font-medium"
                style={{
                  width: LEFT_COL,
                  color: isFerdig ? "var(--muted-light)" : "var(--foreground)",
                  textDecoration: isFerdig ? "line-through" : "none",
                }}
              >
                <span style={{ color: "var(--muted-light)" }}>
                  #{p.project_number}
                </span>{" "}
                {p.name}
              </div>

              {/* Bar */}
              <div
                className={`absolute flex items-center gap-1.5 rounded-lg px-3 cursor-pointer transition-all duration-150 overflow-hidden whitespace-nowrap ${
                  isFerdig ? "bar-completed" : ""
                }`}
                style={{
                  left: LEFT_COL + x,
                  width,
                  height: BAR_HEIGHT,
                  top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                  backgroundColor: STATUS_COLORS[p.status] || "#ddd",
                  opacity: isFerdig ? 0.7 : 1,
                  boxShadow: isHovered
                    ? "0 2px 8px rgba(0,0,0,0.15)"
                    : "0 1px 2px rgba(0,0,0,0.05)",
                  border: isHovered
                    ? "2px solid rgba(0,0,0,0.25)"
                    : "2px solid transparent",
                  color: textColorForStatus(p.status),
                }}
                onMouseEnter={() => setHoveredProject(p.project_number)}
                onMouseLeave={() => setHoveredProject(null)}
              >
                <span className="text-[11px] font-medium opacity-60">
                  #{p.project_number}
                </span>
                <span className="text-[12px] font-medium truncate">
                  {p.name}
                </span>
              </div>
            </div>
          );
        })}

        {/* Dependency arrows - curved SVG */}
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
            const cp1x = midX;
            const cp1y = arrow.from.y;
            const cp2x = midX;
            const cp2y = arrow.to.y;
            return (
              <path
                key={i}
                d={`M ${arrow.from.x} ${arrow.from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${arrow.to.x} ${arrow.to.y}`}
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
          />
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
  const dep = p.dependency
    ? projects.find((pr) => pr.project_number === p.dependency)
    : null;
  const duration =
    p.start_date && p.estimated_end_date
      ? daysBetween(p.start_date, p.estimated_end_date)
      : null;

  const allChecklistsDone =
    p.checklists &&
    p.checklists.length > 0 &&
    p.checklists.every((c) => c.done === c.total);
  const showWarning =
    p.status === "ferdig" &&
    p.checklists &&
    p.checklists.length > 0 &&
    !allChecklistsDone;

  return (
    <div
      className="popup-enter absolute z-50 rounded-xl bg-[var(--card-bg)] p-5"
      style={{
        left: x,
        top: y,
        width: 360,
        pointerEvents: "none",
        border: "1px solid var(--card-border)",
        boxShadow:
          "0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
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
            backgroundColor: STATUS_COLORS_SOFT[p.status] || "#ddd",
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
              backgroundColor: EMPLOYEE_COLORS[p.assigned] || "#888",
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
        className="mb-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]"
        style={{ color: "var(--foreground)" }}
      >
        {p.start_date && (
          <div>
            <span style={{ color: "var(--muted-light)" }}>Start: </span>
            {formatDate(p.start_date)}
          </div>
        )}
        {p.estimated_end_date && (
          <div>
            <span style={{ color: "var(--muted-light)" }}>Slutt: </span>
            {formatDate(p.estimated_end_date)}
          </div>
        )}
        {p.agreed_price != null && (
          <div>
            <span style={{ color: "var(--muted-light)" }}>Pris: </span>
            {formatPrice(p.agreed_price)}
          </div>
        )}
        {duration != null && (
          <div>
            <span style={{ color: "var(--muted-light)" }}>Varighet: </span>
            {duration} dager
          </div>
        )}
      </div>

      {p.checklists && p.checklists.length > 0 && (
        <div
          className="mt-3 space-y-2.5 pt-3"
          style={{ borderTop: "1px solid var(--divider)" }}
        >
          <p
            className="text-[10px] font-semibold uppercase"
            style={{
              color: "var(--muted-light)",
              letterSpacing: "0.05em",
            }}
          >
            Sjekklister
          </p>
          {p.checklists.map((c) => (
            <ChecklistRow key={c.name} checklist={c} />
          ))}
        </div>
      )}

      {showWarning && (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Sjekklister m&aring; godkjennes f&oslash;r prosjektet kan lukkes
        </div>
      )}
    </div>
  );
}

function ChecklistRow({ checklist }: { checklist: Checklist }) {
  const ratio =
    checklist.total > 0 ? checklist.done / checklist.total : 0;
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
    <div className="flex items-center gap-2.5 text-[12px]">
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ backgroundColor: bg }}
      >
        {icon}
      </span>
      <span className="shrink-0 font-medium text-gray-700 dark:text-gray-300">
        {checklist.name}
      </span>
      <div className="flex-1 h-1.5 min-w-[48px] overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${ratio * 100}%`,
            backgroundColor: bg,
            height: 6,
          }}
        />
      </div>
      <span
        className="shrink-0 text-[11px] font-medium"
        style={{ color: "var(--muted)" }}
      >
        {checklist.done}/{checklist.total}
      </span>
    </div>
  );
}
