import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import process from "node:process"

const repoRoot = process.cwd()
const baselinePath = path.join(repoRoot, "scripts", "file-line-limit-baseline.json")
const config = JSON.parse(readFileSync(baselinePath, "utf8"))

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
  ".turbo",
  ".cache",
  ".temp",
])

function countLines(filePath) {
  const normalized = readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  if (normalized.length === 0) {
    return 0
  }

  const newlineCount = (normalized.match(/\n/g) ?? []).length
  return normalized.endsWith("\n") ? newlineCount : newlineCount + 1
}

function walkFiles(relativeDir, extensions, results) {
  const absoluteDir = path.join(repoRoot, relativeDir)

  let entries = []

  try {
    entries = readdirSync(absoluteDir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue
    }

    const entryRelativePath = path.join(relativeDir, entry.name)
    const entryAbsolutePath = path.join(repoRoot, entryRelativePath)

    if (entry.isDirectory()) {
      walkFiles(entryRelativePath, extensions, results)
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (!extensions.some((extension) => entry.name.endsWith(extension))) {
      continue
    }

    const stats = statSync(entryAbsolutePath)
    if (!stats.isFile()) {
      continue
    }

    results.push(entryRelativePath)
  }
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/")
}

const scannedFiles = []
for (const root of config.roots) {
  walkFiles(root, config.extensions, scannedFiles)
}

const violations = []
for (const relativeFilePath of scannedFiles) {
  const posixPath = toPosixPath(relativeFilePath)
  const lines = countLines(path.join(repoRoot, relativeFilePath))

  if (lines <= config.limit) {
    continue
  }

  const baselineLimit = config.baseline[posixPath]
  if (baselineLimit === undefined) {
    violations.push(`${posixPath} has ${lines} lines and exceeds the ${config.limit}-line limit without a baseline entry.`)
    continue
  }

  if (lines > baselineLimit) {
    violations.push(`${posixPath} grew from its baseline ${baselineLimit} lines to ${lines} lines.`)
  }
}

const staleEntries = Object.keys(config.baseline)
  .filter((relativeFilePath) => {
    const absoluteFilePath = path.join(repoRoot, relativeFilePath)

    try {
      const stats = statSync(absoluteFilePath)
      if (!stats.isFile()) {
        return true
      }
    } catch {
      return true
    }

    return countLines(absoluteFilePath) <= config.limit
  })
  .sort()

if (violations.length > 0) {
  console.error(`File line-limit check failed. Limit: ${config.limit} lines.`)
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log(`File line-limit check passed for ${scannedFiles.length} files. Limit: ${config.limit} lines.`)

if (staleEntries.length > 0) {
  console.log("Baseline entries ready to remove:")
  for (const staleEntry of staleEntries) {
    console.log(`- ${staleEntry}`)
  }
}