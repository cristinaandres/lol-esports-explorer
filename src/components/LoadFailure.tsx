/**
 * What a page shows when the artifact it asked for did not arrive.
 *
 * The dataset has already loaded by the time this renders, so the page can still
 * say which part is missing: a failure here is one file, not the route. The block
 * repeats the loader's own message rather than inventing a cause, and offers the
 * one action that helps — asking again, which is a fresh request because a
 * rejection is not kept. See `memoised` and `useAsync` in `src/lib/data.ts`.
 *
 * A page can be missing more than one file (a champion page needs the player rows
 * and the bans), so the block takes the list and names each one instead of
 * reporting a generic "data error".
 */
export type LoadFailureReport = { what: string; error: Error }

export function LoadFailure({
  failures,
  onRetry,
}: {
  failures: LoadFailureReport[]
  onRetry: () => void
}) {
  const names = failures.map((failure) => failure.what).join(' and ')

  return (
    <div className="border-line bg-ink-900 rounded-xl border p-6">
      <p className="text-side-red text-sm">Could not load {names}.</p>
      {failures.map((failure) => (
        <p key={failure.what} className="text-fog-500 mt-2 font-mono text-xs">
          {failure.error.message}
        </p>
      ))}
      <button
        type="button"
        onClick={onRetry}
        className="border-line hover:border-line-bright text-gold mt-4 rounded-lg border px-3 py-1.5 text-sm"
      >
        Try again
      </button>
    </div>
  )
}
