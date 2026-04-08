"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  pointerWithin,
  DragStartEvent,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
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
  "befaring",
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
  if (!d) return "";
  return new Date(d).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

// --- Draggable Card Component ---
function DraggableLeadCard({
  lead,
  status,
  today,
}: {
  lead: Lead;
  status: string;
  today: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: lead.email, // Assuming email is unique as an ID
      data: { lead },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 1,
      }
    : {
        opacity: isDragging ? 0.5 : 1,
      };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCardContent lead={lead} status={status} today={today} />
    </div>
  );
}

// --- Droppable Column Component ---
function DroppableColumn({
  status,
  leads,
  today,
}: {
  status: string;
  leads: Lead[];
  today: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[280px] flex-1 flex-col rounded-xl bg-card transition-colors ${
        isOver ? "ring-2 ring-primary bg-muted/30" : "border border-border"
      }`}
    >
      <div
        className="rounded-t-xl"
        style={{
          height: 4,
          backgroundColor: LEAD_STATUS_COLORS[status],
        }}
      />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: LEAD_STATUS_COLORS[status] }}
        />
        <span className="text-[13px] font-semibold text-foreground">
          {LEAD_STATUS_LABELS[status]}
        </span>
        <span className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-bold bg-secondary text-muted-foreground">
          {leads.length}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 300px)", minHeight: 150 }}>
        {leads.map((lead) => (
          <DraggableLeadCard
            key={lead.email}
            lead={lead}
            status={status}
            today={today}
          />
        ))}
      </div>

      <div className="px-4 py-2.5 text-[11px] font-medium border-t border-border text-muted-foreground/70">
        {leads.length} {leads.length === 1 ? "lead" : "leads"}
      </div>
    </div>
  );
}

// --- Main Pipeline Component ---
export default function LeadPipeline({ leads: rawLeads }: LeadPipelineProps) {
  const [leads, setLeads] = useState<Lead[]>(rawLeads || []);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const today = new Date().toISOString().split("T")[0];

  // Update local state if props change
  useEffect(() => {
    setLeads(rawLeads || []);
  }, [rawLeads]);

  // Use both mouse and touch sensors for mobile compatibility
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = active.data.current?.lead as Lead;
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return; // Dropped outside

    const leadEmail = active.id as string;
    const newStatus = over.id as string;

    const leadToUpdate = leads.find((l) => l.email === leadEmail);
    if (!leadToUpdate || leadToUpdate.status === newStatus) return;

    const oldStatus = leadToUpdate.status;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.email === leadEmail ? { ...l, status: newStatus } : l))
    );

    // Save to Supabase (assuming email is unique and identifies the lead for this demo)
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("email", leadEmail);

      if (error) throw error;
      toast.success(`Lead flyttet til ${LEAD_STATUS_LABELS[newStatus]}`);
    } catch (err) {
      console.error(err);
      toast.error("Kunne ikke oppdatere lead, reverserer endring.");
      // Rollback
      setLeads((prev) =>
        prev.map((l) => (l.email === leadEmail ? { ...l, status: oldStatus } : l))
      );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 px-1 touch-pan-y">
        {COLUMNS.map((status) => {
          const columnLeads = leads.filter((l) => l.status === status);
          return (
            <DroppableColumn
              key={status}
              status={status}
              leads={columnLeads}
              today={today}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="opacity-90 scale-[1.02] shadow-2xl cursor-grabbing">
            <LeadCardContent lead={activeLead} status={activeLead.status} today={today} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- Presentational Card Content ---
function LeadCardContent({
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
  const sourceColor = SOURCE_COLORS[lead.source] || SOURCE_COLORS.other;

  return (
    <div
      className="rounded-xl cursor-grab active:cursor-grabbing transition-all duration-150 bg-card border border-border p-4 shadow-sm hover:shadow-md"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      // Simple toggle for mobile touch screens
      onClick={() => {
        if (window.innerWidth < 1024) setExpanded(!expanded);
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white shadow-inner"
          style={{ backgroundColor: sourceColor }}
        >
          {getInitials(lead.name)}
        </div>
        <div className="min-w-0 flex-1 mt-0.5">
          <p className="text-[14px] font-bold truncate text-foreground leading-tight">
            {lead.name}
          </p>
          <p className="text-[12px] truncate text-muted-foreground mt-0.5">
            {lead.address || "Ingen adresse"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className="rounded-md px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm"
          style={{ backgroundColor: sourceColor }}
        >
          {lead.source}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground/70">
          {formatDate(lead.created_at)}
        </span>
        {isOverdue && (
          <span className="pulse-badge rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
            Forfalt
          </span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-1.5 pt-4 border-t border-border text-[12px] text-muted-foreground">
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground/70 w-16">E-post:</span>
            <span className="text-foreground font-medium truncate">{lead.email}</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground/70 w-16">Telefon:</span>
            <span className="text-foreground font-medium">{lead.phone}</span>
          </p>
          {lead.followup_due_at && (
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground/70 w-16">Oppf&oslash;lging:</span>
              <span className={`font-medium ${isOverdue ? "text-destructive" : "text-foreground"}`}>
                {formatDate(lead.followup_due_at)}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
