import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "encyclopedia",
    "historical-figures.json"
  );
  const raw = await fs.readFile(filePath, "utf-8");
  return new NextResponse(raw, {
    headers: { "Content-Type": "application/json" },
  });
}
