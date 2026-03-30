"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  SOURCE_COLORS,
} from "@/lib/types";

interface LeadPipelineProps {
  leads: Lead[];
}

const COLUMNS = [
  "new",
  "contacted",
  "followup_pending",
  "qualified",
  "converted",
  "lost",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

export default function LeadPipeline({ leads }: LeadPipelineProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((status) => {
        const columnLeads = leads.filter((l) => l.status === status);

        return (
          <div
            key={status}
            className="flex min-w-[240px] flex-1 flex-col rounded-xl"
            style={{
              border: "1px solid var(--card-border)",
              backgroundColor: "var(--surface)",
            }}
          >
            {/* Colored top border */}
            <div
              className="rounded-t-xl"
              style={{
                height: 3,
                backgroundColor: LEAD_STATUS_COLORS[status],
              }}
            />

            {/* Column header */}
            <div
              className="flex items-center gap-2.5 px-4 py-3"
              style={{ borderBottom: "1px solid var(--divider)" }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: LEAD_STATUS_COLORS[status] }}
              />
              <span
                className="text-[13px] font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {LEAD_STATUS_LABELS[status]}
              </span>
              <span
                className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-bold"
                style={{
                  backgroundColor: "var(--surface-hover)",
                  color: "var(--muted)",
                }}
              >
                {columnLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div
              className="flex-1 space-y-3 overflow-y-auto p-3"
              style={{ maxHeight: 520 }}
            >
              {columnLeads.map((lead) => (
                <LeadCard
                  key={lead.email}
                  lead={lead}
                  status={status}
                  today={today}
                />
              ))}
            </div>

            {/* Column footer summary */}
            <div
              className="px-4 py-2.5 text-[11px] font-medium"
              style={{
                borderTop: "1px solid var(--divider)",
                color: "var(--muted-light)",
              }}
            >
              {columnLeads.length}{" "}
              {columnLeads.length === 1 ? "lead" : "leads"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadCard({
  lead,
  status,
  today,
}: {
  lead: Lead;
  status: string;
  today: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOverdue =
    lead.followup_due_at &&
    lead.followup_due_at < today &&
    status !== "converted" &&
    status !== "lost";
  const sourceColor =
    SOURCE_COLORS[lead.source] || SOURCE_COLORS.other;

  return (
    <div
      className="rounded-lg cursor-pointer transition-all duration-150"
      style={{
        border: "1px solid var(--card-border)",
        backgroundColor: "var(--card-bg)",
        padding: "14px",
        boxShadow: expanded
          ? "0 4px 16px rgba(0,0,0,0.1)"
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
          style={{ backgroundColor: sourceColor }}
        >
          {getInitials(lead.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] font-semibold truncate"
            style={{ color: "var(--foreground)" }}
          >
            {lead.name}
          </p>
          <p
            className="text-[11px] truncate"
            style={{ color: "var(--muted)" }}
          >
            {lead.address}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
          style={{ backgroundColor: sourceColor }}
        >
          {lead.source}
        </span>
        <span
          className="text-[11px]"
          style={{ color: "var(--muted-light)" }}
        >
          {formatDate(lead.created_at)}
        </span>
        {isOverdue && (
          <span className="pulse-badge rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">
            Forfalt
          </span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          className="mt-3 space-y-1 pt-3 text-[11px]"
          style={{
            borderTop: "1px solid var(--divider)",
            color: "var(--muted)",
          }}
        >
          <p>
            <span style={{ color: "var(--muted-light)" }}>E-post:</span>{" "}
            <span style={{ color: "var(--foreground)" }}>{lead.email}</span>
          </p>
          <p>
            <span style={{ color: "var(--muted-light)" }}>Telefon:</span>{" "}
            <span style={{ color: "var(--foreground)" }}>{lead.phone}</span>
          </p>
          {lead.followup_due_at && (
            <p>
              <span style={{ color: "var(--muted-light)" }}>
                Oppf&oslash;lging:
              </span>{" "}
              <span style={{ color: "var(--foreground)" }}>
                {formatDate(lead.followup_due_at)}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
