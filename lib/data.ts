import { supabase } from "./supabase";
import type { Project, Lead, Checkin, ChecklistEntry, EmployeeScore, Deviation, TimelineEntry, MessageFeedEntry } from "./types";

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

const DEMO_DEVIATIONS: Deviation[] = [
  { id: "demo-1", project_number: "767", description: "Ikke vibrert ved utstøping", location: "Grunnmur", severity: "medium", status: "assigned", reported_by_name: "Nick Davidson", responsible_name: "Marci Marschall", resolution_deadline: "2026-04-04T12:00:00+00:00", created_at: "2026-04-01T12:00:00+00:00" },
  { id: "demo-2", project_number: "810", description: "Avvik ved utførelse av vindskier — krever omarbeiding til 90° avslutning", location: "Tak", severity: "high", status: "assigned", reported_by_name: "Nick Davidson", responsible_name: "Roar Aursøy", resolution_deadline: "2026-04-13T08:00:00+00:00", created_at: "2026-04-10T08:00:00+00:00" },
  { id: "demo-3", project_number: "767", description: "Betong tørket for fort", location: "Fundament", severity: "low", status: "resolved", reported_by_name: "Nick Davidson", responsible_name: "Marci Marschall", resolved_by_name: "Marci Marschall", resolved_at: "2026-04-03T15:00:00+00:00", created_at: "2026-04-01T13:00:00+00:00" },
];

const DEMO_MESSAGE_FEED: MessageFeedEntry[] = [
  { id: "demo-msg-1", type: "checkin", employee_name: "Roar", project_number: "802", project_name: "Vika Hustad Isolasjon", extra_info: "Planlagt: Vika Hustad - Isolasjon", description: "Jobber med isolasjon i dag, ferdig med vegger, starter tak etter lunsj", timestamp: "2026-04-13T07:14:00+00:00" },
  { id: "demo-dev-1", type: "deviation", employee_name: "Nick", project_number: "767", project_name: "Stavnevegen 31", description: "Ikke vibrert ved utstøping (Grunnmur)", extra_info: "Ansvarlig: Marci Marschall", status: "assigned", timestamp: "2026-04-12T10:00:00+00:00" },
  { id: "demo-cl-1", type: "checklist", employee_name: "System", project_number: "815", project_name: "Jan Erik Peis", description: "Sjekkliste: Ferdigstillelse", status: "Fullført", extra_info: "12/12 punkter", timestamp: "2026-04-11T14:30:00+00:00" },
  { id: "demo-msg-2", type: "checkin", employee_name: "Andrii", project_number: "767", project_name: "Stavnevegen 31", extra_info: "Planlagt: Stavnevegen 31", description: "Fortsetter med kjøkkenmontering, venter på benkeplate", timestamp: "2026-04-10T06:45:00+00:00" },
  { id: "demo-msg-3", type: "checkin", employee_name: "Marci", project_number: "810", project_name: "Byåsen Betong", extra_info: "Planlagt: Byåsen Betong - Ferdigstillelse", description: "Rydder byggeplass og tar siste sjekk før overlevering", timestamp: "2026-04-12T06:30:00+00:00" },
];

