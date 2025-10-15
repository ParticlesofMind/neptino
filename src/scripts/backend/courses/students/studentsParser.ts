import mammoth from "mammoth";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/build/pdf.mjs";
import { read, utils } from "xlsx";
import type {
  RawStudentRow,
  StudentField,
  StudentFieldMapping,
  StudentParseResult,
} from "./studentsTypes.js";

const GOOGLE_SHEETS_HOSTS = ["docs.google.com", "drive.google.com"];
const PDF_WORKER = new URL("pdf.worker.mjs", import.meta.url).toString();

try {
  GlobalWorkerOptions.workerSrc = PDF_WORKER;
} catch (error) {
  console.warn("Unable to configure pdf.js worker. PDF parsing may be degraded.", error);
}

const HEADER_MATCHERS: Array<{ pattern: RegExp; field: StudentField }> = [
  { pattern: /first\s*name|given\s*name|fname/i, field: "first_name" },
  { pattern: /last\s*name|surname|family\s*name|lname/i, field: "last_name" },
  { pattern: /email/i, field: "email" },
  { pattern: /student\s*id|id\s*number|learner\s*id/i, field: "student_id" },
  { pattern: /grade\s*(level)?|year\s*group|class\s*year/i, field: "grade_level" },
  { pattern: /learning\s*style|preference|modality/i, field: "learning_style" },
  { pattern: /assessment|score|placement/i, field: "assessment_score" },
  { pattern: /enrollment|enrolment|start\s*date/i, field: "enrollment_date" },
  { pattern: /notes|comments|flags/i, field: "notes" },
];

function normalizeHeader(header: string): string {
  return header.trim();
}

function inferMapping(headers: string[]): StudentFieldMapping {
  const mapping: StudentFieldMapping = {};
  headers.forEach((header) => {
    const matcher = HEADER_MATCHERS.find(({ pattern }) => pattern.test(header));
    if (matcher && !mapping[matcher.field]) {
      mapping[matcher.field] = header;
    }
  });
  return mapping;
}

function buildParseResult(rows: RawStudentRow[], warnings: string[]): StudentParseResult {
  if (!rows.length) {
    return {
      headers: [],
      mapping: {},
      rows,
      warnings: warnings.length ? warnings : ["No data rows were detected in the file."],
    };
  }

  const headers = Object.keys(rows[0]).map(normalizeHeader);
  const mapping = inferMapping(headers);
  return { headers, mapping, rows, warnings };
}

async function parseSpreadsheet(buffer: ArrayBuffer): Promise<StudentParseResult> {
  const workbook = read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = utils.sheet_to_json<RawStudentRow>(sheet, { defval: "" });
  return buildParseResult(rows, []);
}

function parseDelimText(text: string): StudentParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return buildParseResult([], ["No recognizable rows were found in the document."]);
  }

  const sample = lines[0];
  const delimiter = sample.includes(",") ? "," : sample.includes("\t") ? "\t" : /\s{2,}/;
  const headers = lines[0].split(delimiter).map(normalizeHeader);
  const dataLines = lines.slice(1);

  const rows: RawStudentRow[] = dataLines.map((line) => {
    const values = line.split(delimiter);
    const row: RawStudentRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return buildParseResult(rows, []);
}

async function parsePdf(arrayBuffer: ArrayBuffer): Promise<StudentParseResult> {
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    text += `${pageText}\n`;
  }

  return parseDelimText(text);
}

async function parseDocx(arrayBuffer: ArrayBuffer): Promise<StudentParseResult> {
  const { value } = await mammoth.convertToHtml({ arrayBuffer });

  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));

  if (tables.length) {
    const rows: RawStudentRow[] = [];
    const firstTable = tables[0];
    const headerCells = Array.from(firstTable.querySelectorAll("tr:first-child td, tr:first-child th"));
    const headers = headerCells.map((cell) => normalizeHeader(cell.textContent ?? ""));

    const dataRows = Array.from(firstTable.querySelectorAll("tr")).slice(1);
    dataRows.forEach((rowElement) => {
      const cells = Array.from(rowElement.querySelectorAll("td"));
      if (!cells.length) return;

      const row: RawStudentRow = {};
      headers.forEach((header, index) => {
        row[header] = cells[index]?.textContent?.trim() ?? "";
      });
      rows.push(row);
    });

    return buildParseResult(rows, []);
  }

  // Fallback: parse bullet list or paragraphs assuming CSV-like text
  const bullets = Array.from(doc.querySelectorAll("li")).map((item) =>
    item.textContent?.trim() ?? "",
  );
  if (bullets.length) {
    const text = bullets.join("\n");
    return parseDelimText(text);
  }

  const paragraphs = Array.from(doc.querySelectorAll("p")).map((p) => p.textContent?.trim() ?? "");
  const text = paragraphs.join("\n");
  return parseDelimText(text);
}

export async function parseRosterFile(file: File): Promise<StudentParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (!ext) {
    return buildParseResult([], ["File type not recognised."]);
  }

  if (["xlsx", "xls", "csv", "tsv", "ods"].includes(ext)) {
    return parseSpreadsheet(buffer);
  }

  if (ext === "pdf") {
    return parsePdf(buffer);
  }

  if (ext === "docx" || ext === "doc") {
    return parseDocx(buffer);
  }

  return buildParseResult([], [`Unsupported file format: ${ext.toUpperCase()}`]);
}

export async function parseGoogleSheet(url: string): Promise<StudentParseResult> {
  const parsed = new URL(url);
  if (!GOOGLE_SHEETS_HOSTS.includes(parsed.host)) {
    return buildParseResult([], ["Please provide a valid Google Sheets sharing link."]);
  }

  const idMatch = parsed.pathname.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = idMatch?.[1];

  if (!sheetId) {
    return buildParseResult([], ["Unable to determine Google Sheet ID from the provided link."]);
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const response = await fetch(exportUrl);

  if (!response.ok) {
    return buildParseResult([], ["Failed to download Google Sheet. Check sharing permissions."]);
  }

  const csv = await response.text();
  return parseDelimText(csv);
}
