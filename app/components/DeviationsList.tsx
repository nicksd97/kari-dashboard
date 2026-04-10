"use client";

import { useState, useMemo } from "react";
import type { Deviation } from "@/lib/types";
import { SEVERITY_LABELS, SEVERITY_COLORS } from "@/lib/types";

interface DeviationsListProps {
  deviations: Deviation[];
}

const SEVERITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function deadlineLabel(deadline?: string): { text: string; overdue: boolean } | null {
  if (!deadline) return null;
  const now = new Date();
  const d = new Date(deadline);
  const diff = daysBetween(now, d);
  if (diff < 0) {
    const n = Math.abs(diff);
    return { text: n === 1 ? "1 dag over frist" : `${n} dager over frist`, overdue: true };
  }
  if (diff === 0) return { text: "Frist i dag", overdue: false };
  return { text: diff === 1 ? "1 dag igjen" : `${diff} dager igjen`, overdue: false };
}

export default function DeviationsList({ deviations }: DeviationsListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const { open, resolved } = useMemo(() => {
    const open: Deviation[] = [];
    const resolved: Deviation[] = [];
    for (const d of deviations) {
      if (d.resolved_at) resolved.push(d);
      else open.push(d);
    }
    open.sort((a, b) => {
      const sevDiff = (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0);
      if (sevDiff !== 0) return sevDiff;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
    resolved.sort((a, b) => (b.resolved_at || "").localeCompare(a.resolved_at || ""));
    return { open, resolved };
  }, [deviations]);

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="mt-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[16px] font-bold text-foreground">Avvik</h2>
        {open.length > 0 && (
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-bold"
            style={{ backgroundColor: "#F5C4B3", color: "#8a1a00" }}
          >
            {open.length} åpne
          </span>
        )}
        {resolved.length > 0 && (
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-bold"
            style={{ backgroundColor: "#C0DD97", color: "#3a5a1a" }}
          >
            {resolved.length} løste
          </span>
        )}
      </div>

      {open.length === 0 && resolved.length === 0 ? (
        <div className="rounded-xl p-8 text-center bg-card border border-border">
          <p className="text-[14px] font-medium text-muted-foreground/70">Ingen avvik registrert</p>
        </div>
      ) : (
        <>
          {/* Open list */}
          {open.length > 0 && (
            <div className="rounded-xl overflow-hidden bg-card border border-border">
              {open.map((d, i) => {
                const sev = SEVERITY_COLORS[d.severity] || SEVERITY_COLORS.medium;
                const sevLabel = SEVERITY_LABELS[d.severity] || d.severity;
                const dl = deadlineLabel(d.resolution_deadline);
                const isExpanded = expanded === d.id;
                return (
                  <div
                    key={d.id}
                    style={{
                      borderBottom: i < open.length - 1 ? "1px solid var(--divider)" : undefined,
                      borderLeft: "3px solid #d44a2a",
                    }}
                  >
                    <button
                      onClick={() => toggle(d.id)}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
                      style={{ minHeight: 48 }}
                    >
                      {/* Project number */}
                      <span className="shrink-0 text-[12px] font-medium w-10 text-muted-foreground/70">
                        #{d.project_number}
                      </span>

                      {/* Description (truncated) */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate text-foreground">
                          {d.description.length > 50
                            ? d.description.slice(0, 50) + "…"
                            : d.description}
                        </p>
                        {/* Mobile inline meta */}
                        <div className="flex items-center gap-2 sm:hidden mt-0.5">
                          <span
                            className="rounded-full px-2 py-px text-[10px] font-medium"
                            style={{ backgroundColor: sev.bg, color: sev.fg }}
                          >
                            {sevLabel}
                          </span>
                          {dl && (
                            <span
                              className="text-[11px]"
                              style={{ color: dl.overdue ? "#c33" : "#3a5a1a" }}
                            >
                              {dl.text}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Desktop columns */}
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold w-16 text-center"
                          style={{ backgroundColor: sev.bg, color: sev.fg }}
                        >
                          {sevLabel}
                        </span>
                        {d.responsible_name && (
                          <span className="text-[12px] w-32 truncate text-muted-foreground">
                            {d.responsible_name}
                          </span>
                        )}
                        {dl && (
                          <span
                            className="text-[11px] w-28 text-right"
                            style={{ color: dl.overdue ? "#c33" : "#3a5a1a" }}
                          >
                            {dl.text}
                          </span>
                        )}
                      </div>

                      {/* Chevron */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="shrink-0 text-muted-foreground/70"
                        style={{
                          transform: isExpanded ? "rotate(90deg)" : "none",
                          transition: "transform 0.15s",
                        }}
                      >
                        <path
                          d="M6 4L10 8L6 12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div
                        className="px-4 pb-4 pt-1 text-[12px] space-y-2"
                        style={{ backgroundColor: "var(--surface-hover)" }}
                      >
                        <p className="text-[13px] text-foreground whitespace-pre-line">
                          {d.description}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                          {d.location && (
                            <div>
                              <span className="block text-muted-foreground/70 text-[10px] uppercase tracking-wide">
                                Sted
                              </span>
                              <span className="text-foreground">{d.location}</span>
                            </div>
                          )}
                          <div>
                            <span className="block text-muted-foreground/70 text-[10px] uppercase tracking-wide">
                              Alvorlighet
                            </span>
                            <span className="text-foreground">{sevLabel}</span>
                          </div>
                          {d.reported_by_name && (
                            <div>
                              <span className="block text-muted-foreground/70 text-[10px] uppercase tracking-wide">
                                Rapportert av
                              </span>
                              <span className="text-foreground">{d.reported_by_name}</span>
                            </div>
                          )}
                          {d.responsible_name && (
                            <div>
                              <span className="block text-muted-foreground/70 text-[10px] uppercase tracking-wide">
                                Ansvarlig
                              </span>
                              <span className="text-foreground">{d.responsible_name}</span>
                            </div>
                          )}
                          <div>
                            <span className="block text-muted-foreground/70 text-[10px] uppercase tracking-wide">
                              Rapportert
                            </span>
                            <span className="text-foreground">{formatDate(d.created_at)}</span>
                          </div>
                          {d.resolution_deadline && (
                            <div>
                              <span className="block text-muted-foreground/70 text-[10px] uppercase tracking-wide">
                                Frist
                              </span>
                              <span className="text-foreground">{formatDate(d.resolution_deadline)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Resolved toggle + list */}
          {resolved.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowResolved((s) => !s)}
                className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showResolved ? "Skjul løste avvik" : `Vis løste avvik (${resolved.length})`}
              </button>

              {showResolved && (
                <div className="mt-3 rounded-xl overflow-hidden bg-card border border-border opacity-80">
                  {resolved.map((d, i) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        borderBottom: i < resolved.length - 1 ? "1px solid var(--divider)" : undefined,
                        borderLeft: "3px solid #6aa84f",
                        minHeight: 48,
                      }}
                    >
                      <span className="shrink-0 text-[12px] font-medium w-10 text-muted-foreground/70">
                        #{d.project_number}
                      </span>
                      <p
                        className="flex-1 min-w-0 text-[13px] truncate text-muted-foreground"
                        style={{ textDecoration: "line-through" }}
                      >
                        {d.description.length > 50
                          ? d.description.slice(0, 50) + "…"
                          : d.description}
                      </p>
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        {d.resolved_by_name && (
                          <span className="text-[12px] w-32 truncate text-muted-foreground/70">
                            {d.resolved_by_name}
                          </span>
                        )}
                        {d.resolved_at && (
                          <span className="text-[11px] w-16 text-right text-muted-foreground/70">
                            {formatDate(d.resolved_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
