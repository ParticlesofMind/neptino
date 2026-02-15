#!/usr/bin/env tsx
/**
 * Uploads encyclopedia datasets to Supabase Storage so the frontend can fetch
 * them directly without live Wikidata calls.
 *
 * Requirements:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY
 *
 * Usage:
 *   npm run deploy:encyclopedia:supabase
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUCKET = "encyclopedia";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const files = [
  {
    key: "historical-figures.json",
    path: resolve(__dirname, "../public/data/encyclopedia/historical-figures.json"),
  },
  {
    key: "historical-figures-details.json",
    path: resolve(__dirname, "../public/data/encyclopedia/historical-figures-details.json"),
  },
  {
    key: "movements.json",
    path: resolve(__dirname, "../public/data/encyclopedia/movements.json"),
  },
  {
    key: "movements-details.json",
    path: resolve(__dirname, "../public/data/encyclopedia/movements-details.json"),
  },
];

async function ensureBucket(): Promise<void> {
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (error && !error.message.toLowerCase().includes("not found")) {
    throw error;
  }
  if (!data) {
    console.log(`[upload] Creating bucket ${BUCKET} (public)`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: "200MB",
    });
    if (createError) throw createError;
  }
}

async function uploadAll(): Promise<void> {
  await ensureBucket();

  for (const file of files) {
    const buffer = readFileSync(file.path);
    console.log(`[upload] ${file.key} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)…`);
    const { error } = await supabase.storage.from(BUCKET).upload(file.key, buffer, {
      upsert: true,
      contentType: "application/json",
      cacheControl: "3600",
    });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(file.key);
    console.log(`[upload] ✔ Uploaded → ${urlData.publicUrl}`);
  }
}

(async () => {
  try {
    console.log("╔══════════════════════════════════════╗");
    console.log("║   Upload Encyclopedia to Supabase    ║");
    console.log("╚══════════════════════════════════════╝");

    await uploadAll();
    console.log("[upload] Done.");
  } catch (err) {
    console.error("[upload] Failed:", err);
    process.exit(1);
  }
})();
