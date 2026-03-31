import { NextResponse } from "next/server";
import { listFiles } from "@/lib/msgraph";

export const revalidate = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await ctx.params;
    const files = await listFiles(itemId);
    return NextResponse.json({ files });
  } catch (e) {
    console.error("[graph/folders/files]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ukjent feil" },
      { status: 500 }
    );
  }
}
