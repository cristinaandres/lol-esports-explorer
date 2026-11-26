import type { End } from '../../lib/answer'
import { SelectField } from '../SelectField'

/**
 * The three controls every entry page shares.
 *
 * They are values and a callback, not a URL: the route owns the query string, so this
 * component stays testable and the same control works on a page that has not yet
 * mounted a router. A season is `all` or a year; an end exists only on a two-ended
 * card; the ranking is the K the page prints.
 */
export function TimeControls({
  season,
  end,
  top,
  seasons,
  ends,
  onChange,
}: {
  season: string
  end: End | null
  top: number
  seasons: { value: string; label: string }[]
  ends: End[]
  onChange: (patch: { season?: string; end?: End; top?: number }) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <SelectField
        label="Season"
        value={season}
        options={[{ value: 'all', label: 'All games' }, ...seasons]}
        onChange={(value) => onChange({ season: value })}
      />
      {ends.length > 1 ? (
        <SelectField
          label="End"
          value={end ?? 'best'}
          options={[
            { value: 'best', label: 'Best' },
            { value: 'worst', label: 'Worst' },
          ]}
          onChange={(value) => onChange({ end: value as End })}
        />
      ) : null}
      <SelectField
        label="Ranking"
        value={String(top)}
        options={[
          { value: '5', label: 'Top 5' },
          { value: '10', label: 'Top 10' },
          { value: '20', label: 'Top 20' },
        ]}
        onChange={(value) => onChange({ top: Number(value) })}
      />
    </div>
  )
}
