// MS Graph API helper — server-side only (uses non-NEXT_PUBLIC_ env vars)

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
// TODO: When projects move to /2025/Prosjekter/, update this path
const PROJECTS_PATH = "/2024/Prosjekter";
const DRIVE_USER = "nick@rsamdalsnekkeri.no";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("MS Graph credentials not configured");
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

async function graphFetch(path: string, retries = 2): Promise<Response> {
  const token = await getToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Handle rate limiting with retry
  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "2", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return graphFetch(path, retries - 1);
  }

  return res;
}

export async function graphJson<T>(path: string): Promise<T> {
  const res = await graphFetch(path);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function graphStream(path: string): Promise<Response> {
  return graphFetch(path);
}

// Drive path helper
function drivePath(filePath: string): string {
  return `/users/${DRIVE_USER}/drive/root:${filePath}`;
}

function driveItem(itemId: string): string {
  return `/users/${DRIVE_USER}/drive/items/${itemId}`;
}

// --- High-level helpers ---

interface GraphDriveItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  webUrl?: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  "@microsoft.graph.downloadUrl"?: string;
}

interface GraphChildren {
  value: GraphDriveItem[];
}

/**
 * Find a project folder by number under /2024/Prosjekter/
 * Folder naming is inconsistent: "732 - Name", "732 Name", etc.
 * Match by prefix.
 */
export async function findProjectFolder(
  projectNumber: string
): Promise<{ folderName: string; folderId: string } | null> {
  const data = await graphJson<GraphChildren>(
    `${drivePath(PROJECTS_PATH)}:/children?$select=id,name,folder&$filter=startsWith(name,'${projectNumber}')&$top=10`
  );

  // Graph startsWith filter may not work on all drives — fall back to client filter
  let match = data.value.find((item) => item.folder && item.name.startsWith(projectNumber));

  if (!match) {
    // Fetch all and filter client-side
    const all = await graphJson<GraphChildren>(
      `${drivePath(PROJECTS_PATH)}:/children?$select=id,name,folder&$top=200`
    );
    match = all.value.find((item) => item.folder && item.name.startsWith(projectNumber));
  }

  if (!match) return null;
  return { folderName: match.name, folderId: match.id };
}

export async function listSubfolders(
  folderId: string
): Promise<{ id: string; name: string; childCount: number }[]> {
  const data = await graphJson<GraphChildren>(
    `${driveItem(folderId)}/children?$select=id,name,folder&$top=100`
  );
  return data.value
    .filter((item) => item.folder)
    .map((item) => ({
      id: item.id,
      name: item.name,
      childCount: item.folder!.childCount,
    }));
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  lastModified: string;
  webUrl: string;
  downloadUrl?: string;
}

export async function listFiles(folderId: string): Promise<DriveFile[]> {
  const data = await graphJson<GraphChildren>(
    `${driveItem(folderId)}/children?$select=id,name,size,lastModifiedDateTime,webUrl,file&$top=200`
  );
  return data.value
    .filter((item) => item.file)
    .map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size || 0,
      mimeType: item.file!.mimeType,
      lastModified: item.lastModifiedDateTime || "",
      webUrl: item.webUrl || "",
      downloadUrl: item["@microsoft.graph.downloadUrl"],
    }));
}

export async function getFileStream(itemId: string): Promise<Response> {
  return graphStream(`${driveItem(itemId)}/content`);
}
