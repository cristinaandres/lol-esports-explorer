import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  lead,
  aside,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lead?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-fog-600 mb-3 text-xs tracking-[0.18em] uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="text-fog-100 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {lead ? <p className="text-fog-300 mt-4 text-base leading-relaxed">{lead}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  )
}
