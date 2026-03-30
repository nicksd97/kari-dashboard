"use client";

import type { Lead } from "@/lib/types";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, SOURCE_COLORS } from "@/lib/types";

interface LeadPipelineProps {
  leads: Lead[];
}

const COLUMNS = ["new", "contacted", "followup_pending", "qualified", "converted", "lost"];

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
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((status) => {
        const columnLeads = leads.filter((l) => l.status === status);

        return (
          <div
            key={status}
            className="flex min-w-[220px] flex-1 flex-col rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: LEAD_STATUS_COLORS[status] }}
              />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {LEAD_STATUS_LABELS[status]}
              </span>
              <span className="ml-auto rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {columnLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 480 }}>
              {columnLeads.map((lead) => {
                const isOverdue =
                  lead.followup_due_at &&
                  lead.followup_due_at < today &&
                  status !== "converted" &&
                  status !== "lost";
                const sourceColor = SOURCE_COLORS[lead.source] || SOURCE_COLORS.other;

                return (
                  <div
                    key={lead.email}
                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: sourceColor }}
                      >
                        {getInitials(lead.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {lead.name}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {lead.address}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: sourceColor }}
                      >
                        {lead.source}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(lead.created_at)}
                      </span>
                      {isOverdue && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">
                          Forfalt
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
