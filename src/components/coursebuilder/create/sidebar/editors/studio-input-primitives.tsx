"use client"

import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react"
import { ChevronDown } from "lucide-react"
import {
  MAKE_BLUE_ACTIVE,
  MAKE_BLUE_BADGE,
  MAKE_BLUE_BORDER_HEX,
  MAKE_BLUE_INPUT_FOCUS,
  MAKE_BLUE_SURFACE_HEX,
  MAKE_BLUE_TEXT,
} from "../make-theme"

const BASE_INPUT =
  `min-h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/80 px-3 py-2.5 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 ${MAKE_BLUE_INPUT_FOCUS}`

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
      {children}
    </p>
  )
}

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
    info: MAKE_BLUE_BADGE,
  }[badgeVariant]

  return (
    <div className="space-y-1.5">
      {(label || badge) && (
        <div className="flex items-center gap-1.5">
          {icon && <span className="flex items-center text-neutral-400">{icon}</span>}
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
          {icon && <span className="flex items-center text-neutral-400">{icon}</span>}
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
          "w-full resize-none rounded-md border border-neutral-200 bg-neutral-50/80 px-3 py-2.5 text-[12px] leading-relaxed text-neutral-800 placeholder:text-neutral-400 outline-none transition-all",
          MAKE_BLUE_INPUT_FOCUS,
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
            `min-h-10 w-full appearance-none rounded-md border border-neutral-200 bg-neutral-50/80 py-2.5 pl-3 pr-8 text-[12px] text-neutral-800 outline-none transition-all cursor-pointer ${MAKE_BLUE_INPUT_FOCUS}`,
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
      <div className="flex min-h-10 items-stretch overflow-hidden rounded-md border border-neutral-200 bg-white">
        <button
          type="button"
          onClick={dec}
          className="shrink-0 border-r border-neutral-200 px-3.5 py-2.5 text-[14px] font-light text-neutral-500 transition-colors select-none hover:bg-neutral-100"
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
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[12px] text-center font-mono text-neutral-800 outline-none"
        />
        <button
          type="button"
          onClick={inc}
          className="shrink-0 border-l border-neutral-200 px-3.5 py-2.5 text-[14px] font-light text-neutral-500 transition-colors select-none hover:bg-neutral-100"
        >
          +
        </button>
      </div>
      {(unit || hint) && <p className="text-[10px] text-neutral-400">{unit ?? hint}</p>}
    </div>
  )
}

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
        <div className="absolute inset-x-0 h-1 rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-neutral-900 bg-white shadow-sm transition-all"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}

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
  accentColor = MAKE_BLUE_BORDER_HEX,
}: StudioToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
        checked
          ? MAKE_BLUE_ACTIVE
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className={["text-[11px] font-semibold", checked ? MAKE_BLUE_TEXT : "text-neutral-700"].join(" ")}>{label}</p>
        {description && <p className="text-[10px] leading-snug text-neutral-400">{description}</p>}
      </div>
      <span
        className="relative h-6 w-11 shrink-0 rounded-full border transition-all"
        style={
          checked
            ? { borderColor: MAKE_BLUE_BORDER_HEX, backgroundColor: MAKE_BLUE_SURFACE_HEX }
            : { borderColor: "#d1d5db", backgroundColor: "#e5e7eb" }
        }
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  )
}