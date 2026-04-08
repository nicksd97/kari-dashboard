"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Checkin, ChecklistEntry, EmployeeScore } from "@/lib/types";
import { EMPLOYEE_COLORS } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";

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
  let left = anchorRect.right + 8;
  let top = anchorRect.top;
  if (left + TOOLTIP_W > window.innerWidth - 12) {
    left = anchorRect.left;
    top = anchorRect.bottom + 4;
  }
  if (top + 160 > window.innerHeight) {
    top = window.innerHeight - 170;
  }

  const daysLeft = weekdaysUntil(checkin.estimatedCompletion || "");

  return createPortal(
    <div
      className="popup-enter fixed z-[9999] w-[240px] rounded-xl bg-card shadow-lg border border-border p-3"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ left, top }}
    >
      {checkin.projectNumber && (
        <div className="mb-2">
          <p className="text-[11px] font-medium text-muted-foreground/70">Prosjekt</p>
          <p className="text-[13px] font-semibold text-foreground">
            #{checkin.projectNumber} {checkin.projectName || ""}
          </p>
        </div>
      )}

      {checkin.summary && (
        <div className="mb-2">
          <p className="text-[11px] font-medium text-muted-foreground/70">Planlagt i dag</p>
          <p className="text-[12px] text-foreground">{checkin.summary}</p>
        </div>
      )}

      {checkin.status === "checked_in" && (
        <div className="mb-2">
          <p className="text-[11px] font-medium text-muted-foreground/70">Gjenstår</p>
          {daysLeft != null ? (
            <p
              className="text-[12px] font-medium"
              style={{ color: daysLeft <= 3 ? "#E5A940" : "var(--foreground)" }}
            >
              {daysLeft === 0 ? "Ferdig i dag" : `${daysLeft} arbeidsdager`}
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground/70">Ikke estimert</p>
          )}
        </div>
      )}

      {checkin.rawResponse && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground/70">Siste innsjekking</p>
          <p className="text-[12px] italic text-muted-foreground">
            &ldquo;
            {checkin.rawResponse.length > 100
              ? checkin.rawResponse.slice(0, 100) + "…"
              : checkin.rawResponse}
            &rdquo;
          </p>
        </div>
      )}

      {!checkin.projectNumber && !checkin.summary && !checkin.rawResponse && (
        <p className="text-[12px] text-muted-foreground/70">Venter på innsjekking</p>
      )}
    </div>,
    document.body
  );
}

