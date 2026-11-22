import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/**
 * A paragraph that is allowed two lines, and a button to read the rest.
 *
 * Used where an explainer has to sit beside a shorter one and its full sentence
 * would make one column taller than the other — the reader gets the claim, then the
 * ellipsis, then the choice to read the rest. Nothing is hidden from a screen reader
 * or from search: the text is in the DOM at every width, only clipped, and the
 * button carries `aria-expanded` and `aria-controls` so the state is not carried by
 * the word alone.
 *
 * The button is only rendered when the text actually overflows, measured after layout
 * and re-measured whenever the element changes size — a narrower window, a font that
 * loads late — because a control that appears once and then lies is worse than none. The
 * clamp itself is the `line-clamp-2` utility rather than a height in pixels, so it
 * follows the line-height instead of guessing it.
 *
 * Clipped text is not interactive text: a link inside the clamp can be reached by Tab
 * while invisible, which is a focus trap a reader cannot see. Callers put links beside
 * the note, not inside it.
 */
export function ClampedText({ children }: { children: ReactNode }) {
  const id = useId()
  const paragraph = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  // Measured only while clamped: expanded, the box fits its content by definition and
  // a re-measure would conclude the text is short and take the collapse button away.
  useEffect(() => {
    const element = paragraph.current
    if (!element || expanded) return

    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1)
    measure()

    // A window that narrows, or a font that arrives after first paint, changes whether
    // the text fits while the element's own height stays clamped at two lines — so the
    // box is observed for width as well, and the font set re-measures when it settles.
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    void document.fonts?.ready.then(measure)

    return () => observer.disconnect()
  }, [expanded, children])

  return (
    <div>
      <p
        ref={paragraph}
        id={id}
        className={
          expanded
            ? 'text-fog-500 text-sm leading-relaxed'
            : 'text-fog-500 line-clamp-2 text-sm leading-relaxed'
        }
      >
        {children}
      </p>
      {overflows ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((open) => !open)}
          className="text-fog-600 hover:text-fog-100 mt-1 text-xs"
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      ) : null}
    </div>
  )
}
