export interface Project {
  project_number: string;
  name: string;
  status: string;
  customer_name?: string;
  address?: string;
  start_date?: string;
  estimated_end_date?: string;
  end_date_defaulted?: boolean;
  agreed_price?: number;
  assigned_employees?: string[];
  customer_email?: string;
  customer_phone?: string;
  dependency?: string;
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

// Slightly more saturated bar colors
export const STATUS_COLORS: Record<string, string> = {
  befart: "#9CC8F0",
  "tilbud sendt": "#B8B4F0",
  vunnet: "#6DD4B1",
  tapt: "#F0A893",
  "pågår": "#F5B84D",
  ferdig: "#A8D175",
};

// Softer badge/card colors
export const STATUS_COLORS_SOFT: Record<string, string> = {
  befart: "#B5D4F4",
  "tilbud sendt": "#CECBF6",
  vunnet: "#9FE1CB",
  tapt: "#F5C4B3",
  "pågår": "#FAC775",
  ferdig: "#C0DD97",
};

export const STATUS_LABELS: Record<string, string> = {
  befart: "Befart",
  "tilbud sendt": "Tilbud sendt",
  vunnet: "Vunnet",
  tapt: "Tapt",
  "pågår": "Pågår",
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

export interface TimelineEntry {
  employeeId: string;
  employeeName: string;
  projectNumber: string;
  projectName: string;
  dates: string[];
  startDate: string;
  endDate: string;
}

export interface MessageFeedEntry {
  id: string;
  type: "checkin" | "deviation" | "message";
  timestamp: string;
  employee_name: string;
  project_number?: string;
  project_name?: string;
  description: string;
  extra_info?: string;
  status?: string;
}

export interface Deviation {
  id: string;
  project_number: string;
  description: string;
  location?: string;
  severity: "low" | "medium" | "high" | string;
  status: string;
  reported_by_name?: string;
  responsible_name?: string;
  resolved_by_name?: string;
  resolution_deadline?: string;
  resolved_at?: string;
  created_at: string;
}

export const SEVERITY_LABELS: Record<string, string> = {
  low: "Lav",
  medium: "Medium",
  high: "Høy",
};

export const SEVERITY_COLORS: Record<string, { bg: string; fg: string }> = {
  low: { bg: "#C0DD97", fg: "#3a5a1a" },
  medium: { bg: "#FAC775", fg: "#7a4a00" },
  high: { bg: "#F5C4B3", fg: "#8a1a00" },
};
