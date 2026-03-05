import { create } from "zustand"

export type EditorMode = "curate" | "make" | "fix"

interface CreateModeState {
  mode: EditorMode
  setMode: (mode: EditorMode) => void
}

export const useCreateModeStore = create<CreateModeState>((set) => ({
  mode: "curate",
  setMode: (mode) => set({ mode }),
}))
