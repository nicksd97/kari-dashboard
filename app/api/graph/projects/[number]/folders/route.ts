import { NextResponse } from "next/server";
import { findProjectFolder, listSubfolders } from "@/lib/msgraph";

export const revalidate = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await ctx.params;
    const folder = await findProjectFolder(number);

    if (!folder) {
      return NextResponse.json(
        { error: "Prosjektmappe ikke funnet" },
        { status: 404 }
      );
    }

    const subfolders = await listSubfolders(folder.folderId);

    return NextResponse.json({
      projectFolder: folder.folderName,
      folderId: folder.folderId,
      subfolders,
    });
  } catch (e) {
    console.error("[graph/projects/folders]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ukjent feil" },
      { status: 500 }
    );
  }
}
