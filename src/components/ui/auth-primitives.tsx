import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"

const INPUT_CLASS =
  "w-full rounded-xl border border-input bg-muted/30 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-[3px] focus:ring-primary/15 disabled:opacity-50 transition-all duration-150"

/** Wrapper for an icon-prefixed auth input field. */
export function AuthInputWrapper({ children }: { children: ReactNode }) {
  return <div className="relative">{children}</div>
}

/** Input field used inside login / signup forms. Supply `icon` to prepend an SVG. */
export function AuthInput({
  icon,
  paddingLeft = "pl-10",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode
  paddingLeft?: string
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary">
          {icon}
        </span>
      )}
      <input {...props} className={`${INPUT_CLASS} ${icon ? paddingLeft : "px-4"} pr-4`} />
    </div>
  )
}

/** Select field used inside signup forms. Supply `icon` to prepend an SVG. */
export function AuthSelect({
  icon,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary">
          {icon}
        </span>
      )}
      <select
        {...props}
        className={`${INPUT_CLASS} appearance-none ${icon ? "pl-10" : "px-4"} pr-8 cursor-pointer`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M7 10l5 5 5-5z" />
      </svg>
    </div>
  )
}

/** Full-width submit button for auth forms. */
export function AuthSubmitButton({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean
  loadingLabel: string
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-1 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {loading ? loadingLabel : children}
    </button>
  )
}

/** Error banner rendered when an auth operation fails. */
export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  )
}
