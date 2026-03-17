export type StudioFieldKind = "text" | "textarea" | "number" | "select" | "toggle" | "action"

export interface StudioFieldOption {
  label: string
  value: string
}

export interface StudioField {
  key: string
  label: string
  kind: StudioFieldKind
  placeholder?: string
  description?: string
  actionLabel?: string
  disabled?: boolean
  rows?: number
  min?: number
  max?: number
  step?: number
  options?: StudioFieldOption[]
}

export interface StudioSection {
  title: string
  fields: StudioField[]
}

export interface StudioProfile {
  mediaType: string
  productType: string
  defaults: Record<string, unknown>
  sections: StudioSection[]
}