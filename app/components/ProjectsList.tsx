"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import type { Project } from "@/lib/types";
import { STATUS_COLORS_SOFT, STATUS_LABELS, EMPLOYEE_COLORS } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const COMPANY_ID = "a12dfbf0-a9d6-4786-95fe-6f1678d9d980";

interface ChecklistWarning {
  type: "open" | "overdue";
  count: number;
}

interface ProjectsListProps {
  projects: Project[];
}

const STATUS_FILTERS = [
  { key: "alle", label: "Alle" },
  { key: "pagaende", label: "Pågående" },
  { key: "planlegging", label: "Planlegging" },
  { key: "materialer", label: "Materialer" },
  { key: "innkommende", label: "Innkommende" },
  { key: "venter kunde", label: "Venter kunde" },
  { key: "ferdig", label: "Ferdig" },
];

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export default function ProjectsList({ projects }: ProjectsListProps) {
  const [statusFilter, setStatusFilter] = useState("alle");
  const [search, setSearch] = useState("");
  const [warnings, setWarnings] = useState<Record<string, ChecklistWarning>>({});

  // Fetch checklist warnings for all projects
  useEffect(() => {
    async function loadWarnings() {
      const { data } = await supabase
        .from("checklists")
        .select("project_number, completed_at, created_at")
        .eq("company_id", COMPANY_ID);
      if (!data) return;

      const now = Date.now();
      const byProject: Record<string, ChecklistWarning> = {};
      for (const cl of data) {
        const pn = String(cl.project_number || "");
        if (!pn) continue;
        const completed = !!cl.completed_at;
        const createdAt = cl.created_at ? new Date(String(cl.created_at)).getTime() : 0;
        const daysSinceCreated = createdAt ? Math.round((now - createdAt) / (1000 * 60 * 60 * 24)) : 0;

        if (!completed) {
          const existing = byProject[pn];
          if (daysSinceCreated > 3) {
            // Overdue takes priority
            byProject[pn] = { type: "overdue", count: (existing?.count || 0) + 1 };
          } else if (!existing || existing.type !== "overdue") {
            byProject[pn] = { type: "open", count: (existing?.count || 0) + 1 };
          } else {
            byProject[pn] = { ...existing, count: existing.count + 1 };
          }
        }
      }
      setWarnings(byProject);
    }
    loadWarnings();
  }, [projects]);

  const sorted = useMemo(
    () => [...projects].sort((a, b) => Number(b.project_number) - Number(a.project_number)),
    [projects]
  );

  const filtered = useMemo(() => {
    let list = sorted;
    if (statusFilter !== "alle") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.project_number.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.customer_name && p.customer_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [sorted, statusFilter, search]);

  // Count per status for badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of sorted) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [sorted]);

  return (
    <div className="mt-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2
          className="text-[16px] font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Prosjekter
        </h2>
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-bold"
          style={{ backgroundColor: "var(--surface-hover)", color: "var(--muted)" }}
        >
          {sorted.length}
        </span>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Søk prosjekt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg px-3 py-2 text-[13px] outline-none w-full sm:w-56"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--card-border)",
            color: "var(--foreground)",
          }}
        />
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            const count = f.key === "alle" ? sorted.length : (statusCounts[f.key] || 0);
            if (f.key !== "alle" && count === 0) return null;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer"
                style={{
                  backgroundColor: isActive ? "var(--foreground)" : "var(--surface)",
                  color: isActive ? "var(--background)" : "var(--muted)",
                  border: isActive ? "none" : "1px solid var(--card-border)",
                }}
              >
                {f.label}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <p className="text-[14px] font-medium" style={{ color: "var(--muted-light)" }}>
            Ingen prosjekter funnet
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          {filtered.map((p, i) => (
            <Link
              key={p.project_number}
              href={`/project/${p.project_number}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--divider)" : undefined, minHeight: 48 }}
            >
              {/* Number */}
              <span
                className="shrink-0 text-[12px] font-medium w-10"
                style={{ color: "var(--muted-light)" }}
              >
                #{p.project_number}
              </span>

              {/* Name + customer (stacks on mobile) */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p
                    className="text-[13px] font-medium truncate"
                    style={{
                      color: p.status === "ferdig" ? "var(--muted-light)" : "var(--foreground)",
                      textDecoration: p.status === "ferdig" ? "line-through" : "none",
                    }}
                  >
                    {p.name}
                  </p>
                  {warnings[p.project_number] && (
                    <span
                      className="shrink-0"
                      title={warnings[p.project_number].type === "overdue" ? "Forfalt sjekkliste" : "Åpen sjekkliste"}
                      style={{ fontSize: 14, lineHeight: 1, cursor: "help" }}
                    >
                      {warnings[p.project_number].type === "overdue" ? "\uD83D\uDD34" : "\uD83D\uDFE1"}
                    </span>
                  )}
                </div>
                {/* Mobile: show status inline. Desktop: hidden (shown in separate column) */}
                <div className="flex items-center gap-2 sm:hidden mt-0.5">
                  <span
                    className="rounded-full px-2 py-px text-[10px] font-medium"
                    style={{ backgroundColor: STATUS_COLORS_SOFT[p.status] || "#eee", color: "#555" }}
                  >
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                  {p.assigned && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--muted-light)" }}>
                      <span className="rounded-full" style={{ width: 5, height: 5, backgroundColor: EMPLOYEE_COLORS[p.assigned] || "#888" }} />
                      {p.assigned}
                    </span>
                  )}
                </div>
              </div>

              {/* Desktop columns */}
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                {p.customer_name && (
                  <span className="text-[12px] w-28 truncate" style={{ color: "var(--muted-light)" }}>
                    {p.customer_name}
                  </span>
                )}
                {p.assigned && (
                  <span className="flex items-center gap-1.5 text-[12px] w-16" style={{ color: "var(--muted)" }}>
                    <span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: EMPLOYEE_COLORS[p.assigned] || "#888" }} />
                    {p.assigned}
                  </span>
                )}
                {p.start_date && (
                  <span className="text-[11px] w-16 text-right" style={{ color: "var(--muted-light)" }}>
                    {formatDate(p.start_date)}
                  </span>
                )}
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold w-24 text-center"
                  style={{ backgroundColor: STATUS_COLORS_SOFT[p.status] || "#eee", color: "#555" }}
                >
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>

              {/* Chevron */}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0" style={{ color: "var(--muted-light)" }}>
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
