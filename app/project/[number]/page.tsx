import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import ProjectClientView from "./ProjectClientView";

const COMPANY_ID = "a12dfbf0-a9d6-4786-95fe-6f1678d9d980";

export default async function ProjectPage({ params }: { params: Promise<{ number: string }> }) {
  const { number: projectNumber } = await params;

  // Run all 3 queries in parallel
  const [projectRes, checklistsRes, deviationsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*, employees!assigned_to(name)")
      .eq("company_id", COMPANY_ID)
      .eq("project_number", projectNumber)
      .single(),
    supabase
      .from("checklists")
      .select("*")
      .eq("company_id", COMPANY_ID)
      .eq("project_number", projectNumber)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("deviations")
      .select("*, reporter:reported_by(name), responsible:responsible_id(name)")
      .eq("company_id", COMPANY_ID)
      .eq("project_number", projectNumber)
      .order("created_at", { ascending: false }),
  ]);

  const data = projectRes.data;
  let project = null;
  if (data) {
    const empData = data.employees as { name: string } | null;
    project = {
      project_number: String(data.project_number || ""),
      name: String(data.name || ""),
      status: String(data.status || ""),
      customer_name: data.customer_name ? String(data.customer_name) : undefined,
      start_date: data.start_date ? String(data.start_date) : undefined,
      estimated_end_date: data.estimated_end_date ? String(data.estimated_end_date) : undefined,
      agreed_price: data.agreed_price ? Number(data.agreed_price) : undefined,
      assigned: empData?.name?.split(" ")[0] || undefined,
    };
  }

  const checklistsData = checklistsRes.data || [];
  const checklists = checklistsData.map((c: any) => ({
    id: String(c.id),
    template_name: String(c.template_name || c.template || ""),
    submitted_by: String(c.submitted_by || ""),
    submitted_at: String(c.submitted_at || c.created_at || ""),
    pdf_url: c.pdf_url ? String(c.pdf_url) : undefined,
    checklist_data: c.checklist_data as Record<string, unknown>[] | null,
  }));

  const deviationsData = deviationsRes.data || [];
  const deviations = deviationsData.map((d: any) => ({
    id: String(d.id),
    description: String(d.description || ""),
    severity: String(d.severity || "medium"),
    status: String(d.status || "open"),
    reported_by_name: (d.reporter as { name: string } | null)?.name?.split(" ")[0] || "",
    responsible_name: (d.responsible as { name: string } | null)?.name?.split(" ")[0] || "",
    resolution_deadline: d.resolution_deadline ? String(d.resolution_deadline) : null,
    resolution_description: d.resolution_description ? String(d.resolution_description) : null,
    resolved_at: d.resolved_at ? String(d.resolved_at) : null,
    created_at: String(d.created_at || ""),
  }));

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" /></div>}>
      <ProjectClientView 
        projectNumber={projectNumber}
        initialProject={project}
        initialChecklists={checklists}
        initialDeviations={deviations}
      />
    </Suspense>
  );
}
