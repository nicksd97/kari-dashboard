"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { STATUS_COLORS_SOFT, STATUS_LABELS, EMPLOYEE_COLORS } from "@/lib/types";
import type { Project } from "@/lib/types";

const COMPANY_ID = "a12dfbf0-a9d6-4786-95fe-6f1678d9d980";

// --- Types ---

interface Subfolder {
  id: string;
  name: string;
  childCount: number;
}

interface DriveFile {
  type: "file";
  id: string;
  name: string;
  size: number;
  mimeType: string;
  lastModified: string;
  webUrl: string;
  downloadUrl?: string;
}

interface DriveFolder {
  type: "folder";
  id: string;
  name: string;
  childCount: number;
}

type DriveItem = DriveFile | DriveFolder;

interface DeviationRow {
  id: string;
  description: string;
  severity: string;
  status: string;
  reported_by_name: string;
  responsible_name: string;
  resolution_deadline: string | null;
  resolution_description: string | null;
  resolved_at: string | null;
  created_at: string;
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
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function fileIcon(mimeType: string, name: string): { emoji: string; color: string } {
  if (mimeType.includes("pdf") || name.endsWith(".pdf")) return { emoji: "\uD83D\uDCC4", color: "#E53935" };
  if (mimeType.startsWith("image/")) return { emoji: "\uD83D\uDDBC\uFE0F", color: "#1D9E75" };
  if (mimeType.includes("spreadsheet") || name.endsWith(".xlsx") || name.endsWith(".xls")) return { emoji: "\uD83D\uDCC8", color: "#388E3C" };
  if (mimeType.includes("word") || name.endsWith(".docx") || name.endsWith(".doc")) return { emoji: "\uD83D\uDCC3", color: "#378ADD" };
  return { emoji: "\uD83D\uDCC1", color: "#6b7280" };
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(n);
}

function isPdf(mimeType: string, name: string): boolean {
  return mimeType.includes("pdf") || name.endsWith(".pdf");
}

// --- Main Page ---

export default function ProjectPage({ params }: { params: Promise<{ number: string }> }) {
  const { number: projectNumber } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [subfolders, setSubfolders] = useState<Subfolder[]>([]);
  const [projectFolder, setProjectFolder] = useState<string>("");
  const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [deviations, setDeviations] = useState<DeviationRow[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [folderError, setFolderError] = useState<string | null>(null);

  // PDF viewer state
  const [pdfFile, setPdfFile] = useState<DriveFile | null>(null);

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
        if (res.status === 404) { setFolderError("Prosjektmappe ikke funnet i OneDrive"); setLoadingFolders(false); return; }
        if (!res.ok) { const body = await res.json().catch(() => ({})); setFolderError(body.error || "Kunne ikke laste mapper"); setLoadingFolders(false); return; }
        const data = await res.json();
        setProjectFolder(data.projectFolder);
        setSubfolders(data.subfolders || []);
        if (data.subfolders?.length > 0) setActiveTab(data.subfolders[0].id);
      } catch { setFolderError("Nettverksfeil ved lasting av mapper"); }
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
        setChecklists(data.map((c: Record<string, unknown>) => ({
          id: String(c.id),
          template_name: String(c.template_name || c.template || ""),
          submitted_by: String(c.submitted_by || ""),
          submitted_at: String(c.submitted_at || c.created_at || ""),
          pdf_url: c.pdf_url ? String(c.pdf_url) : undefined,
          checklist_data: c.checklist_data as Record<string, unknown>[] | null,
        })));
      }
    }
    load();
  }, [projectNumber]);

  // Fetch deviations from Supabase
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("deviations")
        .select("*, reporter:reported_by(name), responsible:responsible_id(name)")
        .eq("company_id", COMPANY_ID)
        .eq("project_number", projectNumber)
        .order("created_at", { ascending: false });
      if (data) {
        setDeviations(data.map((d: Record<string, unknown>) => ({
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
        })));
      }
    }
    load();
  }, [projectNumber]);

  // Get the tab name for the active tab
  const activeTabName = subfolders.find((sf) => sf.id === activeTab)?.name || "";
  const hasChecklists = checklists.length > 0;
  const hasDeviations = deviations.length > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <header className="sticky top-0 z-20" style={{ backgroundColor: "var(--card-bg)", borderBottom: "1px solid var(--divider)" }}>
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-3" style={{ color: "var(--muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Tilbake
          </Link>

          {loadingProject ? (
            <div className="h-8 w-48 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : project ? (
            <div>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px]" style={{ color: "var(--muted-light)" }}>#{project.project_number}</p>
                  <h1 className="text-[22px] sm:text-[26px] font-bold leading-tight" style={{ color: "var(--foreground)" }}>{project.name}</h1>
                </div>
                <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold mt-1" style={{ backgroundColor: STATUS_COLORS_SOFT[project.status] || "#eee", color: "#444" }}>
                  {STATUS_LABELS[project.status] || project.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px]" style={{ color: "var(--muted)" }}>
                {project.assigned && <span className="flex items-center gap-1.5"><span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: EMPLOYEE_COLORS[project.assigned] || "#888" }} />{project.assigned}</span>}
                {project.customer_name && <span>Kunde: {project.customer_name}</span>}
                {project.start_date && <span>Start: {formatDate(project.start_date)}</span>}
                {project.estimated_end_date && <span>Slutt: {project.end_date_defaulted ? "Ikke estimert" : formatDate(project.estimated_end_date)}</span>}
                {project.agreed_price != null && <span>Pris: {formatPrice(project.agreed_price)}</span>}
              </div>
            </div>
          ) : (
            <h1 className="text-[22px] font-bold" style={{ color: "var(--foreground)" }}>Prosjekt #{projectNumber}</h1>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-6">
        {projectFolder && <p className="text-[12px] mb-4" style={{ color: "var(--muted-light)" }}>OneDrive: {projectFolder}</p>}

        {loadingFolders ? (
          <div className="flex gap-2 mb-6">{[1, 2, 3].map((i) => <div key={i} className="h-10 w-24 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
        ) : folderError && subfolders.length === 0 && !hasChecklists ? (
          <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <p className="text-[14px] font-medium" style={{ color: "var(--foreground)" }}>{folderError}</p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--muted-light)" }}>Sjekk at prosjektmappen finnes under /2024/Prosjekter/ i OneDrive</p>
          </div>
        ) : (
          <>
            {/* Scrollable tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-4 px-4 sm:-mx-6 sm:px-6" style={{ scrollbarWidth: "none" }}>
              {subfolders.map((sf) => (
                <button key={sf.id} onClick={() => setActiveTab(sf.id)} className="shrink-0 rounded-lg px-4 font-medium transition-colors cursor-pointer"
                  style={{ height: 44, fontSize: 13, backgroundColor: activeTab === sf.id ? "var(--foreground)" : "var(--surface)", color: activeTab === sf.id ? "var(--background)" : "var(--muted)", border: activeTab === sf.id ? "none" : "1px solid var(--card-border)" }}>
                  {sf.name}
                </button>
              ))}
              {hasChecklists && (
                <button onClick={() => setActiveTab("checklists")} className="shrink-0 rounded-lg px-4 font-medium transition-colors cursor-pointer"
                  style={{ height: 44, fontSize: 13, backgroundColor: activeTab === "checklists" ? "var(--foreground)" : "var(--surface)", color: activeTab === "checklists" ? "var(--background)" : "var(--muted)", border: activeTab === "checklists" ? "none" : "1px solid var(--card-border)" }}>
                  Sjekklister ({checklists.length})
                </button>
              )}
              {hasDeviations && (
                <button onClick={() => setActiveTab("deviations")} className="shrink-0 rounded-lg px-4 font-medium transition-colors cursor-pointer"
                  style={{ height: 44, fontSize: 13, backgroundColor: activeTab === "deviations" ? "var(--foreground)" : "var(--surface)", color: activeTab === "deviations" ? "var(--background)" : "var(--muted)", border: activeTab === "deviations" ? "none" : "1px solid var(--card-border)" }}>
                  Avvik ({deviations.length})
                </button>
              )}
            </div>

            {/* Tab content */}
            {activeTab === "checklists" ? (
              <ChecklistsView checklists={checklists} />
            ) : activeTab === "deviations" ? (
              <DeviationsView deviations={deviations} />
            ) : activeTab ? (
              <FolderBrowser
                key={activeTab}
                rootFolderId={activeTab}
                rootFolderName={activeTabName}
                onOpenPdf={setPdfFile}
              />
            ) : null}
          </>
        )}
      </main>

      {/* PDF Viewer Modal */}
      {pdfFile && <PdfViewer file={pdfFile} onClose={() => setPdfFile(null)} />}
    </div>
  );
}

