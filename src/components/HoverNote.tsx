import { useId, type ReactNode } from 'react'

/**
 * A note that appears over the number it explains.
 *
 * Used where a figure is correct but reads as a defect until explained — "248 /
 * 410" is a source gap, not a half-played career. The note opens on hover and on
 * keyboard focus, and the trigger carries a native `title` so a touch device or a
 * screen reader still gets the text without the bubble.
 */
export function HoverNote({ note, children }: { note: string; children: ReactNode }) {
  const id = useId()

  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        aria-describedby={id}
        title={note}
        className="border-fog-600/60 cursor-help border-b border-dotted"
      >
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className="border-line bg-ink-800 text-fog-300 pointer-events-none absolute right-0 bottom-full z-30 mb-2 w-64 rounded-lg border p-2.5 text-left text-[11px] leading-relaxed opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {note}
      </span>
    </span>
  )
}
