"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Checkin, ChecklistEntry, EmployeeScore } from "@/lib/types";
import { EMPLOYEE_COLORS } from "@/lib/types";

interface SidebarProps {
  checkins: Checkin[];
  checklistEntries: ChecklistEntry[];
  scores?: EmployeeScore[];
}

const EMPLOYEES_ORDER = ["Roar", "Andrii", "Marci"];

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "i dag";
  if (diffDays === 1) return "1 dag siden";
  return `${diffDays} dager siden`;
}

function weekdaysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  if (isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end <= today) return 0;
  let count = 0;
  const cur = new Date(today);
  cur.setDate(cur.getDate() + 1);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// --- Tooltip shown via portal ---

function EmployeeTooltip({
  checkin,
  anchorRect,
  onMouseEnter,
  onMouseLeave,
}: {
  checkin: Checkin;
  anchorRect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const TOOLTIP_W = 240;
  // Position to the right of the sidebar, aligned with the row
  let left = anchorRect.right + 8;
  let top = anchorRect.top;
  // If it would go off-screen right, show below instead
  if (left + TOOLTIP_W > window.innerWidth - 12) {
    left = anchorRect.left;
    top = anchorRect.bottom + 4;
  }
  // Keep within vertical bounds
  if (top + 160 > window.innerHeight) {
    top = window.innerHeight - 170;
  }

  const daysLeft = weekdaysUntil(checkin.estimatedCompletion || "");

  return createPortal(
    <div
      className="popup-enter"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        left,
        top,
        width: TOOLTIP_W,
        zIndex: 9999,
        backgroundColor: "var(--card-bg)",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
        border: "1px solid var(--card-border)",
        padding: "12px 14px",
      }}
    >
      {checkin.projectNumber && (
        <div className="mb-2">
          <p
            className="text-[11px] font-medium"
            style={{ color: "var(--muted-light)" }}
          >
            Prosjekt
          </p>
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            #{checkin.projectNumber}{" "}
            {checkin.projectName || ""}
          </p>
        </div>
      )}

      {checkin.summary && (
        <div className="mb-2">
          <p
            className="text-[11px] font-medium"
            style={{ color: "var(--muted-light)" }}
          >
            Planlagt i dag
          </p>
          <p
            className="text-[12px]"
            style={{ color: "var(--foreground)" }}
          >
            {checkin.summary}
          </p>
        </div>
      )}

      {checkin.status === "checked_in" && (
        <div className="mb-2">
          <p
            className="text-[11px] font-medium"
            style={{ color: "var(--muted-light)" }}
          >
            Gjenstår
          </p>
          {daysLeft != null ? (
            <p
              className="text-[12px] font-medium"
              style={{ color: daysLeft <= 3 ? "#E5A940" : "var(--foreground)" }}
            >
              {daysLeft === 0 ? "Ferdig i dag" : `${daysLeft} arbeidsdager`}
            </p>
          ) : (
            <p
              className="text-[12px]"
              style={{ color: "var(--muted-light)" }}
            >
              Ikke estimert
            </p>
          )}
        </div>
      )}

      {checkin.rawResponse && (
        <div>
          <p
            className="text-[11px] font-medium"
            style={{ color: "var(--muted-light)" }}
          >
            Siste innsjekking
          </p>
          <p
            className="text-[12px] italic"
            style={{ color: "var(--muted)" }}
          >
            &ldquo;
            {checkin.rawResponse.length > 100
              ? checkin.rawResponse.slice(0, 100) + "…"
              : checkin.rawResponse}
            &rdquo;
          </p>
        </div>
      )}

      {!checkin.projectNumber && !checkin.summary && !checkin.rawResponse && (
        <p className="text-[12px]" style={{ color: "var(--muted-light)" }}>
          Venter på innsjekking
        </p>
      )}
    </div>,
    document.body
  );
}

