/**
 * Shared constants for the Atlas UI system
 */

import type { EntityType, AtlasContributionStatus } from "@/types/atlas"

/**
 * Entity type badge colors — consistent across all Atlas components.
 */
export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  Concept:     "bg-[#dbe8f6] text-[#3a6ea0]",
  Process:     "bg-[#d6ede3] text-[#2e6b4a]",
  Instance:    "bg-[#f0e6cc] text-[#7a5010]",
  Person:      "bg-[#ecdcec] text-[#622c6a]",
  State:       "bg-[#f0e8cc] text-[#7a6010]",
  Time:        "bg-[#f0d8d8] text-[#8a3030]",
  Environment: "bg-[#d6ede3] text-[#2e6b4a]",
  Work:        "bg-[#f0e8cc] text-[#7a6010]",
  Technology:  "bg-[#dbe8f6] text-[#3a6ea0]",
  Institution: "bg-[#ecdcec] text-[#622c6a]",
  Movement:    "bg-[#f0e8cc] text-[#7a6010]",
}

/**
 * Contribution status badge colors.
 */
export const CONTRIBUTION_STATUS_COLORS: Record<AtlasContributionStatus, string> = {
  draft:          "bg-muted text-muted-foreground",
  pending:        "bg-[#f0e8cc] text-[#7a6010]",
  approved:       "bg-[#d6ede3] text-[#2e6b4a]",
  rejected:       "bg-destructive/10 text-destructive",
}
