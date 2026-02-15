import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "encyclopedia",
    "historical-figures-details.json"
  );

  const raw = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(raw) as Record<string, unknown>;
  const entry = data[id];

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}