export function getDemoData() {
  return {
    projects: DEMO_PROJECTS,
    leads: DEMO_LEADS,
    checkins: DEMO_CHECKINS,
    checklistEntries: DEMO_CHECKLIST_ENTRIES,
    deviations: DEMO_DEVIATIONS,
    messageFeed: DEMO_MESSAGE_FEED,
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

    // Fetch all checkins to extend bar dates based on actual work
    const { data: allCheckins } = await supabase
      .from("checkins")
      .select("checkin_date, project_assignment")
      .eq("company_id", COMPANY_ID)
      .eq("status", "responded");

    // Build a map: project_number → { minDate, maxDate } from checkins
    const checkinDates = new Map<string, { min: string; max: string }>();
    for (const ci of (allCheckins || [])) {
      const pa = String(ci.project_assignment || "");
      // project_assignment can be "732" or "732 - Name" or "732 Name"
      const pn = pa.split(/[\s-]/)[0];
      if (!pn) continue;
      const d = String(ci.checkin_date);
      const existing = checkinDates.get(pn);
      if (existing) {
        if (d < existing.min) existing.min = d;
        if (d > existing.max) existing.max = d;
      } else {
        checkinDates.set(pn, { min: d, max: d });
      }
    }

    return await Promise.all(
      data.map(async (p: Record<string, unknown>) => {
        const { data: checklists } = await supabase
          .from("checklists")
          .select("*")
          .eq("project_id", p.id);

        const empData = p.employees as { name: string } | null;
        const assignedName = empData?.name?.split(" ")[0] || undefined;
        const pn = String(p.project_number || "");

        // Extend dates using checkin history
        let startDate = p.start_date ? String(p.start_date) : undefined;
        let endDate = p.estimated_end_date ? String(p.estimated_end_date) : undefined;
        const ciDates = checkinDates.get(pn);

        if (ciDates) {
          if (!startDate || ciDates.min < startDate) startDate = ciDates.min;
          if (!endDate || ciDates.max > endDate) endDate = ciDates.max;
        }

        // Default end to start if still missing
        if (!endDate && startDate) endDate = startDate;

        return {
          project_number: pn,
          name: String(p.name || ""),
          status: String(p.status || ""),
          customer_name: p.customer_name ? String(p.customer_name) : undefined,
          start_date: startDate,
          estimated_end_date: endDate,
          end_date_defaulted: !p.estimated_end_date && !ciDates && !!p.start_date,
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
      .select("employee_id, status, responded_at, project_assignment, planned_tasks, raw_response, estimated_completion")
      .eq("company_id", COMPANY_ID)
      .eq("checkin_date", today);

    const checkinRows = (!ciError && checkins) ? checkins : [];

    // Build a lookup: employee_id → checkin row
    const checkinByEmpId = new Map<string, Record<string, unknown>>();
    for (const c of checkinRows) {
      checkinByEmpId.set(String(c.employee_id), c as Record<string, unknown>);
    }

    // Extract leading project number from assignment string ("767, 803" → "767", "810 - Nilsbu" → "810")
    const extractProjNum = (pa: unknown): string | undefined => {
      const m = String(pa || "").match(/^(\d+)/);
      return m ? m[1] : undefined;
    };
    const assignmentNums = Array.from(new Set(
      checkinRows.map((c) => extractProjNum(c.project_assignment)).filter((n): n is string => !!n)
    ));
    
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
      if (c && c.status === "responded") {
        const projNum = extractProjNum(c.project_assignment);
        return {
          employee: firstName,
          status: "checked_in" as const,
          summary: c.planned_tasks ? String(c.planned_tasks) : undefined,
          time: c.responded_at ? new Date(String(c.responded_at)).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }) : undefined,
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

const DEMO_SCORES: EmployeeScore[] = [
  { employee: "Marci", checkinCount: 7, missedCheckins: 0, checklistOnTime: 1, checklistLate: 0, missedChecklists: 0, deviationsReported: 1, deviationsResponsible: 0, deviationsResolved: 1, deviationReporterPts: 5, deviationResponsiblePts: 0, deviationResolutionPts: 5, total: 55 },
  { employee: "Andrii", checkinCount: 6, missedCheckins: 1, checklistOnTime: 0, checklistLate: 0, missedChecklists: 0, deviationsReported: 0, deviationsResponsible: 1, deviationsResolved: 0, deviationReporterPts: 0, deviationResponsiblePts: -10, deviationResolutionPts: 0, total: 17 },
  { employee: "Roar", checkinCount: 3, missedCheckins: 4, checklistOnTime: 0, checklistLate: 0, missedChecklists: 0, deviationsReported: 0, deviationsResponsible: 0, deviationsResolved: 0, deviationReporterPts: 0, deviationResponsiblePts: 0, deviationResolutionPts: 0, total: 3 },
];

export function getDemoScores(): EmployeeScore[] {
  return DEMO_SCORES;
}

export async function fetchLiveScores(): Promise<EmployeeScore[]> {
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    const monthStart = `${y}-${m}-01`;
    const monthEnd = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    const todayStr = `${y}-${m}-${String(now.getDate()).padStart(2, "0")}`;

    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, name")
      .eq("company_id", COMPANY_ID)
      .eq("checkin_enabled", true)
      .eq("is_active", true);

    if (empErr || !employees || employees.length === 0) return [];

    // Fetch all checkins for the month (both responded and not)
    const { data: checkins } = await supabase
      .from("checkins")
      .select("employee_id, checkin_date, responded_at, status")
      .eq("company_id", COMPANY_ID)
      .gte("checkin_date", monthStart)
      .lte("checkin_date", monthEnd);

    // Fetch checklists for the month
    const { data: checklists } = await supabase
      .from("checklists")
      .select("*")
      .eq("company_id", COMPANY_ID)
      .gte("created_at", monthStart + "T00:00:00")
      .lte("created_at", monthEnd + "T23:59:59");

    // Fetch deviations for the month
    const { data: deviations } = await supabase
      .from("deviations")
      .select("reported_by, responsible_id, resolved_by, reporter_points, responsible_points, resolution_points, created_at")
      .eq("company_id", COMPANY_ID)
      .gte("created_at", monthStart + "T00:00:00")
      .lte("created_at", monthEnd + "T23:59:59");

    const ciRows = checkins || [];
    const clRows = (checklists || []) as Record<string, unknown>[];
    const devRows = (deviations || []) as Record<string, unknown>[];

    // Count weekdays from month start up to and including today
    const weekdaysInMonth = countWeekdays(monthStart, todayStr);

    const scores: EmployeeScore[] = employees.map((emp: Record<string, unknown>) => {
      const firstName = String(emp.name || "").split(" ")[0];
      const empId = String(emp.id);

      // Check-ins: +5 per responded day
      const respondedCheckins = ciRows.filter((c) => String(c.employee_id) === empId && c.status === "responded");
      const checkinCount = respondedCheckins.length;

      // Missed check-ins: weekdays with no response = -3 each
      const checkinDates = new Set(respondedCheckins.map((c) => String(c.checkin_date)));
      const missedCheckins = Math.max(0, weekdaysInMonth - checkinDates.size);

      // Checklists assigned to this employee
      const empChecklists = clRows.filter((c) => String(c.completed_by || c.assigned_to || c.employee_id) === empId);
      let checklistOnTime = 0;
      let checklistLate = 0;
      let missedChecklists = 0;

      for (const cl of empChecklists) {
        const completedAt = cl.completed_at ? String(cl.completed_at) : null;
        const createdAt = cl.created_at ? String(cl.created_at) : null;

        if (completedAt) {
          // Completed — check if on time (within 3 days of creation)
          if (createdAt) {
            const daysDiff = Math.round((new Date(completedAt).getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 3) {
              checklistOnTime++;
            } else {
              checklistLate++;
            }
          } else {
            checklistOnTime++;
          }
        } else if (createdAt) {
          // Not completed — check if overdue (>3 days since creation)
          const daysSinceCreated = Math.round((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceCreated > 3) {
            missedChecklists++;
          }
        }
      }

      // Deviations
      const reported = devRows.filter((d) => String(d.reported_by) === empId);
      const responsible = devRows.filter((d) => String(d.responsible_id) === empId);
      const resolved = devRows.filter((d) => String(d.resolved_by) === empId);

      const deviationReporterPts = reported.reduce((sum, d) => sum + (Number(d.reporter_points) || 0), 0);
      const deviationResponsiblePts = responsible.reduce((sum, d) => sum + (Number(d.responsible_points) || 0), 0);
      const deviationResolutionPts = resolved.reduce((sum, d) => sum + (Number(d.resolution_points) || 0), 0);

      const total = (checkinCount * 5) + (checklistOnTime * 10) + (checklistLate * 5) + (missedCheckins * -3) + (missedChecklists * -5) + deviationReporterPts + deviationResponsiblePts + deviationResolutionPts;
      return {
        employee: firstName, checkinCount, missedCheckins, checklistOnTime, checklistLate, missedChecklists,
        deviationsReported: reported.length, deviationsResponsible: responsible.length, deviationsResolved: resolved.length,
        deviationReporterPts, deviationResponsiblePts, deviationResolutionPts, total,
      };
    });

    return scores.sort((a, b) => b.total - a.total);
  } catch (e) {
    console.error("[fetchLiveScores] error:", e);
    return [];
  }
}

export async function fetchLiveDeviations(): Promise<Deviation[]> {
  try {
    const { data, error } = await supabase
      .from("deviations")
      .select("id, project_number, description, location, severity, status, reported_by_name, responsible_name, resolved_by, resolution_deadline, resolved_at, created_at")
      .eq("company_id", COMPANY_ID);

    if (error || !data) return [];

    // Resolve resolved_by → employee name (only for resolved rows)
    const resolverIds = Array.from(
      new Set(
        data
          .filter((d) => d.resolved_by)
          .map((d) => String(d.resolved_by))
      )
    );
    const resolverNames = new Map<string, string>();
    if (resolverIds.length > 0) {
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name")
        .in("id", resolverIds);
      if (emps) {
        for (const e of emps) {
          resolverNames.set(String(e.id), String(e.name));
        }
      }
    }

    return data.map((d: Record<string, unknown>) => ({
      id: String(d.id || ""),
      project_number: String(d.project_number || ""),
      description: String(d.description || ""),
      location: d.location ? String(d.location) : undefined,
      severity: String(d.severity || "medium"),
      status: String(d.status || ""),
      reported_by_name: d.reported_by_name ? String(d.reported_by_name) : undefined,
      responsible_name: d.responsible_name ? String(d.responsible_name) : undefined,
      resolved_by_name: d.resolved_by ? resolverNames.get(String(d.resolved_by)) : undefined,
      resolution_deadline: d.resolution_deadline ? String(d.resolution_deadline) : undefined,
      resolved_at: d.resolved_at ? String(d.resolved_at) : undefined,
      created_at: String(d.created_at || ""),
    })) as Deviation[];
  } catch {
    return [];
  }
}

export async function fetchTimelineData(): Promise<TimelineEntry[]> {
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    const monthStart = `${y}-${m}-01`;
    const monthEnd = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

    // Fetch all checkins for the current month that have been responded to
    const { data: checkins, error: ciError } = await supabase
      .from("checkins")
      .select("employee_id, project_assignment, checkin_date")
      .eq("company_id", COMPANY_ID)
      .eq("status", "responded")
      .gte("checkin_date", monthStart)
      .lte("checkin_date", monthEnd);

    if (ciError || !checkins || checkins.length === 0) return [];

    // Get unique employee IDs and project numbers
    const employeeIds = Array.from(new Set(checkins.map((c) => String(c.employee_id))));
    const projectNumbers = Array.from(
      new Set(
        checkins
          .map((c) => String(c.project_assignment || "").split(/[\s-]/)[0])
          .filter((n) => /^[0-9]{3}$/.test(n))
      )
    );

    // Fetch employee names
    const { data: employees } = await supabase
      .from("employees")
      .select("id, name")
      .in("id", employeeIds);

    const empNames = new Map<string, string>();
    for (const e of employees || []) {
      empNames.set(String(e.id), String(e.name).split(" ")[0]);
    }

    // Fetch project names
    const { data: projects } = await supabase
      .from("projects")
      .select("project_number, name")
      .eq("company_id", COMPANY_ID)
      .in("project_number", projectNumbers);

    const projNames = new Map<string, string>();
    for (const p of projects || []) {
      projNames.set(String(p.project_number), String(p.name));
    }

    // Group: employee_id → project_number → dates[]
    const grouped = new Map<string, Map<string, string[]>>();
    for (const c of checkins) {
      const empId = String(c.employee_id);
      const rawAssignment = String(c.project_assignment || "");
      const projNum = rawAssignment.split(/[\s-]/)[0];
      if (!projNum || !/^[0-9]{3}$/.test(projNum)) continue;

      if (!grouped.has(empId)) grouped.set(empId, new Map());
      const empMap = grouped.get(empId)!;
      if (!empMap.has(projNum)) empMap.set(projNum, []);
      empMap.get(projNum)!.push(String(c.checkin_date));
    }

    // Build TimelineEntry[]
    const entries: TimelineEntry[] = [];
    for (const [empId, projMap] of grouped) {
      for (const [projNum, dates] of projMap) {
        const sorted = dates.sort();
        entries.push({
          employeeId: empId,
          employeeName: empNames.get(empId) || empId,
          projectNumber: projNum,
          projectName: projNames.get(projNum) || projNum,
          dates: sorted,
          startDate: sorted[0],
          endDate: sorted[sorted.length - 1],
        });
      }
    }

    return entries;
  } catch {
    return [];
  }
}

function countWeekdays(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function fetchLiveMessageFeed(): Promise<MessageFeedEntry[]> {
  try {
    const [{ data: checkins }, { data: deviations }, { data: checklists }] = await Promise.all([
      supabase
        .from("checkins")
        .select("id, employee_id, project_assignment, planned_tasks, raw_response, responded_at")
        .eq("company_id", COMPANY_ID)
        .eq("status", "responded")
        .not("responded_at", "is", null)
        .order("responded_at", { ascending: false })
        .limit(30),
      supabase
        .from("deviations")
        .select("id, project_number, description, location, severity, status, reported_by_name, responsible_name, created_at")
        .eq("company_id", COMPANY_ID)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("checklists")
        .select("id, template, project_number, project_name, status, completed_at, created_at, done, total")
        .eq("company_id", COMPANY_ID)
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

    const entries: MessageFeedEntry[] = [];

    // Get unique employee IDs
    const empIds = Array.from(new Set((checkins || []).map((c) => String(c.employee_id))));
    const { data: employees } = await supabase
      .from("employees")
      .select("id, name")
      .in("id", empIds);

    const empNames = new Map<string, string>();
    for (const e of employees || []) {
      empNames.set(String(e.id), String(e.name).split(" ")[0]);
    }

    // Extract leading project number from assignment string
    const extractProjNum = (pa: unknown): string | undefined => {
      const m = String(pa || "").match(/^(\d+)/);
      return m ? m[1] : undefined;
    };

    const assignmentNums = Array.from(
      new Set((checkins || []).map((c) => extractProjNum(c.project_assignment)).filter((n): n is string => !!n))
    );

    const projNames = new Map<string, string>();
    if (assignmentNums.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("project_number, name")
        .eq("company_id", COMPANY_ID)
        .in("project_number", assignmentNums);
      if (projects) {
        for (const p of projects) {
          projNames.set(String(p.project_number), String(p.name));
        }
      }
    }

    // Process checkins
    for (const c of checkins || []) {
      const projNum = extractProjNum(c.project_assignment);
      entries.push({
        id: `ci-${c.id}`,
        type: "checkin",
        timestamp: String(c.responded_at || ""),
        employee_name: empNames.get(String(c.employee_id)) || "Ukjent",
        project_number: projNum,
        project_name: projNum ? projNames.get(projNum) : undefined,
        description: c.raw_response ? String(c.raw_response) : "Sjekket inn",
        extra_info: c.planned_tasks ? `Planlagt: ${c.planned_tasks}` : undefined,
      });
    }

    // Process deviations
    for (const d of deviations || []) {
      entries.push({
        id: `dev-${d.id}`,
        type: "deviation",
        timestamp: String(d.created_at || ""),
        employee_name: d.reported_by_name ? String(d.reported_by_name).split(" ")[0] : "Ukjent",
        project_number: String(d.project_number || ""),
        project_name: undefined,
        description: `${d.description}${d.location ? ` (${d.location})` : ""}`,
        status: String(d.status || ""),
        extra_info: d.responsible_name ? `Ansvarlig: ${d.responsible_name}` : undefined,
      });
    }

    // Process checklists
    for (const cl of checklists || []) {
      const isCompleted = cl.completed_at ? true : false;
      entries.push({
        id: `cl-${cl.id || Math.random()}`,
        type: "checklist",
        timestamp: String(cl.created_at || ""),
        employee_name: "System",
        project_number: String(cl.project_number || ""),
        project_name: cl.project_name ? String(cl.project_name) : undefined,
        description: `Sjekkliste: ${cl.template}`,
        status: isCompleted ? "Fullført" : "Sendt",
        extra_info: cl.done != null && cl.total != null ? `${cl.done}/${cl.total} punkter` : undefined,
      });
    }

    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return entries.slice(0, 50);
  } catch {
    return [];
  }
}