// --- Folder Browser with drill-down ---

function FolderBrowser({
  rootFolderId,
  rootFolderName,
  onOpenPdf,
}: {
  rootFolderId: string;
  rootFolderName: string;
  onOpenPdf: (file: DriveFile) => void;
}) {
  // Breadcrumb trail: [{id, name}]
  const [path, setPath] = useState<{ id: string; name: string }[]>([
    { id: rootFolderId, name: rootFolderName },
  ]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);

  const currentFolder = path[path.length - 1];

  const fetchFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    setItems([]);
    try {
      const res = await fetch(`/api/graph/folders/${folderId}/files`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFolder(currentFolder.id);
  }, [currentFolder.id, fetchFolder]);

  const navigateInto = (folder: DriveFolder) => {
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateTo = (index: number) => {
    setPath((prev) => prev.slice(0, index + 1));
  };

  // Separate folders and files, folders first
  const folders = items.filter((i): i is DriveFolder => i.type === "folder");
  const files = items.filter((i): i is DriveFile => i.type === "file");

  return (
    <div>
      {/* Breadcrumb */}
      {path.length > 1 && (
        <div className="flex items-center gap-1 mb-3 text-[12px] flex-wrap" style={{ color: "var(--muted-light)" }}>
          {path.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              {i > 0 && <span style={{ color: "var(--muted-light)" }}>/</span>}
              {i < path.length - 1 ? (
                <button onClick={() => navigateTo(i)} className="cursor-pointer hover:underline" style={{ color: "var(--muted)" }}>
                  {p.name}
                </button>
              ) : (
                <span style={{ color: "var(--foreground)" }} className="font-medium">{p.name}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <p className="text-[14px] font-medium" style={{ color: "var(--muted-light)" }}>Ingen filer i denne mappen</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          {/* Folders */}
          {folders.map((folder, i) => (
            <button
              key={folder.id}
              onClick={() => navigateInto(folder)}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] cursor-pointer text-left"
              style={{ borderBottom: (i < folders.length - 1 || files.length > 0) ? "1px solid var(--divider)" : undefined, minHeight: 52 }}
            >
              <span className="text-[20px] shrink-0">{"\uD83D\uDCC2"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>{folder.name}</p>
                <p className="text-[11px]" style={{ color: "var(--muted-light)" }}>{folder.childCount} element{folder.childCount !== 1 ? "er" : ""}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" style={{ color: "var(--muted-light)" }}>
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}

          {/* Files */}
          {files.map((file, i) => {
            const icon = fileIcon(file.mimeType, file.name);
            const pdf = isPdf(file.mimeType, file.name);

            return (
              <div
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                style={{ borderBottom: i < files.length - 1 ? "1px solid var(--divider)" : undefined, minHeight: 52 }}
              >
                <span className="text-[20px] shrink-0" style={{ color: icon.color }}>{icon.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "var(--foreground)" }}>{file.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted-light)" }}>
                    {formatBytes(file.size)}{file.lastModified && ` \u00B7 ${formatDate(file.lastModified)}`}
                  </p>
                </div>
                {pdf ? (
                  <button
                    onClick={() => onOpenPdf(file)}
                    className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{ backgroundColor: "#E5393520", color: "#E53935" }}
                  >
                    Vis PDF
                  </button>
                ) : (
                  <a
                    href={file.downloadUrl || `/api/graph/files/${file.id}/content`}
                    download={file.name}
                    className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}
                  >
                    Last ned
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- PDF Viewer Modal (pdf.js canvas renderer) ---

function PdfViewer({ file, onClose }: { file: DriveFile; onClose: () => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const downloadHref = file.downloadUrl || `/api/graph/files/${file.id}/content`;
  const pdfUrl = `/api/graph/files/${file.id}/content?inline=true`;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        const loadingTask = pdfjs.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);
        setStatus("ready");

        const container = containerRef.current;
        if (!container) return;

        // Render all pages (or first 30 for very large PDFs)
        const maxPages = Math.min(pdf.numPages, 30);
        for (let i = 1; i <= maxPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const containerWidth = container.clientWidth - 32; // padding
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width * window.devicePixelRatio;
          canvas.height = viewport.height * window.devicePixelRatio;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 16px";
          canvas.style.borderRadius = "4px";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

          await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
      } catch (e) {
        console.error("[PdfViewer] render error:", e);
        if (!cancelled) setStatus("error");
      }
    }

    render();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "rgba(0,0,0,0.92)" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ backgroundColor: "rgba(0,0,0,0.95)" }}>
        <a href={downloadHref} download={file.name} className="text-[13px] font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}>
          Last ned
        </a>
        <div className="flex-1 mx-3 text-center min-w-0">
          <p className="text-[13px] font-medium truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{file.name}</p>
          {status === "ready" && pageCount > 0 && (
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{pageCount} {pageCount === 1 ? "side" : "sider"}</p>
          )}
        </div>
        <button onClick={onClose} className="text-[13px] font-medium px-3 py-1.5 rounded-lg cursor-pointer" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}>
          Lukk
        </button>
      </div>

      {/* Content area */}
      {status === "loading" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>Laster PDF...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-[15px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>Kunne ikke vise PDF</p>
          <a href={downloadHref} download={file.name} className="text-[13px] font-semibold px-4 py-2 rounded-lg" style={{ backgroundColor: "#E53935", color: "#fff" }}>
            Last ned i stedet
          </a>
        </div>
      )}

      {/* Scrollable canvas container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ display: status === "loading" || status === "error" ? "none" : "block" }}
      />
    </div>
  );
}

// --- Checklists View ---

function ChecklistsView({ checklists }: { checklists: ChecklistRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (checklists.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <p className="text-[14px] font-medium" style={{ color: "var(--muted-light)" }}>Ingen sjekklister for dette prosjektet</p>
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
          <div key={cl.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <button onClick={() => setExpandedId(isExpanded ? null : cl.id)} className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left" style={{ minHeight: 56 }}>
              {items.length > 0 ? (
                allOk ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0"><circle cx="10" cy="10" r="9" fill="#22c55e" /><path d="M6,10 L9,13 L14,7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0"><circle cx="10" cy="10" r="9" fill="#E5A940" /><text x="10" y="14" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">!</text></svg>
                )
              ) : (
                <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: "var(--muted-light)", opacity: 0.3 }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>{cl.template_name}</p>
                <p className="text-[11px]" style={{ color: "var(--muted-light)" }}>{cl.submitted_by && `${cl.submitted_by} \u00B7 `}{formatDate(cl.submitted_at)}</p>
              </div>
              {cl.pdf_url && (
                <a href={cl.pdf_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0 text-[11px] font-medium px-2 py-1 rounded" style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}>PDF</a>
              )}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 transition-transform" style={{ color: "var(--muted-light)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isExpanded && items.length > 0 && (
              <div className="px-4 pb-3" style={{ borderTop: "1px solid var(--divider)" }}>
                {items.map((item, idx) => {
                  const label = String(item.label || item.name || item.question || `Punkt ${idx + 1}`);
                  const ok = item.ok === true || item.status === "ok" || item.passed === true;
                  return (
                    <div key={idx} className="flex items-center gap-2 py-1.5">
                      {ok ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0"><circle cx="7" cy="7" r="6" fill="#22c55e" /><path d="M4,7 L6,9.5 L10,4.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0"><circle cx="7" cy="7" r="6" fill="#E5A940" /><text x="7" y="11" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">!</text></svg>
                      )}
                      <span className="text-[12px]" style={{ color: ok ? "var(--muted)" : "var(--foreground)" }}>{label}</span>
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

// --- Deviations View ---

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "#dbeafe", text: "#1e40af" },
  medium: { bg: "#fef3c7", text: "#92400e" },
  high: { bg: "#fee2e2", text: "#991b1b" },
  critical: { bg: "#fecaca", text: "#7f1d1d" },
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Lav",
  medium: "Middels",
  high: "Høy",
  critical: "Kritisk",
};

function DeviationsView({ deviations }: { deviations: DeviationRow[] }) {
  if (deviations.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <p className="text-[14px] font-medium" style={{ color: "var(--muted-light)" }}>Ingen avvik for dette prosjektet</p>
      </div>
    );
  }

  const open = deviations.filter((d) => d.status === "open");
  const resolved = deviations.filter((d) => d.status !== "open");

  return (
    <div className="space-y-2">
      {open.length > 0 && (
        <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--muted-light)", letterSpacing: "0.04em" }}>
          &Aring;pne ({open.length})
        </p>
      )}
      {open.map((d) => <DeviationCard key={d.id} deviation={d} />)}

      {resolved.length > 0 && (
        <p className="text-[10px] font-semibold uppercase mb-1 mt-4" style={{ color: "var(--muted-light)", letterSpacing: "0.04em" }}>
          L&oslash;st ({resolved.length})
        </p>
      )}
      {resolved.map((d) => <DeviationCard key={d.id} deviation={d} />)}
    </div>
  );
}

function DeviationCard({ deviation: d }: { deviation: DeviationRow }) {
  const isOpen = d.status === "open";
  const sev = SEVERITY_COLORS[d.severity] || SEVERITY_COLORS.medium;
  const sevLabel = SEVERITY_LABELS[d.severity] || d.severity;

  // Deadline countdown
  let deadlineText = "";
  if (isOpen && d.resolution_deadline) {
    const daysLeft = Math.round((new Date(d.resolution_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) deadlineText = `${Math.abs(daysLeft)} dager over frist`;
    else if (daysLeft === 0) deadlineText = "Frist i dag";
    else deadlineText = `${daysLeft} dager igjen`;
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card-bg)", border: `1px solid ${isOpen ? "#fca5a5" : "var(--card-border)"}` }}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-2 mb-2">
          <span className="mt-0.5 shrink-0" style={{ fontSize: 14 }}>{isOpen ? "\uD83D\uDD34" : "\uD83D\uDFE2"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>{d.description}</p>
          </div>
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: sev.bg, color: sev.text }}>
            {sevLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--muted)" }}>
          {d.reported_by_name && <span>Rapportert av: <span style={{ color: "var(--foreground)" }}>{d.reported_by_name}</span></span>}
          {d.responsible_name && <span>Ansvarlig: <span style={{ color: "var(--foreground)" }}>{d.responsible_name}</span></span>}
          <span>{formatDate(d.created_at)}</span>
        </div>

        {isOpen && deadlineText && (
          <p className="mt-1.5 text-[11px] font-medium" style={{ color: deadlineText.includes("over") ? "#E53935" : "#E5A940" }}>
            Frist: {deadlineText}
          </p>
        )}

        {!isOpen && d.resolution_description && (
          <div className="mt-2 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface)" }}>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--muted-light)" }}>Løsning</p>
            <p className="text-[12px]" style={{ color: "var(--foreground)" }}>{d.resolution_description}</p>
            {d.resolved_at && <p className="mt-0.5 text-[10px]" style={{ color: "var(--muted-light)" }}>Løst {formatDate(d.resolved_at)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
