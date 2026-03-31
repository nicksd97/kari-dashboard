import { supabase } from "./supabase";
import type { Project, Lead, Checkin, ChecklistEntry } from "./types";

const COMPANY_ID = "a12dfbf0-a9d6-4786-95fe-6f1678d9d980";

const DEMO_PROJECTS: Project[] = [
  { project_number: "815", name: "Jan Erik Peis", status: "pagaende", customer_name: "Jan Erik Peis", start_date: "2026-03-10", estimated_end_date: "2026-04-15", agreed_price: 185000, assigned: "Roar", checklists: [{ name: "Ferdigstillelse", done: 4, total: 12, date: "2026-03-30" }] },
  { project_number: "767", name: "Stavnevegen 31", status: "pagaende", customer_name: "Stavnevegen 31", start_date: "2026-03-01", estimated_end_date: "2026-04-20", agreed_price: 320000, assigned: "Andrii", checklists: [{ name: "Vernerunde", done: 4, total: 10, date: "2026-03-30" }, { name: "Kvalitetskontroll Kjøkken", done: 6, total: 10, date: "2026-03-30" }] },
  { project_number: "790", name: "Molnes Kalkulering", status: "planlegging", customer_name: "Molnes", start_date: "2026-04-01", estimated_end_date: "2026-05-15", agreed_price: 450000, assigned: "Roar", dependency: "815" },
  { project_number: "802", name: "Vika Hustad Isolasjon", status: "pagaende", customer_name: "Vika Hustad", start_date: "2026-03-20", estimated_end_date: "2026-04-10", agreed_price: 95000, assigned: "Roar" },
  { project_number: "810", name: "Byåsen Betong", status: "ferdig", customer_name: "Byåsen", start_date: "2026-03-01", estimated_end_date: "2026-03-26", agreed_price: 125000, assigned: "Marci", checklists: [{ name: "Ferdigstillelse", done: 12, total: 12, date: "2026-03-26" }] },
  { project_number: "820", name: "Adapteo Moduler", status: "materialer", customer_name: "Adapteo", start_date: "2026-04-05", estimated_end_date: "2026-05-30", agreed_price: 780000, assigned: "Andrii", dependency: "767" },
  { project_number: "825", name: "Garage Trondheim", status: "innkommende", customer_name: "Petter Sørensen" },
];

const DEMO_LEADS: Lead[] = [
  { name: "Erik Johansen", email: "erik@gmail.com", phone: "99112233", source: "byggmann", status: "new", created_at: "2026-03-29", followup_due_at: "2026-04-01", address: "Trondheim" },
  { name: "Maria Svendsen", email: "maria.s@outlook.com", phone: "98765432", source: "minihusmidtnorge", status: "contacted", created_at: "2026-03-25", followup_due_at: "2026-03-28", address: "Melhus" },
  { name: "Anders Berg", email: "anders.b@online.no", phone: "91234567", source: "billigtak", status: "followup_pending", created_at: "2026-03-20", followup_due_at: "2026-03-30", address: "Lundamo" },
  { name: "Kristin Haugen", email: "k.haugen@gmail.com", phone: "92345678", source: "byggmann", status: "qualified", created_at: "2026-03-15", address: "Skaun" },
  { name: "Ole Nilsen", email: "ole.n@gmail.com", phone: "93456789", source: "email", status: "converted", created_at: "2026-03-01", address: "Orkanger" },
  { name: "Silje Larsen", email: "silje@hotmail.com", phone: "94567890", source: "minihusmidtnorge", status: "contacted", created_at: "2026-03-27", followup_due_at: "2026-03-30", address: "Støren" },
  { name: "Thomas Vik", email: "thomas.vik@firma.no", phone: "95678901", source: "byggmann", status: "lost", created_at: "2026-02-15", address: "Melhus" },
  { name: "Ingrid Moen", email: "ingrid.m@gmail.com", phone: "96789012", source: "billigtak", status: "new", created_at: "2026-03-30", address: "Buvika" },
];

export async function fetchProjects(): Promise<{ projects: Project[]; isLive: boolean }> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("company_id", COMPANY_ID);

    if (error || !data || data.length === 0) {
      return { projects: DEMO_PROJECTS, isLive: false };
    }

    // Try to fetch checklists for each project
    const projectsWithChecklists = await Promise.all(
      data.map(async (p: Record<string, unknown>) => {
        const { data: checklists } = await supabase
          .from("checklists")
          .select("*")
          .eq("project_id", p.id);

        return {
          project_number: String(p.project_number || ""),
          name: String(p.name || ""),
          status: String(p.status || ""),
          customer_name: p.customer_name ? String(p.customer_name) : undefined,
          start_date: p.start_date ? String(p.start_date) : undefined,
          estimated_end_date: p.estimated_end_date ? String(p.estimated_end_date) : (p.start_date ? String(p.start_date) : undefined),
          end_date_defaulted: !p.estimated_end_date && !!p.start_date,
          agreed_price: p.agreed_price ? Number(p.agreed_price) : undefined,
          assigned: p.assigned ? String(p.assigned) : undefined,
          dependency: p.dependency ? String(p.dependency) : undefined,
          checklists: checklists?.map((c: Record<string, unknown>) => ({
            name: String(c.name || ""),
            done: Number(c.done || 0),
            total: Number(c.total || 0),
            date: c.date ? String(c.date) : undefined,
          })),
        } as Project;
      })
    );

    return { projects: projectsWithChecklists, isLive: true };
  } catch {
    return { projects: DEMO_PROJECTS, isLive: false };
  }
}