export default function Sidebar({ checkins: rawCheckins, checklistEntries: rawEntries, scores: rawScores }: SidebarProps) {
  console.log("[Sidebar] checkins received:", rawCheckins);
  const checkins = rawCheckins || [];
  const checklistEntries = rawEntries || [];
  const pending = checklistEntries.filter((c) => c.status !== "completed");
  const completed = checklistEntries.filter((c) => c.status === "completed");
  const checkedInCount = checkins.filter((c) => c.status === "checked_in").length;

  const [hoveredEmployee, setHoveredEmployee] = useState<string | null>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleMouseEnter = useCallback((name: string, el: HTMLElement) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setHoveredEmployee(name);
      setTooltipRect(el.getBoundingClientRect());
    }, 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setHoveredEmployee(null);
      setTooltipRect(null);
    }, 100);
  }, []);

  const handleTooltipEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  }, []);

  const handleTooltipLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => {
      setHoveredEmployee(null);
      setTooltipRect(null);
    }, 100);
  }, []);

  const hoveredCheckin = hoveredEmployee
    ? checkins.find((c) => c.employee === hoveredEmployee) || null
    : null;

  return (
    <aside
      className="hidden lg:flex shrink-0 flex-col sticky top-0 h-screen"
      style={{
        width: 280,
        borderRight: "1px solid var(--divider)",
        backgroundColor: "var(--surface)",
      }}
    >
      {/* Team section */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-[11px] font-semibold uppercase"
            style={{ color: "var(--muted-light)", letterSpacing: "0.05em" }}
          >
            Team
          </h2>
          <span
            className="text-[11px] font-medium"
            style={{ color: "var(--muted-light)" }}
          >
            {checkedInCount}/{EMPLOYEES_ORDER.length}
          </span>
        </div>

        <div>
          {EMPLOYEES_ORDER.map((name) => {
            const checkin = checkins.find((c) => c.employee === name);
            const color = EMPLOYEE_COLORS[name] || "#999";
            const isCheckedIn = checkin?.status === "checked_in";

            return (
              <div
                key={name}
                className="flex items-center gap-2.5 rounded-lg px-2 cursor-default"
                style={{ height: 36 }}
                onMouseEnter={(e) => handleMouseEnter(name, e.currentTarget)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Avatar */}
                <div
                  className="flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ width: 22, height: 22, backgroundColor: color }}
                >
                  {name[0]}
                </div>

                {/* Name + dot */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {name}
                  </span>
                  <span
                    className="shrink-0 rounded-full"
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: isCheckedIn ? "#22c55e" : "#d1d5db",
                    }}
                  />
                </div>

                {/* Time */}
                {checkin?.time && (
                  <span
                    className="shrink-0 text-[11px]"
                    style={{ color: "var(--muted-light)" }}
                  >
                    kl. {checkin.time}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip via portal */}
      {mounted && hoveredEmployee && hoveredCheckin && tooltipRect && (
        <EmployeeTooltip
          checkin={hoveredCheckin}
          anchorRect={tooltipRect}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        />
      )}

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "var(--divider)" }} />

      {/* Checklists section */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-[11px] font-semibold uppercase"
            style={{ color: "var(--muted-light)", letterSpacing: "0.05em" }}
          >
            Sjekklister
          </h2>
          {pending.length > 0 && (
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--muted-light)" }}
            >
              {pending.length} ventende
            </span>
          )}
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <div className="mb-4">
            <p
              className="text-[10px] font-semibold uppercase mb-2"
              style={{ color: "var(--muted-light)", letterSpacing: "0.04em" }}
            >
              Ventende
            </p>
            {pending.map((item, i) => {
              const dotColor = item.status === "overdue" ? "#E06050" : "#E5A940";
              return (
                <div
                  key={`p-${i}`}
                  className="flex items-start gap-2.5"
                  style={{ height: 36 }}
                >
                  <span
                    className="shrink-0 rounded-full mt-1.5"
                    style={{ width: 6, height: 6, backgroundColor: dotColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] font-medium truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.template}
                    </p>
                    <p
                      className="text-[11px] truncate"
                      style={{ color: "var(--muted-light)" }}
                    >
                      #{item.project_number} {item.project_name}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[10px] mt-0.5"
                    style={{ color: "var(--muted-light)" }}
                  >
                    {timeAgo(item.sent_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <p
              className="text-[10px] font-semibold uppercase mb-2"
              style={{ color: "var(--muted-light)", letterSpacing: "0.04em" }}
            >
              Fullf&oslash;rt
            </p>
            {completed.map((item, i) => (
              <div
                key={`c-${i}`}
                className="flex items-start gap-2.5"
                style={{ height: 36 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 mt-1">
                  <circle cx="7" cy="7" r="6" fill="#22c55e" />
                  <path d="M4,7 L6,9.5 L10,4.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {item.template}
                  </p>
                  <p
                    className="text-[11px] truncate"
                    style={{ color: "var(--muted-light)" }}
                  >
                    #{item.project_number} {item.project_name}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="text-[11px] font-medium"
                    style={{
                      color:
                        item.done != null && item.total != null && item.done === item.total
                          ? "#22c55e"
                          : "var(--foreground)",
                    }}
                  >
                    {item.done != null && item.total != null
                      ? `${item.done}/${item.total}${item.done === item.total ? " \u2713" : ""}`
                      : ""}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--muted-light)" }}>
                    {item.completed_at ? timeAgo(item.completed_at) : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard section */}
        <Leaderboard scores={rawScores || []} />
      </div>
    </aside>
  );
}

// --- Leaderboard ---

function Leaderboard({ scores }: { scores: EmployeeScore[] }) {
  const sorted = [...scores].sort((a, b) => b.total - a.total);
  const monthName = new Date().toLocaleDateString("nb-NO", { month: "long" });
  const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const year = new Date().getFullYear();

  if (sorted.length === 0) return null;

  const maxScore = sorted[0].total;

  return (
    <>
      <div style={{ height: 1, backgroundColor: "var(--divider)", marginTop: 8 }} />
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-[11px] font-semibold uppercase"
            style={{ color: "var(--muted-light)", letterSpacing: "0.05em" }}
          >
            M&aring;nedens beste
          </h2>
          <span className="text-[11px] font-medium" style={{ color: "var(--muted-light)" }}>
            {capMonth} {year}
          </span>
        </div>

        <div className="space-y-2">
          {sorted.map((s, i) => {
            const isFirst = i === 0 && s.total > 0;
            const color = EMPLOYEE_COLORS[s.employee] || "#999";

            return (
              <div
                key={s.employee}
                className="relative flex flex-col items-center rounded-lg transition-all"
                style={{
                  padding: isFirst ? "16px 14px 14px" : "12px 14px 10px",
                  border: isFirst ? "1px solid #E5A940" : "1px solid var(--card-border)",
                  backgroundColor: isFirst ? "rgba(229, 169, 64, 0.04)" : "var(--card-bg)",
                }}
              >
                {/* Confetti dots for #1 */}
                {isFirst && (
                  <>
                    <div className="absolute" style={{ top: 6, right: 14, width: 4, height: 4, borderRadius: 2, backgroundColor: "#E5A940", opacity: 0.5 }} />
                    <div className="absolute" style={{ top: 14, right: 26, width: 3, height: 3, borderRadius: 2, backgroundColor: "#F5D590", opacity: 0.6 }} />
                    <div className="absolute" style={{ top: 8, left: 18, width: 3, height: 3, borderRadius: 2, backgroundColor: "#E5A940", opacity: 0.35 }} />
                    <div className="absolute" style={{ top: 16, left: 30, width: 3, height: 3, borderRadius: 2, backgroundColor: "#F5D590", opacity: 0.5 }} />
                    <div className="absolute" style={{ bottom: 10, right: 20, width: 4, height: 4, borderRadius: 2, backgroundColor: "#E5A940", opacity: 0.3 }} />
                    <div className="absolute" style={{ bottom: 8, left: 16, width: 3, height: 3, borderRadius: 2, backgroundColor: "#F5D590", opacity: 0.4 }} />
                  </>
                )}

                {/* Crown/star above avatar for #1 */}
                {isFirst && (
                  <div className="text-[14px] mb-0.5" style={{ lineHeight: 1 }}>
                    &#x1F451;
                  </div>
                )}

                {/* Avatar with rank badge for #2/#3 */}
                <div className="relative">
                  <div
                    className="flex items-center justify-center rounded-full font-bold text-white"
                    style={{
                      width: isFirst ? 48 : 36,
                      height: isFirst ? 48 : 36,
                      fontSize: isFirst ? 18 : 14,
                      backgroundColor: color,
                      border: isFirst ? "3px solid #E5A940" : "none",
                    }}
                  >
                    {s.employee[0]}
                  </div>
                  {!isFirst && (
                    <div
                      className="absolute flex items-center justify-center rounded-full text-[9px] font-bold"
                      style={{
                        width: 16,
                        height: 16,
                        top: -4,
                        right: -4,
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        color: "var(--muted)",
                      }}
                    >
                      {i + 1}
                    </div>
                  )}
                </div>

                {/* Name */}
                <p
                  className="mt-1.5 text-center font-semibold"
                  style={{ fontSize: isFirst ? 14 : 13, color: "var(--foreground)" }}
                >
                  {s.employee}
                </p>

                {/* Score */}
                <p className="text-center" style={{ marginTop: 1 }}>
                  <span
                    className="font-bold"
                    style={{ fontSize: isFirst ? 16 : 13, color: isFirst ? "#E5A940" : "var(--muted)" }}
                  >
                    {s.total}
                  </span>{" "}
                  <span className="text-[10px]" style={{ color: "var(--muted-light)" }}>
                    poeng
                  </span>
                </p>

                {/* Leader label for #1 */}
                {isFirst && (
                  <p className="mt-0.5 text-[10px] font-semibold" style={{ color: "#CF952F" }}>
                    M&aring;nedens leder
                  </p>
                )}

                {/* Stats breakdown for #1 */}
                {isFirst && (
                  <div className="mt-1.5 flex gap-2 text-[10px]" style={{ color: "var(--muted-light)" }}>
                    <span>{s.checkinCount} innsjekk.</span>
                    {s.missedCheckins > 0 && <span>&middot; {s.missedCheckins} mangler</span>}
                    {s.checklistOnTime > 0 && <span>&middot; {s.checklistOnTime} sjekklister</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
