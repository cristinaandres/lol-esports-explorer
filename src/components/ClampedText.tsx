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
 * The button is only rendered when the text actually overflows, measured after
 * layout: a "See more" that reveals nothing is a control that lies about the
 * content. The clamp itself is the `line-clamp-2` utility rather than a height in
 * pixels, so it follows the line-height instead of guessing it.
 */
export function ClampedText({ children }: { children: ReactNode }) {
  const id = useId()
  const paragraph = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  // Measured only while clamped: expanded, the box fits its content by definition and
  // a re-measure would conclude the text is short and take the collapse button away.
  useEffect(() => {
    if (expanded) return
    const element = paragraph.current
    if (!element) return
    setOverflows(element.scrollHeight > element.clientHeight + 1)
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
