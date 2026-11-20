/**
 * What a page shows while its data arrives.
 *
 * A skeleton rather than the word "Loading", because the word tells a reader
 * nothing and then everything moves when the data lands. The blocks reserve roughly
 * the height of what is coming, so the page settles instead of jumping.
 *
 * It is announced as busy rather than read as content, and the label is the only
 * text: nothing here is a claim about the data.
 */
export function PageSkeleton({ blocks = 2 }: { blocks?: number }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" aria-label="Loading" className="animate-pulse">
      <div className="bg-ink-800 h-3 w-24 rounded" />
      <div className="bg-ink-800 mt-4 h-10 w-2/3 rounded" />
      <div className="bg-ink-800/60 mt-4 h-4 w-1/2 rounded" />

      <div className="border-line mt-10 grid grid-cols-2 gap-6 border-y py-6 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}>
            <div className="bg-ink-800/60 h-2.5 w-16 rounded" />
            <div className="bg-ink-800 mt-3 h-6 w-20 rounded" />
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-3">
        {Array.from({ length: blocks }, (_, index) => (
          <div key={index} className="bg-ink-900 border-line h-40 rounded-xl border" />
        ))}
      </div>
    </div>
  )
}
