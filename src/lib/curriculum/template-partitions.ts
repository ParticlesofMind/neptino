export interface TemplatePartition {
  id: string
  label: string
}

export interface TemplatePartitionPreset {
  id: string
  label: string
  tradition: string
  description: string
  partitions: TemplatePartition[]
}

export const CUSTOM_PARTITION_PRESET_ID = "custom"

const LEGACY_PARTITION_IDS = ["instruction", "practice", "feedback"]

export const TEMPLATE_PARTITION_PRESETS: TemplatePartitionPreset[] = [
  {
    id: "single",
    label: "Unified area",
    tradition: "Flexible lesson planning",
    description: "One work area for teachers who want each task to carry its own sequence or who plan to arrange materials directly on the canvas.",
    partitions: [{ id: "instruction", label: "Content" }],
  },
  {
    id: "ipf",
    label: "Instruction / Practice / Feedback",
    tradition: "Direct instruction cycle",
    description: "Introduce or model the idea, let students rehearse it, then close the loop with corrective or formative feedback.",
    partitions: [
      { id: "instruction", label: "Instruction" },
      { id: "practice", label: "Practice" },
      { id: "feedback", label: "Feedback" },
    ],
  },
  {
    id: "gradual-release",
    label: "Gradual release",
    tradition: "I do / We do / You do",
    description: "Move from teacher modeling, to guided practice with support, to independent student performance.",
    partitions: [
      { id: "instruction", label: "Model" },
      { id: "practice", label: "Coach" },
      { id: "feedback", label: "Release" },
    ],
  },
  {
    id: "inquiry",
    label: "Inquiry cycle",
    tradition: "Inquiry-based learning",
    description: "Start with a question, investigate evidence or examples, then consolidate findings into a claim, explanation, or product.",
    partitions: [
      { id: "instruction", label: "Question" },
      { id: "practice", label: "Explore" },
      { id: "feedback", label: "Synthesize" },
    ],
  },
]

function defaultSingleLabel(blockKey?: string): string {
  if (blockKey === "scoring") return "Scoring"
  return blockKey === "assignment" ? "Assignment" : "Content"
}

function clonePartitions(partitions: TemplatePartition[]): TemplatePartition[] {
  return partitions.map((partition) => ({ ...partition }))
}

function isPartition(value: unknown): value is TemplatePartition {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<TemplatePartition>
  return typeof candidate.id === "string" && typeof candidate.label === "string"
}

function normalisePartitions(partitions: TemplatePartition[], blockKey?: string): TemplatePartition[] {
  const seen = new Set<string>()
  const normalised = partitions
    .map((partition, index) => {
      const fallbackId = LEGACY_PARTITION_IDS[index] ?? `custom-${index + 1}`
      const id = partition.id.trim() || fallbackId
      return {
        id,
        label: partition.label.trim() || `Part ${index + 1}`,
      }
    })
    .filter((partition) => {
      if (seen.has(partition.id)) return false
      seen.add(partition.id)
      return true
    })

  return normalised.length > 0
    ? normalised
    : [{ id: "instruction", label: defaultSingleLabel(blockKey) }]
}

function presetById(presetId: string | undefined): TemplatePartitionPreset | undefined {
  return TEMPLATE_PARTITION_PRESETS.find((preset) => preset.id === presetId)
}

export function resolveTemplatePartitions(
  fieldConfig: Record<string, unknown> | undefined,
  blockKey?: string,
): TemplatePartition[] {
  const savedPartitions = Array.isArray(fieldConfig?.["_partitions"])
    ? (fieldConfig?.["_partitions"] as unknown[]).filter(isPartition)
    : []

  if (savedPartitions.length > 0) {
    return normalisePartitions(savedPartitions, blockKey)
  }

  const presetId = typeof fieldConfig?.["_partitionPreset"] === "string"
    ? fieldConfig["_partitionPreset"]
    : undefined
  const preset = presetById(presetId)
  if (preset) return clonePartitions(preset.partitions)

  if (fieldConfig && fieldConfig["_split"] !== true) {
    return [{ id: "instruction", label: defaultSingleLabel(blockKey) }]
  }

  const instruction = fieldConfig ? fieldConfig["instruction"] !== false : true
  const practice = fieldConfig ? fieldConfig["practice"] !== false : true
  const feedback = fieldConfig ? fieldConfig["feedback"] !== false : true

  return [
    ...(instruction ? [{ id: "instruction", label: "Instruction" }] : []),
    ...(practice ? [{ id: "practice", label: "Practice" }] : []),
    ...(feedback ? [{ id: "feedback", label: "Feedback" }] : []),
  ]
}

export function getPartitionPresetId(fieldConfig: Record<string, unknown> | undefined): string {
  const presetId = typeof fieldConfig?.["_partitionPreset"] === "string"
    ? fieldConfig["_partitionPreset"]
    : undefined
  if (presetId) return presetId
  return fieldConfig?.["_split"] === true ? "ipf" : "single"
}

export function createPartitionState(
  blockKey: string,
  presetId: string,
  customPartitions?: TemplatePartition[],
): Record<string, unknown> {
  const preset = presetById(presetId)
  const fallbackPreset = TEMPLATE_PARTITION_PRESETS.find((candidate) => candidate.id === "single")
  const partitions = presetId === CUSTOM_PARTITION_PRESET_ID
    ? normalisePartitions(customPartitions ?? [], blockKey)
    : clonePartitions(preset?.partitions ?? fallbackPreset?.partitions ?? [{ id: "instruction", label: defaultSingleLabel(blockKey) }])

  return {
    _split: partitions.length > 1,
    _partitionPreset: presetId,
    _partitions: partitions,
    instruction: partitions.some((partition) => partition.id === "instruction"),
    practice: partitions.some((partition) => partition.id === "practice"),
    feedback: partitions.some((partition) => partition.id === "feedback"),
  }
}

export function createNextCustomPartition(partitions: TemplatePartition[]): TemplatePartition {
  const usedIds = new Set(partitions.map((partition) => partition.id))
  const legacyId = LEGACY_PARTITION_IDS.find((id) => !usedIds.has(id))
  const id = legacyId ?? `custom-${partitions.length + 1}`
  return {
    id,
    label: `Part ${partitions.length + 1}`,
  }
}
