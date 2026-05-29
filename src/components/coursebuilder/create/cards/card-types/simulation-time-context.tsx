"use client"

import { createContext, useContext } from "react"

export interface SimulationTimelinePhase {
  id: string
  label: string
  startYear: number
  endYear: number
  color?: string
  description?: string
}

export interface SimulationTimeContextValue {
  year: number
  setYear: (year: number) => void
  minYear: number
  maxYear: number
  phases: SimulationTimelinePhase[]
}

const SimulationTimeContext = createContext<SimulationTimeContextValue | null>(null)

export const SimulationTimeProvider = SimulationTimeContext.Provider

export function useSimulationTime(): SimulationTimeContextValue | null {
  return useContext(SimulationTimeContext)
}
