import type { Category } from "./files-browser-data"
import { MAKE_BLUE_ACTIVE } from "./make-theme"

export function CategoryButton({
  cat,
  isActive,
  needsLayout,
  onClick,
}: {
  cat: Category
  isActive: boolean
  needsLayout?: boolean
  onClick: () => void
}) {
  const highlight = cat.id === "layout" && needsLayout

  return (
    <button
      type="button"
      onClick={onClick}
      title={cat.label}
      className={[
        "relative inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
        isActive
          ? MAKE_BLUE_ACTIVE
          : highlight
            ? "border-amber-300 bg-amber-50 text-amber-700"
            : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700",
      ].join(" ")}
    >
      <cat.Icon size={14} strokeWidth={1.7} />
      <span className="leading-none">{cat.label}</span>
      {highlight && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
    </button>
  )
}