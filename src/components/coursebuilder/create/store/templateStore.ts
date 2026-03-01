/**
 * Template Store — template config per session
 *
 * Tracks which template type, which blocks are visible, block order and
 * visual density for each session. Persisted so settings survive page refresh.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { SessionId, BlockKey, TemplateType } from "../types"
import { getTemplateDefinition } from "../templates/definitions"
import {
  DEFAULT_TEMPLATE_VISUAL_DENSITY as DEFAULT_VISUAL_DENSITY,
  type TemplateVisualDensity as VisualDensity,
} from "@/lib/curriculum/template-source-of-truth"

export type { VisualDensity }
export { DEFAULT_VISUAL_DENSITY }

// ─── Per-session config ───────────────────────────────────────────────────────

export interface SessionTemplateConfig {
  templateType: TemplateType
  /** Which blocks are currently toggled on */
  visibleBlocks: BlockKey[]
  /** Display order of body blocks */
  blockOrder: BlockKey[]
  visualDensity: VisualDensity
}

const DEFAULT_SESSION_CONFIG: SessionTemplateConfig = {
  templateType: "lesson",
  visibleBlocks: ["header", "program", "resources", "content", "assignment", "footer"],
  blockOrder: ["program", "resources", "content", "assignment"],
  visualDensity: DEFAULT_VISUAL_DENSITY,
}

// ─── Shape ────────────────────────────────────────────────────────────────────

interface TemplateState {
  /** Keyed by SessionId */
  configs: Record<string, SessionTemplateConfig>

  // ── Getters ────────────────────────────────────────────────────────────────

  getConfig: (sessionId: SessionId) => SessionTemplateConfig
  isBlockVisible: (sessionId: SessionId, block: BlockKey) => boolean

  // ── Setters ────────────────────────────────────────────────────────────────

  setTemplateType:  (sessionId: SessionId, type: TemplateType) => void
  toggleBlock:      (sessionId: SessionId, block: BlockKey) => void
  setBlockOrder:    (sessionId: SessionId, order: BlockKey[]) => void
  setDensity:       (sessionId: SessionId, density: VisualDensity) => void
  /** Initialise a session config from an existing definition */
  initSession:      (sessionId: SessionId, partial?: Partial<SessionTemplateConfig>) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive visibleBlocks and blockOrder from the template definition's defaultVisible flags. */
function deriveBlocksFromDefinition(type: TemplateType): Pick<SessionTemplateConfig, "visibleBlocks" | "blockOrder"> {
  const def = getTemplateDefinition(type)
  const visibleBlocks = def.blocks
    .filter((b) => b.defaultVisible)
    .map((b) => b.key)
  const blockOrder = def.blocks
    .filter((b) => b.key !== "header" && b.key !== "footer" && b.defaultVisible)
    .map((b) => b.key)
  return { visibleBlocks, blockOrder }
}

function patchConfig(
  configs: Record<string, SessionTemplateConfig>,
  sessionId: SessionId,
  patch: Partial<SessionTemplateConfig>,
): Record<string, SessionTemplateConfig> {
  const existing = configs[sessionId] ?? DEFAULT_SESSION_CONFIG
  return { ...configs, [sessionId]: { ...existing, ...patch } }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      configs: {},

      getConfig: (sessionId) =>
        get().configs[sessionId] ?? DEFAULT_SESSION_CONFIG,

      isBlockVisible: (sessionId, block) => {
        const cfg = get().configs[sessionId] ?? DEFAULT_SESSION_CONFIG
        return cfg.visibleBlocks.includes(block)
      },

      setTemplateType: (sessionId, type) =>
        set((s) => ({
          configs: patchConfig(s.configs, sessionId, {
            templateType: type,
            ...deriveBlocksFromDefinition(type),
          }),
        })),

      toggleBlock: (sessionId, block) =>
        set((s) => {
          const cfg = s.configs[sessionId] ?? DEFAULT_SESSION_CONFIG
          const next = cfg.visibleBlocks.includes(block)
            ? cfg.visibleBlocks.filter((b) => b !== block)
            : [...cfg.visibleBlocks, block]
          return { configs: patchConfig(s.configs, sessionId, { visibleBlocks: next }) }
        }),

      setBlockOrder: (sessionId, order) =>
        set((s) => ({ configs: patchConfig(s.configs, sessionId, { blockOrder: order }) })),

      setDensity: (sessionId, density) =>
        set((s) => ({ configs: patchConfig(s.configs, sessionId, { visualDensity: density }) })),

      initSession: (sessionId, partial = {}) =>
        set((s) => {
          const existing = s.configs[sessionId]
          const incomingType = partial.templateType ?? DEFAULT_SESSION_CONFIG.templateType
          // Re-derive if no config exists OR if the template type changed
          if (existing && existing.templateType === incomingType) return s
          const derived = deriveBlocksFromDefinition(incomingType)
          return {
            configs: {
              ...s.configs,
              [sessionId]: { ...DEFAULT_SESSION_CONFIG, ...derived, ...partial },
            },
          }
        }),
    }),
    {
      name: "neptino-template-store",
      partialize: (state) => ({ configs: state.configs }),
    },
  ),
)
