import { supabase } from "./supabase";
import type { Project, Lead } from "./types";

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
          estimated_end_date: p.estimated_end_date ? String(p.estimated_end_date) : undefined,
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
