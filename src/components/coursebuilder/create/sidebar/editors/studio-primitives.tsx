"use client"

/**
 * Studio Primitives
 *
 * Shared interactive components for all card-type editors in the Make panel.
 * Every interactive element in the studio must use one of these primitives —
 * no bare HTML inputs, unstyled buttons, or raw label/input pairs.
 */

import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from "react"
import { ChevronDown } from "lucide-react"

// ─── Focus ring utility ────────────────────────────────────────────────────────

const BASE_INPUT =
  "w-full rounded-md border border-neutral-200 bg-neutral-50/80 px-2.5 py-2 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all focus:border-[#4a94ff]/60 focus:bg-white focus:shadow-[0_0_0_3px_rgba(74,148,255,0.06)] disabled:cursor-not-allowed disabled:opacity-50"

// ─── Section label ─────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
      {children}
    </p>
  )
}

// ─── StudioSection ─────────────────────────────────────────────────────────────

interface StudioSectionProps {
  label?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  noBorder?: boolean
}

export function StudioSection({ label, action, children, className, noBorder }: StudioSectionProps) {
  return (
    <div
      className={[
        "px-4 py-3 space-y-3",
        !noBorder && "border-b border-neutral-100",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(label || action) && (
        <div className="flex items-center justify-between">
          {label && <SectionLabel>{label}</SectionLabel>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── StudioInput ──────────────────────────────────────────────────────────────

interface StudioInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  badge?: string
  badgeVariant?: "required" | "optional" | "info"
  icon?: ReactNode
}

export function StudioInput({
  label,
  hint,
  badge,
  badgeVariant = "required",
  icon,
  className,
  ...props
}: StudioInputProps) {
  const badgeClass = {
    required: "bg-red-100 text-red-600",
    optional: "bg-neutral-100 text-neutral-500",
    info:     "bg-[#4a94ff]/10 text-[#2b6cd2]",
  }[badgeVariant]

  return (
    <div className="space-y-1.5">
      {(label || badge) && (
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-neutral-400 flex items-center">{icon}</span>}
          {label && <SectionLabel>{label}</SectionLabel>}
          {badge && (
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${badgeClass}`}>
              {badge}
            </span>
          )}
        </div>
      )}
      <input className={[BASE_INPUT, className].filter(Boolean).join(" ")} {...props} />
      {hint && <p className="text-[10px] text-neutral-400">{hint}</p>}
    </div>
  )
}

// ─── StudioTextarea ───────────────────────────────────────────────────────────

interface StudioTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  icon?: ReactNode
  badge?: string
}

export function StudioTextarea({ label, hint, icon, badge, className, ...props }: StudioTextareaProps) {
  return (
    <div className="space-y-1.5">
      {(label || badge) && (
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-neutral-400 flex items-center">{icon}</span>}
          {label && <SectionLabel>{label}</SectionLabel>}
          {badge && (
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-neutral-500">
              {badge}
            </span>
          )}
        </div>
      )}
      <textarea
        className={[
          "w-full resize-none rounded-md border border-neutral-200 bg-neutral-50/80 px-2.5 py-2 text-[12px] leading-relaxed text-neutral-800 placeholder:text-neutral-400 outline-none transition-all focus:border-[#4a94ff]/60 focus:bg-white focus:shadow-[0_0_0_3px_rgba(74,148,255,0.06)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {hint && <p className="text-[10px] text-neutral-400">{hint}</p>}
    </div>
  )
}

// ─── StudioSelect ─────────────────────────────────────────────────────────────

interface StudioSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
}

export function StudioSelect({ label, hint, className, children, ...props }: StudioSelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="relative">
        <select
          className={[
            "w-full appearance-none rounded-md border border-neutral-200 bg-neutral-50/80 py-2 pl-2.5 pr-7 text-[12px] text-neutral-800 outline-none transition-all focus:border-[#4a94ff]/60 focus:bg-white focus:shadow-[0_0_0_3px_rgba(74,148,255,0.06)] cursor-pointer",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={11}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
        />
      </div>
      {hint && <p className="text-[10px] text-neutral-400">{hint}</p>}
    </div>
  )
}

// ─── StudioNumberInput ────────────────────────────────────────────────────────

interface StudioNumberInputProps {
  label?: string
  hint?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

export function StudioNumberInput({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  unit,
}: StudioNumberInputProps) {
  const dec = () => onChange(Math.max(min, Number((value - step).toFixed(10))))
  const inc = () => onChange(Math.min(max, Number((value + step).toFixed(10))))

  return (
    <div className="space-y-1.5">
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="flex items-stretch overflow-hidden rounded-md border border-neutral-200 bg-white">
        <button
          type="button"
          onClick={dec}
          className="shrink-0 px-3 py-1.5 text-[14px] font-light text-neutral-500 hover:bg-neutral-100 transition-colors border-r border-neutral-200 select-none"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1 px-2 py-1.5 text-[12px] text-center font-mono text-neutral-800 outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={inc}
          className="shrink-0 px-3 py-1.5 text-[14px] font-light text-neutral-500 hover:bg-neutral-100 transition-colors border-l border-neutral-200 select-none"
        >
          +
        </button>
      </div>
      {(unit || hint) && <p className="text-[10px] text-neutral-400">{unit ?? hint}</p>}
    </div>
  )
}

// ─── StudioSlider ─────────────────────────────────────────────────────────────

interface StudioSliderProps {
  label?: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (value: number) => void
}

export function StudioSlider({ label, value, min, max, step = 1, format, onChange }: StudioSliderProps) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        {label && <SectionLabel>{label}</SectionLabel>}
        <span className="text-[11px] font-mono font-semibold text-neutral-700">
          {format ? format(value) : value}
        </span>
      </div>
      <div className="relative flex h-4 items-center">
        {/* Track */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Invisible native range for interaction */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
        {/* Thumb */}
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-neutral-900 bg-white shadow-sm transition-all"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── StudioToggle ─────────────────────────────────────────────────────────────

interface StudioToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
  accentColor?: string
}

export function StudioToggle({
  label,
  description,
  checked,
  onChange,
  accentColor = "#4a94ff",
}: StudioToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-neutral-700">{label}</p>
        {description && <p className="text-[10px] text-neutral-400 leading-snug">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative shrink-0 h-6 w-11 rounded-full border transition-all"
        style={
          checked
            ? { borderColor: `${accentColor}55`, backgroundColor: accentColor }
            : { borderColor: "#d1d5db", backgroundColor: "#e5e7eb" }
        }
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  )
}

// ─── StudioSegment ────────────────────────────────────────────────────────────

export interface SegmentOption<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
}

type SegmentVariant = "dark" | "blue" | "teal" | "amber" | "violet"

const SEGMENT_ACTIVE: Record<SegmentVariant, string> = {
  dark:   "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
  blue:   "bg-[#4a94ff] text-white",
  teal:   "bg-[#00ccb3] text-white",
  amber:  "bg-amber-500 text-white",
  violet: "bg-violet-500 text-white",
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
  const pad = size === "xs" ? "px-2 py-1" : size === "sm" ? "px-3 py-1.5" : "px-4 py-2"
  const text = size === "xs" ? "text-[9px]" : size === "sm" ? "text-[10px]" : "text-[11px]"
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

// ─── StudioDropZone ───────────────────────────────────────────────────────────

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
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onDrop(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      className={[
        "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed transition-all",
        compact ? "py-3" : "py-8 gap-2.5",
        dragging
          ? "border-[#4a94ff] bg-[#4a94ff]/5"
          : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white",
      ].join(" ")}
    >
      {icon && (
        <span className={dragging ? "text-[#4a94ff]" : "text-neutral-300"}>{icon}</span>
      )}
      {label && <p className="text-[12px] font-medium text-neutral-600">{label}</p>}
      {hint && <p className="text-[10px] text-neutral-400">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { if (e.target.files) onDrop(e.target.files) }}
      />
    </div>
  )
}

// ─── StudioUrlInput ───────────────────────────────────────────────────────────

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

  // Sync external value changes (e.g. reset from parent)
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
          {icon && <span className="text-neutral-400 flex items-center">{icon}</span>}
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
          className="min-w-0 flex-1 bg-neutral-50/80 px-2.5 py-2 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all focus:bg-white"
        />
        <button
          type="button"
          onClick={() => onCommit(draft)}
          className="shrink-0 border-l border-neutral-200 bg-neutral-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-neutral-800 transition-colors"
        >
          {buttonLabel}
        </button>
      </div>
      {hint && <p className="text-[10px] text-neutral-400">{hint}</p>}
    </div>
  )
}

// ─── StudioPillGroup ──────────────────────────────────────────────────────────
// Compact horizontal pill list for mutually exclusive options (e.g. speed presets)

interface PillOption<T extends string = string> {
  value: T
  label: string
}

interface StudioPillGroupProps<T extends string = string> {
  label?: string
  options: PillOption<T>[]
  value: T
  onChange: (value: T) => void
  accentColor?: string
}

export function StudioPillGroup<T extends string = string>({
  label,
  options,
  value,
  onChange,
  accentColor = "#4a94ff",
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
              className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all"
              style={
                active
                  ? { backgroundColor: accentColor, color: "#fff", border: `1px solid ${accentColor}` }
                  : { backgroundColor: "#f5f5f5", color: "#6b7280", border: "1px solid #e5e7eb" }
              }
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── StudioIconButton ─────────────────────────────────────────────────────────

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
          ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
          : danger
          ? "text-neutral-400 hover:bg-red-50 hover:text-red-500"
          : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

// ─── StudioActionButton ───────────────────────────────────────────────────────

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
    ghost:   "text-neutral-600 hover:bg-neutral-100",
    outline: "border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300",
    primary: "border border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] hover:bg-[#cedef0]",
    danger:  "border border-red-200 text-red-600 hover:bg-red-50",
  }[variant]

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${variantClass}`}>
      {icon}
      {label}
    </button>
  )
}
