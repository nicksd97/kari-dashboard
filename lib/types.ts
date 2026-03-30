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
  agreed_price?: number;
  assigned?: string;
  dependency?: string;
  checklists?: Checklist[];
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

export const STATUS_COLORS: Record<string, string> = {
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
  followup_pending: "Oppfølging",
  qualified: "Kvalifisert",
  converted: "Konvertert",
  lost: "Tapt",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "#B5D4F4",
  contacted: "#CECBF6",
  followup_pending: "#FAC775",
  qualified: "#9FE1CB",
  converted: "#C0DD97",
  lost: "#F5C4B3",
};
