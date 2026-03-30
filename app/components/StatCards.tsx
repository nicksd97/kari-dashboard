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
    { label: "Pågående", value: active, color: "#6DD4B1" },
    { label: "I planlegging", value: planning, color: "#B8B4F0" },
    { label: "Ferdig", value: completed, color: "#A8D175" },
    { label: "Nye leads", value: newLeads, color: "#9CC8F0" },
    {
      label: "Forfalt oppfølging",
      value: overdueFollowups,
      color: overdueFollowups > 0 ? "#ef4444" : "#9ca3af",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative rounded-xl bg-[var(--card-bg)] px-5 py-5"
          style={{
            border: "1px solid var(--card-border)",
            borderLeft: `3px solid ${card.color}`,
            minHeight: 80,
          }}
        >
          <p className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>
            {card.label}
          </p>
          <p
            className="mt-2 text-[32px] font-bold leading-none"
            style={{ color: card.color }}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
