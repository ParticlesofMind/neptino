"use client"

import { createContext } from "react"

export type EditorSurface = "full" | "controls" | "preview"

export const EditorSurfaceContext = createContext<EditorSurface>("full")
