import { forwardRef, type CSSProperties, type ReactNode } from 'react'

export const Tooltip = forwardRef<HTMLDivElement, { children: ReactNode; style?: CSSProperties }>(function Tooltip({ children, style }, ref) {
  return (
    <div
      ref={ref}
      role="tooltip"
      data-testid="fleet-tooltip"
      className="pointer-events-none absolute z-30 min-w-48 rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl"
      style={style}
    >
      {children}
    </div>
  )
})