export async function fetchLeads(): Promise<{ leads: Lead[]; isLive: boolean }> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("company_id", COMPANY_ID);

    if (error || !data || data.length === 0) {
      return { leads: DEMO_LEADS, isLive: false };
    }

    const mapped = data.map((l: Record<string, unknown>) => ({
      name: String(l.name || ""),
      email: String(l.email || ""),
      phone: String(l.phone || ""),
      source: String(l.source || "other"),
      status: String(l.status || "new"),
      created_at: String(l.created_at || ""),
      followup_due_at: l.followup_due_at ? String(l.followup_due_at) : undefined,
      address: String(l.address || ""),
    })) as Lead[];

    return { leads: mapped, isLive: true };
  } catch {
    return { leads: DEMO_LEADS, isLive: false };
  }
}

const DEMO_CHECKINS: Checkin[] = [
  { employee: "Roar", status: "checked_in", summary: "Vika Hustad - Isolasjon", time: "07:14", projectNumber: "802", projectName: "Vika Hustad Isolasjon", rawResponse: "Jobber med isolasjon i dag, ferdig med vegger, starter tak etter lunsj", estimatedCompletion: "2026-04-10" },
  { employee: "Andrii", status: "checked_in", summary: "Stavnevegen 31", time: "06:45", projectNumber: "767", projectName: "Stavnevegen 31", rawResponse: "Fortsetter med kjøkkenmontering, venter på benkeplate", estimatedCompletion: "2026-04-20" },
  { employee: "Marci", status: "waiting" },
];

const DEMO_CHECKLIST_ENTRIES: ChecklistEntry[] = [
  { template: "Vernerunde", project_number: "802", project_name: "Vika Hustad", status: "pending", sent_at: "2026-03-30" },
  { template: "Ferdigstillelse", project_number: "815", project_name: "Jan Erik Peis", status: "completed", done: 4, total: 12, sent_at: "2026-03-29", completed_at: "2026-03-30" },
  { template: "Vernerunde", project_number: "767", project_name: "Stavnevegen 31", status: "completed", done: 7, total: 10, sent_at: "2026-03-29", completed_at: "2026-03-30" },
  { template: "Kvalitetskontroll Kjøkken", project_number: "767", project_name: "Stavnevegen 31", status: "completed", done: 6, total: 10, sent_at: "2026-03-28", completed_at: "2026-03-30" },
];

export async function fetchCheckins(): Promise<Checkin[]> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("checkins")
      .select("*")
      .eq("company_id", COMPANY_ID)
      .eq("checkin_date", today);

    if (error || !data || data.length === 0) return DEMO_CHECKINS;

    return data.map((c: Record<string, unknown>) => ({
      employee: String(c.employee || ""),
      status: c.responded_at ? "checked_in" as const : "waiting" as const,
      summary: c.summary ? String(c.summary) : undefined,
      time: c.responded_at
        ? new Date(String(c.responded_at)).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })
        : undefined,
    }));
  } catch {
    return DEMO_CHECKINS;
  }
}

export async function fetchChecklistEntries(): Promise<ChecklistEntry[]> {
  try {
    const { data, error } = await supabase
      .from("checklists")
      .select("*")
      .eq("company_id", COMPANY_ID)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) return DEMO_CHECKLIST_ENTRIES;

    return data.map((c: Record<string, unknown>) => ({
      template: String(c.template || ""),
      project_number: String(c.project_number || ""),
      project_name: String(c.project_name || ""),
      status: (c.completed_at ? "completed" : "pending") as "completed" | "pending",
      done: c.done != null ? Number(c.done) : undefined,
      total: c.total != null ? Number(c.total) : undefined,
      sent_at: String(c.created_at || ""),
      completed_at: c.completed_at ? String(c.completed_at) : undefined,
    }));
  } catch {
    return DEMO_CHECKLIST_ENTRIES;
  }
}

export function getDemoData() {
  return {
    projects: DEMO_PROJECTS,
    leads: DEMO_LEADS,
    checkins: DEMO_CHECKINS,
    checklistEntries: DEMO_CHECKLIST_ENTRIES,
  };
}

// Live-only fetchers: return empty arrays on failure (no demo fallback)

