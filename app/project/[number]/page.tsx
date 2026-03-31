"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { STATUS_COLORS_SOFT, STATUS_LABELS, EMPLOYEE_COLORS } from "@/lib/types";
import type { Project } from "@/lib/types";
import { use } from "react";

const COMPANY_ID = "a12dfbf0-a9d6-4786-95fe-6f1678d9d980";

// --- Types ---

interface Subfolder {
  id: string;
  name: string;
  childCount: number;
}

interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  lastModified: string;
  webUrl: string;
  downloadUrl?: string;
}

interface ChecklistRow {
  id: string;
  template_name: string;
  submitted_by: string;
  submitted_at: string;
  pdf_url?: string;
  checklist_data: Record<string, unknown>[] | null;
}

// --- Helpers ---

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(d: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fileIcon(mimeType: string, name: string): { emoji: string; color: string } {
  if (mimeType.includes("pdf") || name.endsWith(".pdf")) return { emoji: "\uD83D\uDCC4", color: "#E53935" };
  if (mimeType.startsWith("image/")) return { emoji: "\uD83D\uDDBC\uFE0F", color: "#1D9E75" };
  if (mimeType.includes("spreadsheet") || name.endsWith(".xlsx") || name.endsWith(".xls")) return { emoji: "\uD83D\uDCC8", color: "#388E3C" };
  if (mimeType.includes("word") || name.endsWith(".docx") || name.endsWith(".doc")) return { emoji: "\uD83D\uDCC3", color: "#378ADD" };
  return { emoji: "\uD83D\uDCC1", color: "#6b7280" };
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

// --- Main Page ---

export default function ProjectPage({ params }: { params: Promise<{ number: string }> }) {
  const { number: projectNumber } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [subfolders, setSubfolders] = useState<Subfolder[]>([]);
  const [projectFolder, setProjectFolder] = useState<string>("");
  const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Fetch project from Supabase
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("projects")
        .select("*, employees!assigned_to(name)")
        .eq("company_id", COMPANY_ID)
        .eq("project_number", projectNumber)
        .single();

      if (data) {
        const empData = data.employees as { name: string } | null;
        setProject({
          project_number: String(data.project_number || ""),
          name: String(data.name || ""),
          status: String(data.status || ""),
          customer_name: data.customer_name ? String(data.customer_name) : undefined,
          start_date: data.start_date ? String(data.start_date) : undefined,
          estimated_end_date: data.estimated_end_date ? String(data.estimated_end_date) : undefined,
          agreed_price: data.agreed_price ? Number(data.agreed_price) : undefined,
          assigned: empData?.name?.split(" ")[0] || undefined,
        });
      }
      setLoadingProject(false);
    }
    load();
  }, [projectNumber]);

  // Fetch folders from Graph API
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/graph/projects/${projectNumber}/folders`);
        if (res.status === 404) {
          setFolderError("Prosjektmappe ikke funnet i OneDrive");
          setLoadingFolders(false);
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setFolderError(body.error || "Kunne ikke laste mapper");
          setLoadingFolders(false);
          return;
        }
        const data = await res.json();
        setProjectFolder(data.projectFolder);
        setSubfolders(data.subfolders || []);
        if (data.subfolders?.length > 0) {
          setActiveTab(data.subfolders[0].id);
        }
      } catch {
        setFolderError("Nettverksfeil ved lasting av mapper");
      }
      setLoadingFolders(false);
    }
    load();
  }, [projectNumber]);

  // Fetch checklists from Supabase
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("checklists")
        .select("*")
        .eq("company_id", COMPANY_ID)
        .eq("project_number", projectNumber)
        .order("submitted_at", { ascending: false });

      if (data && data.length > 0) {
        setChecklists(
          data.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            template_name: String(c.template_name || c.template || ""),
            submitted_by: String(c.submitted_by || ""),
            submitted_at: String(c.submitted_at || c.created_at || ""),
            pdf_url: c.pdf_url ? String(c.pdf_url) : undefined,
            checklist_data: c.checklist_data as Record<string, unknown>[] | null,
          }))
        );
      }
    }
    load();
  }, [projectNumber]);

  // Fetch files when active tab changes
  const loadFiles = useCallback(async (folderId: string) => {
    if (folderId === "checklists") return;
    setLoadingFiles(true);
    setFiles([]);
    try {
      const res = await fetch(`/api/graph/folders/${folderId}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch {
      // silently fail
    }
    setLoadingFiles(false);
  }, []);

  useEffect(() => {
    if (activeTab && activeTab !== "checklists") {
      loadFiles(activeTab);
    }
  }, [activeTab, loadFiles]);

  const hasChecklists = checklists.length > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20"
        style={{ backgroundColor: "var(--card-bg)", borderBottom: "1px solid var(--divider)" }}
      >
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-4">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-3"
            style={{ color: "var(--muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tilbake
          </Link>

          {loadingProject ? (
            <div className="h-8 w-48 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : project ? (
            <div>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px]" style={{ color: "var(--muted-light)" }}>
                    #{project.project_number}
                  </p>
                  <h1
                    className="text-[22px] sm:text-[26px] font-bold leading-tight"
                    style={{ color: "var(--foreground)" }}
                  >
                    {project.name}
                  </h1>
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold mt-1"
                  style={{ backgroundColor: STATUS_COLORS_SOFT[project.status] || "#eee", color: "#444" }}
                >
                  {STATUS_LABELS[project.status] || project.status}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px]" style={{ color: "var(--muted)" }}>
                {project.assigned && (
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: EMPLOYEE_COLORS[project.assigned] || "#888" }} />
                    {project.assigned}
                  </span>
                )}
                {project.customer_name && <span>Kunde: {project.customer_name}</span>}
                {project.start_date && <span>Start: {formatDate(project.start_date)}</span>}
                {project.estimated_end_date && (
                  <span>Slutt: {project.end_date_defaulted ? "Ikke estimert" : formatDate(project.estimated_end_date)}</span>
                )}
                {project.agreed_price != null && <span>Pris: {formatPrice(project.agreed_price)}</span>}
              </div>
            </div>
          ) : (
            <h1 className="text-[22px] font-bold" style={{ color: "var(--foreground)" }}>
              Prosjekt #{projectNumber}
            </h1>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-6">
        {/* Folder info */}
        {projectFolder && (
          <p className="text-[12px] mb-4" style={{ color: "var(--muted-light)" }}>
            OneDrive: {projectFolder}
          </p>
        )}

        {/* Tab bar */}
        {loadingFolders ? (
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-24 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : folderError && subfolders.length === 0 && !hasChecklists ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <p className="text-[14px] font-medium" style={{ color: "var(--foreground)" }}>
              {folderError}
            </p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--muted-light)" }}>
              Sjekk at prosjektmappen finnes under /2024/Prosjekter/ i OneDrive
            </p>
          </div>
        ) : (
          <>
            {/* Scrollable tabs */}
            <div
              className="flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-4 px-4 sm:-mx-6 sm:px-6"
              style={{ scrollbarWidth: "none" }}
            >
              {subfolders.map((sf) => (
                <button
                  key={sf.id}
                  onClick={() => setActiveTab(sf.id)}
                  className="shrink-0 rounded-lg px-4 font-medium transition-colors cursor-pointer"
                  style={{
                    height: 44,
                    fontSize: 13,
                    backgroundColor: activeTab === sf.id ? "var(--foreground)" : "var(--surface)",
                    color: activeTab === sf.id ? "var(--background)" : "var(--muted)",
                    border: activeTab === sf.id ? "none" : "1px solid var(--card-border)",
                  }}
                >
                  {sf.name}
                  {sf.childCount > 0 && (
                    <span className="ml-1.5 opacity-60">({sf.childCount})</span>
                  )}
                </button>
              ))}
              {hasChecklists && (
                <button
                  onClick={() => setActiveTab("checklists")}
                  className="shrink-0 rounded-lg px-4 font-medium transition-colors cursor-pointer"
                  style={{
                    height: 44,
                    fontSize: 13,
                    backgroundColor: activeTab === "checklists" ? "var(--foreground)" : "var(--surface)",
                    color: activeTab === "checklists" ? "var(--background)" : "var(--muted)",
                    border: activeTab === "checklists" ? "none" : "1px solid var(--card-border)",
                  }}
                >
                  Sjekklister ({checklists.length})
                </button>
              )}
            </div>

            {/* Tab content */}
            {activeTab === "checklists" ? (
              <ChecklistsView checklists={checklists} />
            ) : activeTab ? (
              <FilesView files={files} loading={loadingFiles} />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

// --- Files View ---

function FilesView({ files, loading }: { files: DriveFile[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <p className="text-[14px] font-medium" style={{ color: "var(--muted-light)" }}>
          Ingen filer i denne mappen
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      {files.map((file, i) => {
        const icon = fileIcon(file.mimeType, file.name);
        const href = file.downloadUrl || `/api/graph/files/${file.id}/content`;
        const isImage = file.mimeType.startsWith("image/");
        const isPdf = file.mimeType.includes("pdf") || file.name.endsWith(".pdf");

        return (
          <a
            key={file.id}
            href={href}
            target={isPdf ? "_blank" : undefined}
            rel={isPdf ? "noopener noreferrer" : undefined}
            download={!isPdf && !isImage ? file.name : undefined}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)]"
            style={{
              borderBottom: i < files.length - 1 ? "1px solid var(--divider)" : undefined,
              minHeight: 56,
            }}
          >
            <span className="text-[20px] shrink-0" style={{ color: icon.color }}>
              {icon.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-medium truncate"
                style={{ color: "var(--foreground)" }}
              >
                {file.name}
              </p>
              <p className="text-[11px]" style={{ color: "var(--muted-light)" }}>
                {formatBytes(file.size)}
                {file.lastModified && ` \u00B7 ${formatDate(file.lastModified)}`}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" style={{ color: "var(--muted-light)" }}>
              <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        );
      })}
    </div>
  );
}

// --- Checklists View ---

function ChecklistsView({ checklists }: { checklists: ChecklistRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (checklists.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <p className="text-[14px] font-medium" style={{ color: "var(--muted-light)" }}>
          Ingen sjekklister for dette prosjektet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {checklists.map((cl) => {
        const items = Array.isArray(cl.checklist_data) ? cl.checklist_data : [];
        const allOk = items.length > 0 && items.every((item) => item.ok === true || item.status === "ok" || item.passed === true);
        const isExpanded = expandedId === cl.id;

        return (
          <div
            key={cl.id}
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : cl.id)}
              className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left"
              style={{ minHeight: 56 }}
            >
              {/* Pass/fail indicator */}
              {items.length > 0 ? (
                allOk ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
                    <circle cx="10" cy="10" r="9" fill="#22c55e" />
                    <path d="M6,10 L9,13 L14,7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
                    <circle cx="10" cy="10" r="9" fill="#E5A940" />
                    <text x="10" y="14" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">!</text>
                  </svg>
                )
              ) : (
                <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: "var(--muted-light)", opacity: 0.3 }} />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                  {cl.template_name}
                </p>
                <p className="text-[11px]" style={{ color: "var(--muted-light)" }}>
                  {cl.submitted_by && `${cl.submitted_by} \u00B7 `}
                  {formatDate(cl.submitted_at)}
                </p>
              </div>

              {cl.pdf_url && (
                <a
                  href={cl.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-[11px] font-medium px-2 py-1 rounded"
                  style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}
                >
                  PDF
                </a>
              )}

              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0 transition-transform"
                style={{ color: "var(--muted-light)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Expanded items */}
            {isExpanded && items.length > 0 && (
              <div className="px-4 pb-3" style={{ borderTop: "1px solid var(--divider)" }}>
                {items.map((item, idx) => {
                  const label = String(item.label || item.name || item.question || `Punkt ${idx + 1}`);
                  const ok = item.ok === true || item.status === "ok" || item.passed === true;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 py-1.5"
                    >
                      {ok ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
                          <circle cx="7" cy="7" r="6" fill="#22c55e" />
                          <path d="M4,7 L6,9.5 L10,4.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
                          <circle cx="7" cy="7" r="6" fill="#E5A940" />
                          <text x="7" y="11" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">!</text>
                        </svg>
                      )}
                      <span
                        className="text-[12px]"
                        style={{ color: ok ? "var(--muted)" : "var(--foreground)" }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
