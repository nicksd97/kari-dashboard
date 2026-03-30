"use client";

import type { Project, Lead } from "@/lib/types";

interface StatCardsProps {
  projects: Project[];
  leads: Lead[];
}

export default function StatCards({ projects, leads }: StatCardsProps) {
  const active = projects.filter((p) => p.status === "pagaende").length;
  const planning = projects.filter((p) =>
    ["planlegging", "innkommende", "materialer"].includes(p.status)
  ).length;
  const completed = projects.filter((p) => p.status === "ferdig").length;
  const newLeads = leads.filter((l) => l.status === "new").length;

  const today = new Date().toISOString().split("T")[0];
  const overdueFollowups = leads.filter(
    (l) =>
      l.followup_due_at &&
      l.followup_due_at < today &&
      l.status !== "converted" &&
      l.status !== "lost"
  ).length;

  const cards = [
    { label: "Pågående", value: active, color: "#9FE1CB" },
    { label: "I planlegging", value: planning, color: "#CECBF6" },
    { label: "Ferdig", value: completed, color: "#C0DD97" },
    { label: "Nye leads", value: newLeads, color: "#B5D4F4" },
    {
      label: "Forfalt oppfølging",
      value: overdueFollowups,
      color: overdueFollowups > 0 ? "#ef4444" : "#888780",
      urgent: overdueFollowups > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {card.label}
          </p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{ color: card.color }}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
