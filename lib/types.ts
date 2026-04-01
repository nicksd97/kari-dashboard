export interface Checklist {
  name: string;
  done: number;
  total: number;
  date?: string;
}

export interface Project {
  project_number: string;
  name: string;
  status: string;
  customer_name?: string;
  start_date?: string;
  estimated_end_date?: string;
  end_date_defaulted?: boolean;
  agreed_price?: number;
  assigned?: string;
  dependency?: string;
  checklists?: Checklist[];
}

export interface Checkin {
  employee: string;
  status: "checked_in" | "waiting" | "off";
  summary?: string;
  time?: string;
  label?: string;
  projectNumber?: string;
  projectName?: string;
  rawResponse?: string;
  estimatedCompletion?: string;
}

export interface ChecklistEntry {
  template: string;
  project_number: string;
  project_name: string;
  status: "overdue" | "pending" | "completed";
  done?: number;
  total?: number;
  sent_at: string;
  completed_at?: string;
}

export interface Lead {
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  created_at: string;
  followup_due_at?: string;
  address: string;
}

export interface EmployeeScore {
  employee: string;
  checkinCount: number;
  missedCheckins: number;
  checklistOnTime: number;
  checklistLate: number;
  missedChecklists: number;
  deviationsReported: number;
  deviationsResponsible: number;
  deviationsResolved: number;
  deviationReporterPts: number;
  deviationResponsiblePts: number;
  deviationResolutionPts: number;
  total: number;
}

// Slightly more saturated bar colors
export const STATUS_COLORS: Record<string, string> = {
  innkommende: "#9CC8F0",
  planlegging: "#B8B4F0",
  materialer: "#F5B84D",
  pagaende: "#6DD4B1",
  "venter kunde": "#F0A893",
  fakturering: "#EEA4BC",
  ferdig: "#A8D175",
};

// Softer badge/card colors
export const STATUS_COLORS_SOFT: Record<string, string> = {
  innkommende: "#B5D4F4",
  planlegging: "#CECBF6",
  materialer: "#FAC775",
  pagaende: "#9FE1CB",
  "venter kunde": "#F5C4B3",
  fakturering: "#F4C0D1",
  ferdig: "#C0DD97",
};

export const STATUS_LABELS: Record<string, string> = {
  innkommende: "Innkommende",
  planlegging: "Planlegging",
  materialer: "Materialer",
  pagaende: "Pågående",
  "venter kunde": "Venter kunde",
  fakturering: "Fakturering",
  ferdig: "Ferdig",
};

export const EMPLOYEE_COLORS: Record<string, string> = {
  Roar: "#378ADD",
  Andrii: "#1D9E75",
  Marci: "#D85A30",
};

export const SOURCE_COLORS: Record<string, string> = {
  byggmann: "#1D9E75",
  minihusmidtnorge: "#378ADD",
  billigtak: "#D85A30",
  email: "#888780",
  other: "#888780",
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Ny",
  contacted: "Kontaktet",
  befaring: "Befaring",
  followup_pending: "Oppfølging",
  qualified: "Kvalifisert",
  converted: "Konvertert",
  lost: "Tapt",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "#B5D4F4",
  contacted: "#CECBF6",
  befaring: "#F5A623",
  followup_pending: "#FAC775",
  qualified: "#9FE1CB",
  converted: "#C0DD97",
  lost: "#F5C4B3",
};
