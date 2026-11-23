import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A note that appears over the thing it explains.
 *
 * Used where a figure is correct but reads as a defect until explained — "248 /
 * 410" is a source gap, not a half-played career. The note opens on hover and on
 * keyboard focus, and the trigger carries a native `title` so a touch device or a
 * screen reader still gets the text without the bubble.
 *
 * The bubble is placed so it stays on screen. Anchoring it to one edge is wrong at
 * one width or another — a trigger near the left edge overflows left, one near the
 * right edge overflows right, and the player page and the event page put theirs in
 * both places — so the anchor is the trigger's right edge and the shift is measured
 * from it, in the same direction either way.
 *
 * Placement runs when the note *opens*, which is the wrapper's hover or focus rather
 * than the trigger's own pointer enter: a trigger that arrives under a pointer that is
 * already still — data landing after a skeleton, a filter re-render — is shown by the
 * CSS alone, with no enter event on the trigger to measure from. It re-runs on resize
 * while open, so a bubble that fits at one width does not hang off the screen at
 * another.
 */
const MARGIN = 8

export function HoverNote({ note, children }: { note: string; children: ReactNode }) {
  const id = useId()
  const anchor = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)
  const [open, setOpen] = useState(false)

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

  // Layout effect, not effect: the bubble is revealed by CSS the moment the wrapper is
  // hovered, so measuring after paint would show one frame at the unplaced position.
  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, place])

  return (
    <span
      className="group relative inline-flex align-baseline"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span
        ref={anchor}
        tabIndex={0}
        aria-describedby={id}
        title={note}
        className="border-fog-600/60 cursor-help border-b border-dotted"
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
