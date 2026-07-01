"use client";

import type { Project, Lead } from "@/lib/types";

interface StatCardsProps {
  projects: Project[];
  leads: Lead[];
}

export default function StatCards({ projects: rawProjects, leads: rawLeads }: StatCardsProps) {
  const projects = rawProjects || [];
  const leads = rawLeads || [];
  const active = projects.filter((p) => p.status === "pagaende").length;
  const planning = projects.filter((p) =>
    ["innkommende", "planlegging", "materialer"].includes(p.status)
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
      <div className="p-card" style={{ padding: '13px 16px' }}>
        <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>Pågående</div>
        <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums', color: '#1f4b4a' }}>{active}</div>
        <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>aktive prosjekter</div>
      </div>
      <div className="p-card" style={{ padding: '13px 16px' }}>
        <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>I planlegging</div>
        <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums', color: '#1f4b4a' }}>{planning}</div>
        <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>prosjekter</div>
      </div>
      <div className="p-card" style={{ padding: '13px 16px' }}>
        <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>Ferdig</div>
        <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums', color: '#1f4b4a' }}>{completed}</div>
        <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>prosjekter</div>
      </div>
      <div className="p-card" style={{ padding: '13px 16px', background: '#1f4b4a', borderColor: '#143332', color: '#eef2f0' }}>
        <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#b9cccb', fontWeight: 600 }}>Nye leads</div>
        <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums' }}>{newLeads}</div>
        <div style={{ fontSize: 11.5, color: '#b9cccb', marginTop: 1 }}>til oppfølging</div>
      </div>
      <div className="p-card" style={{ padding: '13px 16px', borderColor: overdueFollowups > 0 ? '#fca5a5' : '#e7e4db' }}>
        <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#4a534f', fontWeight: 600 }}>Forfalt oppfølging</div>
        <div style={{ fontWeight: 700, fontSize: 24, marginTop: 4, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums', color: overdueFollowups > 0 ? '#ef4444' : '#1f4b4a' }}>{overdueFollowups}</div>
        <div style={{ fontSize: 11.5, color: '#4a534f', marginTop: 1 }}>leads</div>
      </div>
    </div>
  );
}
