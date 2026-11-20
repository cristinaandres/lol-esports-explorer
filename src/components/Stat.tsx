import type { ReactNode } from 'react'

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <dt className="text-fog-600 text-[11px] tracking-[0.14em] uppercase">{label}</dt>
      <dd className="text-fog-100 mt-1.5 text-xl font-semibold tabular-nums">{value}</dd>
      {hint ? <dd className="text-fog-600 mt-1 text-xs">{hint}</dd> : null}
    </div>
  )
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <dl className="border-line grid grid-cols-2 gap-x-6 gap-y-6 border-y py-6 sm:grid-cols-3 lg:grid-cols-6">
      {children}
    </dl>
  )
}
