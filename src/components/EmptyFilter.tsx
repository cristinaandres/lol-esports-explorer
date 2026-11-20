/**
 * The state a filter produces when nothing survives it.
 *
 * Names what emptied the view and offers one control that restores a view with
 * games in it — the caller computes both, because only it knows which half of the
 * filter is to blame. This component is deliberately dumb so the two entity pages
 * cannot drift into saying it differently.
 */
export function EmptyFilter({
  title,
  body,
  action,
  onAction,
}: {
  title: string
  body: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="border-line bg-ink-900 rounded-xl border p-6">
      <h2 className="text-fog-100 text-base font-semibold">{title}</h2>
      <p className="text-fog-300 mt-2 max-w-xl text-sm leading-relaxed">{body}</p>
      <button
        type="button"
        onClick={onAction}
        className="border-line hover:border-line-bright text-gold mt-4 rounded-lg border px-3 py-1.5 text-sm"
      >
        {action}
      </button>
    </div>
  )
}
