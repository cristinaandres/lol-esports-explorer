/**
 * A labelled native select.
 *
 * Native rather than a custom dropdown, for the reason `CareerFilters` gives: a
 * `<select>` is keyboard-operable, announced correctly and usable on a phone without a
 * line of JavaScript. One component, because the filter bar and the index sort would
 * otherwise each carry their own copy of the same classes and drift.
 *
 * `min-h-11` is 44 px: below that a control is a coin toss with a thumb, and this one is
 * the only way to reach a sort on a phone. The height is set here rather than per page so
 * the sort and the career filters cannot end up different sizes.
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
          className="border-line bg-ink-850 text-fog-100 focus-visible:outline-gold min-h-11 min-w-44 cursor-pointer rounded-lg border px-3 py-1.5 text-sm"
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