export default function Sidebar({ checkins: rawCheckins, checklistEntries: rawEntries, scores: rawScores }: SidebarProps) {
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

  const TeamContent = () => (
    <div className="px-5 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-semibold uppercase text-muted-foreground/70 tracking-[0.05em]">
          Team
        </h2>
        <span className="text-[11px] font-medium text-muted-foreground/70">
          {checkedInCount}/{EMPLOYEES_ORDER.length}
        </span>
      </div>
      <div className="space-y-1">
        {EMPLOYEES_ORDER.map((name) => {
          const checkin = checkins.find((c) => c.employee === name);
          const color = EMPLOYEE_COLORS[name] || "#999";
          const isCheckedIn = checkin?.status === "checked_in";

          return (
            <div
              key={name}
              className="flex items-center gap-3 rounded-lg px-2 cursor-pointer transition-colors hover:bg-muted min-h-[44px]"
              onMouseEnter={(e) => handleMouseEnter(name, e.currentTarget)}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => {
                 if (window.innerWidth < 1024) {
                    handleMouseEnter(name, e.currentTarget);
                    setTimeout(() => handleMouseLeave(), 3000);
                 }
              }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white w-6 h-6"
                style={{ backgroundColor: color }}
              >
                {name[0]}
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[13px] font-medium truncate text-foreground">
                  {name}
                </span>
                <span
                  className="shrink-0 rounded-full w-1.5 h-1.5"
                  style={{ backgroundColor: isCheckedIn ? "#22c55e" : "#d1d5db" }}
                />
              </div>
              {checkin?.time && (
                <span className="shrink-0 text-[11px] text-muted-foreground/70">
                  kl. {checkin.time}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const ChecklistsContent = () => (
    <div className="px-5 py-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[11px] font-semibold uppercase text-muted-foreground/70 tracking-[0.05em]">
          Sjekklister
        </h2>
        {pending.length > 0 && (
          <span className="text-[11px] font-medium text-muted-foreground/70">
            {pending.length} ventende
          </span>
        )}
      </div>

      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase mb-3 text-muted-foreground/70 tracking-[0.04em]">
            Ventende
          </p>
          <div className="space-y-2">
            {pending.map((item, i) => {
              const dotColor = item.status === "overdue" ? "#E06050" : "#E5A940";
              return (
                <div key={`p-${i}`} className="flex items-start gap-3 min-h-[44px]">
                  <span
                    className="shrink-0 rounded-full mt-1.5 w-1.5 h-1.5"
                    style={{ backgroundColor: dotColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate text-foreground">
                      {item.template}
                    </p>
                    <p className="text-[11px] truncate text-muted-foreground/70">
                      #{item.project_number} {item.project_name}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] mt-0.5 text-muted-foreground/70">
                    {timeAgo(item.sent_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase mb-3 text-muted-foreground/70 tracking-[0.04em]">
            Fullf&oslash;rt
          </p>
          <div className="space-y-2">
            {completed.map((item, i) => (
              <div key={`c-${i}`} className="flex items-start gap-3 min-h-[44px]">
                <svg width="16" height="16" viewBox="0 0 14 14" className="shrink-0 mt-1">
                  <circle cx="7" cy="7" r="6" fill="#22c55e" />
                  <path d="M4,7 L6,9.5 L10,4.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate text-foreground">
                    {item.template}
                  </p>
                  <p className="text-[11px] truncate text-muted-foreground/70">
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
                  <p className="text-[10px] text-muted-foreground/70">
                    {item.completed_at ? timeAgo(item.completed_at) : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex shrink-0 flex-col sticky top-0 h-screen w-[280px] border-r border-border bg-muted/30">
        <TeamContent />
        <div className="h-px bg-border mx-5" />
        <div className="flex-1 overflow-y-auto">
          <ChecklistsContent />
          <Leaderboard scores={rawScores || []} />
        </div>
      </aside>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] px-2">
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center min-h-[44px] w-full max-w-[80px] gap-1 cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span className="text-[10px] font-medium text-foreground">Team</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-xl px-0 pb-0 overflow-y-auto">
            <SheetHeader className="px-5 text-left">
              <SheetTitle className="text-sm">Team-oversikt</SheetTitle>
            </SheetHeader>
            <TeamContent />
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center min-h-[44px] w-full max-w-[80px] gap-1 cursor-pointer relative">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              {pending.length > 0 && (
                <span className="absolute top-0 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {pending.length}
                </span>
              )}
              <span className="text-[10px] font-medium text-foreground">Sjekkliste</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl px-0 pb-0 overflow-y-auto">
            <SheetHeader className="px-5 text-left">
              <SheetTitle className="text-sm">Sjekklister</SheetTitle>
            </SheetHeader>
            <ChecklistsContent />
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center min-h-[44px] w-full max-w-[80px] gap-1 cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
              </svg>
              <span className="text-[10px] font-medium text-foreground">Poeng</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-xl px-0 pb-0 overflow-y-auto">
            <SheetHeader className="px-5 text-left">
              <SheetTitle className="text-sm">Leaderboard</SheetTitle>
            </SheetHeader>
            <Leaderboard scores={rawScores || []} />
          </SheetContent>
        </Sheet>
      </nav>

      {/* Tooltip portal */}
      {mounted && hoveredEmployee && hoveredCheckin && tooltipRect && (
        <EmployeeTooltip
          checkin={hoveredCheckin}
          anchorRect={tooltipRect}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        />
      )}
    </>
  );
}

// --- Leaderboard ---

function Leaderboard({ scores }: { scores: EmployeeScore[] }) {
  const sorted = [...scores].sort((a, b) => b.total - a.total);
  const maxScore = Math.max(1, ...sorted.map(s => s.total));
  const monthName = new Date().toLocaleDateString("nb-NO", { month: "long" });
  const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const year = new Date().getFullYear();
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [hasHover, setHasHover] = useState(false);
  
  useEffect(() => {
    setHasHover(window.matchMedia("(hover: hover)").matches);
  }, []);

  if (sorted.length === 0) return null;

  return (
    <>
      <div className="h-px bg-border mx-5 mt-4" />
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[11px] font-semibold uppercase text-muted-foreground/70 tracking-[0.05em]">
            M&aring;nedens beste
          </h2>
          <span className="text-[11px] font-medium text-muted-foreground/70">
            {capMonth} {year}
          </span>
        </div>

        <div className="space-y-3">
          {sorted.map((s, i) => {
            const isFirst = i === 0 && s.total > 0;
            const color = EMPLOYEE_COLORS[s.employee] || "#999";
            const isExpanded = expandedEmployee === s.employee;
            
            // Derive a streak logic (perfect checkins this month)
            const hasStreak = s.checkinCount >= 5 && s.missedCheckins === 0;

            return (
              <div
                key={s.employee}
                className={`relative flex flex-col items-center rounded-xl transition-all cursor-pointer min-h-[44px] overflow-hidden ${isFirst ? "border border-[#E5A940] bg-[#E5A940]/5 py-4" : "border border-border bg-card py-3"}`}
                onClick={hasHover ? undefined : () => setExpandedEmployee(isExpanded ? null : s.employee)}
                onMouseEnter={hasHover ? () => setExpandedEmployee(s.employee) : undefined}
                onMouseLeave={hasHover ? () => setExpandedEmployee(null) : undefined}
              >
                {/* Confetti dots for #1 */}
                {isFirst && (
                  <>
                    <div className="absolute top-1.5 right-3.5 w-1 h-1 rounded-sm bg-[#E5A940]/50" />
                    <div className="absolute top-3.5 right-6 w-[3px] h-[3px] rounded-sm bg-[#F5D590]/60" />
                    <div className="absolute top-2 left-4 w-[3px] h-[3px] rounded-sm bg-[#E5A940]/35" />
                    <div className="absolute top-4 left-7 w-[3px] h-[3px] rounded-sm bg-[#F5D590]/50" />
                    <div className="absolute bottom-2.5 right-5 w-1 h-1 rounded-sm bg-[#E5A940]/30" />
                    <div className="absolute bottom-2 left-4 w-[3px] h-[3px] rounded-sm bg-[#F5D590]/40" />
                  </>
                )}

                {/* Crown/star above avatar for #1 */}
                {isFirst && (
                  <div className="text-[16px] mb-1 leading-none">&#x1F451;</div>
                )}

                {/* Avatar with rank badge for #2/#3 */}
                <div className="relative">
                  <div
                    className="flex items-center justify-center rounded-full font-bold text-white shadow-sm"
                    style={{
                      width: isFirst ? 48 : 36,
                      height: isFirst ? 48 : 36,
                      fontSize: isFirst ? 18 : 14,
                      backgroundColor: color,
                      border: isFirst ? "3px solid #E5A940" : "none"
                    }}
                  >
                    {s.employee[0]}
                  </div>
                  {!isFirst && (
                    <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-card border border-border text-[9px] font-bold text-muted-foreground shadow-sm">
                      {i + 1}
                    </div>
                  )}
                  {hasStreak && (
                    <div className="absolute -bottom-1 -right-1 flex items-center justify-center text-[12px] filter drop-shadow-sm" title="Feilfri innsjekkings-streak!">
                      🔥
                    </div>
                  )}
                </div>

                <p className={`mt-2 text-center font-semibold text-foreground ${isFirst ? "text-[15px]" : "text-[13px]"}`}>
                  {s.employee}
                </p>

                <p className="text-center mt-0.5">
                  <span className={`font-bold ${isFirst ? "text-[16px] text-[#E5A940]" : s.total < 0 ? "text-destructive" : s.total === 0 ? "text-muted-foreground/70 text-[13px]" : "text-muted-foreground text-[13px]"}`}>
                    {s.total}
                  </span>{" "}
                  <span className="text-[10px] text-muted-foreground/70">poeng</span>
                </p>
                
                {/* Progress bar mapping to relative top score */}
                <div className="w-full mt-2.5 px-6">
                   <Progress value={Math.max(0, (s.total / maxScore) * 100)} className={`h-1.5 ${isFirst ? "bg-[#E5A940]/20" : "bg-muted"}`} />
                </div>

                {isFirst && <p className="mt-2 text-[10px] font-bold text-[#CF952F] uppercase tracking-wider">M&aring;nedens leder</p>}

                {isExpanded && <ScoreBreakdown score={s} monthLabel={`${capMonth} ${year}`} />}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// --- Score breakdown panel ---

function ScoreBreakdown({ score: s, monthLabel }: { score: EmployeeScore; monthLabel: string }) {
  const hasActivity = s.checkinCount > 0 || s.missedCheckins > 0 || s.checklistOnTime > 0 || s.checklistLate > 0 || s.missedChecklists > 0 || s.deviationsReported > 0 || s.deviationsResponsible > 0 || s.deviationsResolved > 0;

  if (!hasActivity) {
    return (
      <div className="mt-4 w-full text-center text-[12px] text-muted-foreground/70 px-4">
        Ingen aktivitet denne m&aring;neden
      </div>
    );
  }

  const lines: { emoji: string; label: string; pts: number }[] = [];

  if (s.checkinCount > 0) {
    lines.push({ emoji: "\u2705", label: `Sjekk-inn (${s.checkinCount} ${s.checkinCount === 1 ? "dag" : "dager"})`, pts: s.checkinCount * 5 });
  }
  if (s.missedCheckins > 0) {
    lines.push({ emoji: "\u274C", label: `Manglende sjekk-inn (${s.missedCheckins} ${s.missedCheckins === 1 ? "dag" : "dager"})`, pts: s.missedCheckins * -3 });
  }
  if (s.checklistOnTime > 0) {
    lines.push({ emoji: "\u2705", label: `Sjekkliste levert i tide (${s.checklistOnTime})`, pts: s.checklistOnTime * 10 });
  }
  if (s.checklistLate > 0) {
    lines.push({ emoji: "\u26A0\uFE0F", label: `Sjekkliste levert sent (${s.checklistLate})`, pts: s.checklistLate * 5 });
  }
  if (s.missedChecklists > 0) {
    lines.push({ emoji: "\u274C", label: `Forfalt sjekkliste (${s.missedChecklists})`, pts: s.missedChecklists * -5 });
  }
  if (s.deviationsReported > 0) {
    lines.push({ emoji: "\u26A0\uFE0F", label: `Avvik rapportert (${s.deviationsReported})`, pts: s.deviationReporterPts });
  }
  if (s.deviationsResponsible > 0) {
    lines.push({ emoji: "\u274C", label: `Avvik ansvarlig (${s.deviationsResponsible})`, pts: s.deviationResponsiblePts });
  }
  if (s.deviationsResolved > 0) {
    lines.push({ emoji: "\u2705", label: `Avvik l\u00f8st i tide (${s.deviationsResolved})`, pts: s.deviationResolutionPts });
  }

  return (
    <div className="mt-4 w-full rounded-lg bg-muted/50 border border-border p-3 mx-4" style={{ width: "calc(100% - 32px)" }}>
      <p className="text-[10px] font-semibold uppercase mb-3 text-muted-foreground/70 tracking-[0.03em] text-left">
        {monthLabel}
      </p>
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="flex items-center gap-2 text-[12px]">
            <span className="text-[13px]">{line.emoji}</span>
            <span className="flex-1 text-foreground font-medium text-left">{line.label}</span>
            <span className={`font-semibold ${line.pts >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive"}`}>
              {line.pts >= 0 ? "+" : ""}{line.pts}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 flex items-center justify-between text-[13px] font-bold border-t border-border">
        <span className="text-foreground">Total</span>
        <span className={s.total < 0 ? "text-destructive" : s.total === 0 ? "text-muted-foreground/70" : "text-green-600 dark:text-green-500"}>
          {s.total >= 0 ? "+" : ""}{s.total}
        </span>
      </div>
    </div>
  );
}
