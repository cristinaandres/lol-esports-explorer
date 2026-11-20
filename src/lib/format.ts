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

/** '2019-10-12T14:00:00Z' -> '12 Oct 2019'. The model's ISO string, never a Date. */
export function dayMonthYear(iso: string | null): string {
  if (!iso) return '—'
  const [date] = iso.split('T')
  const [year, month, day] = (date ?? '').split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const index = Number(month) - 1
  return names[index] ? `${Number(day)} ${names[index]} ${year}` : iso
}

/**
 * A series name without the source's date suffix.
 *
 * Series names arrive as "Worlds 2016 — Quarterfinals — 2016-10-14". The date is
 * already in the page header, and the header is where the site states the when,
 * so repeating it in the title reads as two different dates competing. The raw
 * string stays in the title attribute for provenance.
 */
export function stripDateSuffix(name: string): string {
  return name.replace(/\s*—\s*\d{4}-\d{2}-\d{2}$/, '')
}

/**
 * A date, or a range when two days are involved.
 *
 * 1,931 of 1,964 played series fit on one day, so a date inside a series is
 * normally a single value. The 33 that do not are bracket series played across
 * two days, and showing only the first day there would be wrong.
 */
export function dateRange(startIso: string | null, endIso: string | null): string {
  const start = startIso?.slice(0, 10) ?? ''
  const end = endIso?.slice(0, 10) ?? ''
  if (!start) return '—'
  if (!end || start === end) return dayMonthYear(startIso)
  if (start.slice(0, 7) === end.slice(0, 7)) {
    const sameMonth = `${Number(start.slice(8, 10))}–${dayMonthYear(endIso)}`
    return sameMonth
  }
  return `${dayMonthYear(startIso)} – ${dayMonthYear(endIso)}`
}

/**
 * A recorded count, or an em dash.
 *
 * Absence is not zero: 15,040 player rows carry no damage figure, and rendering
 * that as 0 would claim a player dealt no damage. Every measure on the site goes
 * through here.
 */
export function orDash(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : count(value)
}

/**
 * A per-game average, formatted so it stays comparable to the total beside it.
 *
 * One decimal below 100, whole numbers above: 3.6 kills per game is a measurement,
 * 13,371 gold per game is a magnitude. Rounding the first to "4" would make the
 * same figure disagree with the one in the header strip.
 */
export function perGame(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value < 100 ? value.toFixed(1) : count(Math.round(value))
}

/** A percentage already computed, with no denominator attached. Prefer Ratio. */
export function fixed(value: number, digits = 1): string {
  return value.toFixed(digits)
}
