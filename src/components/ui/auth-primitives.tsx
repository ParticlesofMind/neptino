import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"

const INPUT_CLASS =
  "w-full rounded-xl border border-[#d4d4d4] bg-[#fafafa] py-2.5 text-sm text-[#171717] placeholder:text-[#a3a3a3] focus:border-[#4a94ff] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#4a94ff]/15 disabled:opacity-50 transition-all duration-150"

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
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4a94ff]">
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
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4a94ff]">
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
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]"
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
      className="mt-1 w-full rounded-xl bg-[#4a94ff] py-2.5 text-sm font-semibold text-white hover:bg-[#2f7de0] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a94ff]"
    >
      {loading ? loadingLabel : children}
    </button>
  )
}

/** Error banner rendered when an auth operation fails. */
export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-[#fef2f2] border border-[#fee2e2] px-4 py-3 text-sm text-[#b91c1c]">
      {message}
    </div>
  )
}
