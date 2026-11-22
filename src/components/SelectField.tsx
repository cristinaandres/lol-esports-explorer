/**
 * A labelled native select.
 *
 * Native rather than a custom dropdown, for the reason `CareerFilters` gives: a
 * `<select>` is keyboard-operable, announced correctly and usable on a phone without a
 * line of JavaScript. One component, because the filter bar and the index sort would
 * otherwise each carry their own copy of the same classes and drift.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-fog-600 block text-[10px] tracking-[0.14em] uppercase">{label}</span>
      <span className="mt-1.5 block">
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
      </span>
    </label>
  )
}
