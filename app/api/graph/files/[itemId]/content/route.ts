import { getFileStream } from "@/lib/msgraph";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await ctx.params;
    const graphRes = await getFileStream(itemId);

    if (!graphRes.ok) {
      return new Response("Filen ble ikke funnet", { status: graphRes.status });
    }

    const url = new URL(req.url);
    const inline = url.searchParams.get("inline") === "true";
    const contentType = graphRes.headers.get("Content-Type") || "application/octet-stream";
    const contentLength = graphRes.headers.get("Content-Length");

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": inline ? "inline" : (graphRes.headers.get("Content-Disposition") || "attachment"),
      "Cache-Control": "private, max-age=300",
    };

    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    // Stream the response body directly — no buffering
    return new Response(graphRes.body, { status: 200, headers });
  } catch (e) {
    console.error("[graph/files/content]", e);
    return new Response("Feil ved nedlasting", { status: 500 });
  }
}
