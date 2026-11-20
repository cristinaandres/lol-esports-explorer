import type { CareerFilter } from '../lib/filters'

/**
 * The filter bar: competition, then year.
 *
 * Two native selects rather than a custom dropdown, because a `<select>` is
 * keyboard-operable, announced correctly and usable on a phone without a line of
 * JavaScript. The era sits beside them as a read-only chip: it is not a control,
 * it is what the current selection falls into.
 */
export function CareerFilters({
  filter,
  options,
  eraLabel,
  onChange,
  onClear,
}: {
  filter: CareerFilter
  options: { competitions: string[]; years: number[] }
  eraLabel: string | null
  onChange: (next: CareerFilter) => void
  onClear: () => void
}) {
  const active = filter.competition !== null || filter.year !== null

  return (
    <div className="border-line bg-ink-900/60 mb-8 flex flex-wrap items-end gap-x-6 gap-y-4 rounded-xl border px-4 py-3">
      <Field label="Competition">
        <Select
          value={filter.competition ?? ''}
          onChange={(value) => onChange({ ...filter, competition: value || null })}
          options={[
            { value: '', label: 'All competitions' },
            ...options.competitions.map((competition) => ({ value: competition, label: competition })),
          ]}
        />
      </Field>

      <Field label="Year">
        <Select
          value={filter.year === null ? '' : String(filter.year)}
          onChange={(value) => onChange({ ...filter, year: value ? Number(value) : null })}
          options={[
            { value: '', label: 'All years' },
            ...options.years.map((year) => ({ value: String(year), label: String(year) })),
          ]}
        />
      </Field>

      {eraLabel ? (
        <div className="pb-1">
          <div className="text-fog-600 text-[10px] tracking-[0.14em] uppercase">Era</div>
          <div
            className="text-fog-300 mt-1.5 text-sm"
            title="Derived from the games the filters leave. Not a filter: era and year as two independent controls would allow combinations that cannot exist."
          >
            {eraLabel}
            <span className="text-fog-600 ml-2 text-[10px] tracking-wider uppercase">derived</span>
          </div>
        </div>
      ) : null}

      {active ? (
        <button
          type="button"
          onClick={onClear}
          className="text-fog-500 hover:text-fog-100 ml-auto pb-1.5 text-xs underline-offset-4 hover:underline"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-fog-600 block text-[10px] tracking-[0.14em] uppercase">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border-line bg-ink-850 text-fog-100 focus-visible:outline-gold min-w-44 cursor-pointer rounded-lg border px-3 py-1.5 text-sm"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
