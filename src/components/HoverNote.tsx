import { useCallback, useId, useRef, useState, type ReactNode } from 'react'

/**
 * A note that appears over the thing it explains.
 *
 * Used where a figure is correct but reads as a defect until explained — "248 /
 * 410" is a source gap, not a half-played career. The note opens on hover and on
 * keyboard focus, and the trigger carries a native `title` so a touch device or a
 * screen reader still gets the text without the bubble.
 *
 * Two triggers, because the two places this is used are different: `text` underlines
 * the figure itself, and `icon` puts a small circled `i` beside a sentence whose
 * qualifying detail — which events the source covers, why a zero is a measurement —
 * would otherwise be three lines of prose before the reader reaches the rows. The
 * sentence keeps the claim; the note keeps the evidence for it.
 *
 * The bubble is placed so it stays on screen. Anchoring it to one edge is wrong at
 * one width or another — a trigger near the left edge overflows left, one near the
 * right edge overflows right, and the player page and the event page put theirs in
 * both places — so the anchor is the trigger's right edge and the shift is measured
 * from it, in the same direction either way.
 */
const MARGIN = 8

export function HoverNote({
  note,
  children,
  variant = 'text',
  label,
}: {
  note: string
  children: ReactNode
  variant?: 'text' | 'icon'
  /** What the icon is for, read by a screen reader instead of a bare "i". */
  label?: string
}) {
  const id = useId()
  const anchor = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)

  const place = useCallback(() => {
    const trigger = anchor.current?.getBoundingClientRect()
    const width = bubble.current?.offsetWidth ?? 0
    if (!trigger || width === 0) return

    // Three candidates, in order of how a reader would want them: open with the
    // bubble's left edge on the trigger's, which reads as hanging off the word; if
    // that runs off the right, flip so it ends on the trigger's right edge; if
    // neither fits, push it inside the margin and let it overlap the trigger.
    const anchoredRight = trigger.right - width
    const anchoredLeft = trigger.left
    const fits = (left: number) => left >= MARGIN && left + width <= window.innerWidth - MARGIN
    const left = fits(anchoredLeft)
      ? anchoredLeft
      : fits(anchoredRight)
        ? anchoredRight
        : Math.min(Math.max(anchoredLeft, MARGIN), window.innerWidth - MARGIN - width)
    setShift(left - anchoredRight)
  }, [])

  const triggerClass =
    variant === 'icon'
      ? 'border-fog-600/60 text-fog-500 inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border font-mono text-[10px] leading-none'
      : 'border-fog-600/60 cursor-help border-b border-dotted'

  return (
    <span className="group relative inline-flex align-baseline">
      <span
        ref={anchor}
        tabIndex={0}
        aria-describedby={id}
        aria-label={variant === 'icon' ? label : undefined}
        title={note}
        className={triggerClass}
        onPointerEnter={place}
        onFocus={place}
      >
        {children}
      </span>
      <span
        ref={bubble}
        role="tooltip"
        id={id}
        style={{ transform: `translateX(${shift}px)` }}
        className="border-line bg-ink-800 text-fog-300 pointer-events-none absolute right-0 bottom-full z-30 mb-2 w-64 rounded-lg border p-2.5 text-left text-[11px] leading-relaxed opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {note}
      </span>
    </span>
  )
}
