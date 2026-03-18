"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import {
  MAKE_BLUE_ACTIVE,
  MAKE_BLUE_ACTIVE_SOFT,
  MAKE_BLUE_BUTTON,
  MAKE_BLUE_BORDER_HEX,
  MAKE_BLUE_INPUT_FOCUS,
  MAKE_BLUE_SURFACE_HEX,
  MAKE_BLUE_TEXT,
} from "../make-theme"
import { SectionLabel } from "./studio-input-primitives"

export interface SegmentOption<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
}

type SegmentVariant = "dark" | "blue" | "teal" | "amber" | "violet"

const SEGMENT_ACTIVE: Record<SegmentVariant, string> = {
  dark: MAKE_BLUE_ACTIVE_SOFT,
  blue: MAKE_BLUE_ACTIVE_SOFT,
  teal: "bg-[#00ccb3] text-white",
  amber: "bg-[#a89450] text-white",
  violet: "bg-[#6b8fc4] text-white",
}

interface StudioSegmentProps<T extends string = string> {
  label?: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  variant?: SegmentVariant
  size?: "xs" | "sm" | "md"
}

export function StudioSegment<T extends string = string>({
  label,
  options,
  value,
  onChange,
  variant = "dark",
  size = "sm",
}: StudioSegmentProps<T>) {
  const pad = size === "xs" ? "px-2.5 py-1.5" : size === "sm" ? "px-3 py-2" : "px-4 py-2.5"
  const text = size === "xs" ? "text-[10px]" : size === "sm" ? "text-[10px]" : "text-[11px]"
  const activeClass = SEGMENT_ACTIVE[variant]

  return (
    <div className="space-y-1.5">
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="flex overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
        {options.map((opt, i) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                `flex flex-1 items-center justify-center gap-1.5 font-bold uppercase tracking-wider transition-all ${pad} ${text}`,
                active ? activeClass : "bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700",
                i > 0 ? "border-l border-neutral-200" : "",
              ].join(" ")}
            >
              {opt.icon}
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface StudioDropZoneProps {
  onDrop: (files: FileList) => void
  accept?: string
  label?: string
  hint?: string
  icon?: ReactNode
  dragging?: boolean
  compact?: boolean
}

export function StudioDropZone({ onDrop, accept, label, hint, icon, compact = false }: StudioDropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        onDrop(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      className={[
        "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed transition-all",
        compact ? "py-3" : "gap-2.5 py-8",
        dragging
          ? "border-[#9eb9da] bg-[#dbe8f6]/50"
          : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white",
      ].join(" ")}
    >
      {icon && <span className={dragging ? MAKE_BLUE_TEXT : "text-neutral-300"}>{icon}</span>}
      {label && <p className="text-[12px] font-medium text-neutral-600">{label}</p>}
      {hint && <p className="text-[10px] text-neutral-400">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onDrop(e.target.files)
        }}
      />
    </div>
  )
}

interface StudioUrlInputProps {
  label?: string
  value: string
  placeholder?: string
  onCommit: (url: string) => void
  hint?: string
  icon?: ReactNode
  buttonLabel?: string
}

export function StudioUrlInput({
  label,
  value,
  placeholder,
  onCommit,
  hint,
  icon,
  buttonLabel = "Load",
}: StudioUrlInputProps) {
  const [draft, setDraft] = useState(value)
  const prevValueRef = useRef(value)

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setDraft(value)
      prevValueRef.current = value
    }
  }, [value])

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-1.5">
          {icon && <span className="flex items-center text-neutral-400">{icon}</span>}
          <SectionLabel>{label}</SectionLabel>
        </div>
      )}
      <div className="flex items-stretch gap-0 overflow-hidden rounded-md border border-neutral-200">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onCommit(draft)}
          onKeyDown={(e) => e.key === "Enter" && onCommit(draft)}
          className={`min-h-10 min-w-0 flex-1 bg-neutral-50/80 px-3 py-2.5 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all ${MAKE_BLUE_INPUT_FOCUS}`}
        />
        <button
          type="button"
          onClick={() => onCommit(draft)}
          className="min-h-10 shrink-0 border-l border-neutral-200 bg-white px-3.5 py-2.5 text-[11px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          {buttonLabel}
        </button>
      </div>
      {hint && <p className="text-[10px] text-neutral-400">{hint}</p>}
    </div>
  )
}

interface PillOption<T extends string = string> {
  value: T
  label: string
}

interface StudioPillGroupProps<T extends string = string> {
  label?: string
  options: PillOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function StudioPillGroup<T extends string = string>({
  label,
  options,
  value,
  onChange,
}: StudioPillGroupProps<T>) {
  return (
    <div className="space-y-1.5">
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-all",
                active ? MAKE_BLUE_ACTIVE : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-white hover:text-neutral-700",
              ].join(" ")}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface StudioIconButtonProps {
  onClick: () => void
  active?: boolean
  title: string
  children: ReactNode
  danger?: boolean
  small?: boolean
}

export function StudioIconButton({ onClick, active, title, children, danger, small }: StudioIconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "flex items-center justify-center rounded-md transition-colors",
        small ? "h-6 w-6" : "h-7 w-7",
        active
          ? MAKE_BLUE_ACTIVE_SOFT
          : danger
            ? "text-neutral-400 hover:bg-destructive/10 hover:text-destructive"
            : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

interface StudioActionButtonProps {
  onClick: () => void
  disabled?: boolean
  icon?: ReactNode
  label: string
  variant?: "ghost" | "outline" | "primary" | "danger"
  size?: "sm" | "md"
}

export function StudioActionButton({
  onClick,
  disabled,
  icon,
  label,
  variant = "outline",
  size = "sm",
}: StudioActionButtonProps) {
  const base = `flex items-center gap-1.5 rounded-md font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3.5 py-1.5 text-[11px]"}`

  const variantClass = {
    ghost: "text-neutral-600 hover:bg-neutral-100",
    outline: "border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300",
    primary: `border ${MAKE_BLUE_BUTTON}`,
    danger: "border border-destructive/30 text-destructive hover:bg-destructive/5",
  }[variant]

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${variantClass}`}>
      {icon}
      {label}
    </button>
  )
}