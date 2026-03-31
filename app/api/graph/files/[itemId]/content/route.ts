import { getFileStream } from "@/lib/msgraph";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await ctx.params;
    const graphRes = await getFileStream(itemId);

    if (!graphRes.ok) {
      return new Response("Filen ble ikke funnet", { status: graphRes.status });
    }

    return new Response(graphRes.body, {
      status: 200,
      headers: {
        "Content-Type": graphRes.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": graphRes.headers.get("Content-Disposition") || "attachment",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("[graph/files/content]", e);
    return new Response("Feil ved nedlasting", { status: 500 });
  }
}
