/** Number formatting for the site. One place, so a count never renders two ways. */

const integer = new Intl.NumberFormat('en-GB')

export function count(value: number): string {
  return integer.format(value)
}

/** The integer percentage alone. Never render this without its denominator. */
export function percent(part: number, total: number): string {
  if (total <= 0) return '—'
  return `${Math.round((part / total) * 100)}%`
}

/** '3,091' -> used where a count is the subject of the sentence. */
export function duration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const whole = Math.round(seconds)
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

/** '2016-01-14' -> 'Jan 2016'. Dates are the model's ISO strings, never Date objects. */
export function monthYear(iso: string | null): string {
  if (!iso) return '—'
  const [year, month] = iso.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const index = Number(month) - 1
  return names[index] ? `${names[index]} ${year}` : iso
}

export function isoDate(iso: string | null): string {
  return iso ?? '—'
}
