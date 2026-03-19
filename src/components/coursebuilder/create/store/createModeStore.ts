import { create } from "zustand"

export type CreateMode = "curate" | "make" | "fix"

interface CreateModeState {
  mode: CreateMode
  setMode: (mode: CreateMode) => void
}

export const useCreateModeStore = create<CreateModeState>((set) => ({
  mode: "curate",
  setMode: (mode) => set({ mode }),
}))