export async function fetchLiveProjects(): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*, employees!assigned_to(name)")
      .eq("company_id", COMPANY_ID);

    if (error || !data) return [];

    console.log("[fetchLiveProjects] raw data:", JSON.stringify(data.map((p: Record<string, unknown>) => ({
      project_number: p.project_number, start_date: p.start_date, estimated_end_date: p.estimated_end_date, assigned_to: p.assigned_to, employees: p.employees,
    }))));

    return await Promise.all(
      data.map(async (p: Record<string, unknown>) => {
        const { data: checklists } = await supabase
          .from("checklists")
          .select("*")
          .eq("project_id", p.id);

        // Resolve employee name from FK join
        const empData = p.employees as { name: string } | null;
        const assignedName = empData?.name?.split(" ")[0] || undefined;

        return {
          project_number: String(p.project_number || ""),
          name: String(p.name || ""),
          status: String(p.status || ""),
          customer_name: p.customer_name ? String(p.customer_name) : undefined,
          start_date: p.start_date ? String(p.start_date) : undefined,
          estimated_end_date: p.estimated_end_date ? String(p.estimated_end_date) : (p.start_date ? String(p.start_date) : undefined),
          end_date_defaulted: !p.estimated_end_date && !!p.start_date,
          agreed_price: p.agreed_price ? Number(p.agreed_price) : undefined,
          assigned: assignedName,
          dependency: p.dependency ? String(p.dependency) : undefined,
          checklists: checklists?.map((c: Record<string, unknown>) => ({
            name: String(c.name || ""),
            done: Number(c.done || 0),
            total: Number(c.total || 0),
            date: c.date ? String(c.date) : undefined,
          })),
        } as Project;
      })
    );
  } catch {
    return [];
  }
}

export async function fetchLiveLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("company_id", COMPANY_ID);

    if (error || !data) return [];

    return data.map((l: Record<string, unknown>) => ({
      name: String(l.name || ""),
      email: String(l.email || ""),
      phone: String(l.phone || ""),
      source: String(l.source || "other"),
      status: String(l.status || "new"),
      created_at: String(l.created_at || ""),
      followup_due_at: l.followup_due_at ? String(l.followup_due_at) : undefined,
      address: String(l.address || ""),
    })) as Lead[];
  } catch {
    return [];
  }
}

export async function fetchLiveCheckins(): Promise<Checkin[]> {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Fetch workers (checkin_enabled employees)
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, name")
      .eq("company_id", COMPANY_ID)
      .eq("checkin_enabled", true)
      .eq("is_active", true);

    if (empError || !employees) return [];

    // Fetch today's checkins
    const { data: checkins, error: ciError } = await supabase
      .from("checkins")
      .select("*")
      .eq("company_id", COMPANY_ID)
      .eq("checkin_date", today);

    const checkinRows = (!ciError && checkins) ? checkins : [];

    // Build a lookup: employee_id → checkin row
    const checkinByEmpId = new Map<string, Record<string, unknown>>();
    for (const c of checkinRows) {
      checkinByEmpId.set(String(c.employee_id), c as Record<string, unknown>);
    }

    // Fetch project names for assignments
    const assignmentNums = checkinRows
      .map((c) => c.project_assignment)
      .filter(Boolean);
    let projectsByNum = new Map<string, string>();
    if (assignmentNums.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("project_number, name")
        .eq("company_id", COMPANY_ID)
        .in("project_number", assignmentNums);
      if (projects) {
        for (const p of projects) {
          projectsByNum.set(String(p.project_number), String(p.name));
        }
      }
    }

    // One entry per worker: matched checkin or "waiting"
    return employees.map((emp: Record<string, unknown>) => {
      const firstName = String(emp.name || "").split(" ")[0];
      const c = checkinByEmpId.get(String(emp.id));
      if (c && c.responded_at) {
        const projNum = c.project_assignment ? String(c.project_assignment) : undefined;
        return {
          employee: firstName,
          status: "checked_in" as const,
          summary: c.planned_tasks ? String(c.planned_tasks) : undefined,
          time: new Date(String(c.responded_at)).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }),
          projectNumber: projNum,
          projectName: projNum ? projectsByNum.get(projNum) : undefined,
          rawResponse: c.raw_response ? String(c.raw_response) : undefined,
          estimatedCompletion: c.estimated_completion ? String(c.estimated_completion) : undefined,
        };
      }
      return {
        employee: firstName,
        status: "waiting" as const,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchLiveChecklistEntries(): Promise<ChecklistEntry[]> {
  try {
    const { data, error } = await supabase
      .from("checklists")
      .select("*")
      .eq("company_id", COMPANY_ID)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) return [];

    return data.map((c: Record<string, unknown>) => ({
      template: String(c.template || ""),
      project_number: String(c.project_number || ""),
      project_name: String(c.project_name || ""),
      status: (c.completed_at ? "completed" : "pending") as "completed" | "pending",
      done: c.done != null ? Number(c.done) : undefined,
      total: c.total != null ? Number(c.total) : undefined,
      sent_at: String(c.created_at || ""),
      completed_at: c.completed_at ? String(c.completed_at) : undefined,
    }));
  } catch {
    return [];
  }
}
