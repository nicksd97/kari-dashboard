"use client";

import type { Checkin, ChecklistEntry } from "@/lib/types";
import { EMPLOYEE_COLORS } from "@/lib/types";

interface SidebarProps {
  checkins: Checkin[];
  checklistEntries: ChecklistEntry[];
}

const EMPLOYEES_ORDER = ["Roar", "Andrii", "Marci"];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "i dag";
  if (diffDays === 1) return "1 dag siden";
  return `${diffDays} dager siden`;
}

export default function Sidebar({ checkins: rawCheckins, checklistEntries: rawEntries }: SidebarProps) {
  const checkins = rawCheckins || [];
  const checklistEntries = rawEntries || [];
  const pending = checklistEntries.filter((c) => c.status !== "completed");
  const completed = checklistEntries.filter((c) => c.status === "completed");
  const checkedInCount = checkins.filter((c) => c.status === "checked_in").length;

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
        <div className="flex items-center justify-between mb-4">
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
            {checkedInCount}/{EMPLOYEES_ORDER.length} innsjekket
          </span>
        </div>

        <div className="space-y-1">
          {EMPLOYEES_ORDER.map((name) => {
            const checkin = checkins.find((c) => c.employee === name);
            const color = EMPLOYEE_COLORS[name] || "#999";

            return (
              <div
                key={name}
                className="flex items-center gap-3 rounded-lg px-2.5 transition-colors"
                style={{ height: 40 }}
              >
                {/* Avatar */}
                <div
                  className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ width: 24, height: 24, backgroundColor: color }}
                >
                  {name[0]}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {name}
                    </span>

                    {checkin?.status === "checked_in" && (
                      <span
                        className="rounded-full"
                        style={{ width: 5, height: 5, backgroundColor: "#22c55e" }}
                      />
                    )}
                    {checkin?.status === "waiting" && (
                      <span
                        className="rounded-full"
                        style={{ width: 5, height: 5, backgroundColor: "#d1d5db" }}
                      />
                    )}
                  </div>

                  {checkin?.status === "checked_in" && checkin.summary && (
                    <p
                      className="truncate text-[11px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {checkin.summary}
                    </p>
                  )}
                  {checkin?.status === "waiting" && (
                    <p className="text-[11px]" style={{ color: "var(--muted-light)" }}>
                      Venter
                    </p>
                  )}
                  {(!checkin || checkin.status === "off") && (
                    <p className="text-[11px]" style={{ color: "var(--muted-light)" }}>
                      {checkin?.label || ""}
                    </p>
                  )}
                </div>

                {checkin?.time && (
                  <span
                    className="shrink-0 text-[10px]"
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
              Fullført
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
      </div>
    </aside>
  );
}
