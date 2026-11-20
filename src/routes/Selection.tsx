import { useMemo } from 'react'


import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { Stat, StatRow } from '../components/Stat'
import { useSelection } from '../lib/data'
import { count } from '../lib/format'
import type { SelectionCandidate } from '../lib/types'

/**
 * Why the corpus holds these events and not others.
 *
 * The dataset publishes its own audit trail: 235 candidate events, each with the
 * decision and the rule key that produced it. The site used to print only the
 * totals — "52 played of 54 admitted" — which is a claim without evidence. This
 * page is the evidence.
 *
 * It is also the answer to the question every reader has: *where is my region?*
 * An international corpus is a decision, and the rule that made it is written down.
 */
export default function Selection() {
  const state = useSelection()

  const prepared = useMemo(() => {
    if (state.status !== 'ready') return null
    const candidates = state.data
    const included = candidates.filter((row) => row.decision === 'included')
    const rejected = candidates.filter((row) => row.decision !== 'included')

    const byRule = new Map<string, { rule: string; included: number; rejected: number }>()
    for (const row of candidates) {
      const entry = byRule.get(row.rule) ?? { rule: row.rule, included: 0, rejected: 0 }
      if (row.decision === 'included') entry.included += 1
      else entry.rejected += 1
      byRule.set(row.rule, entry)
    }

    return {
      total: candidates.length,
      included,
      rejected,
      rules: [...byRule.values()].sort(
        (a, b) => b.included + b.rejected - (a.included + a.rejected) || a.rule.localeCompare(b.rule),
      ),
    } as const
  }, [state])

  if (state.status === 'loading') return <p className="text-fog-600">Loading…</p>
  if (state.status === 'failed')
    return <p className="text-side-red">Could not load the selection: {state.error.message}</p>
  if (!prepared) return null

  const { total, included, rejected, rules } = prepared

  return (
    <>
      <Breadcrumbs items={[{ label: 'Why these events' }]} />

      <PageHeader
        eyebrow="Inclusion rule"
        title="Why these events"
        lead="The corpus is every major international League of Legends event from 2011 to 2026, and nothing else. That is a rule, not a preference: it is written down, and every candidate it considered is listed here with the rule that decided."
      />

      <StatRow>
        <Stat label="Candidates" value={count(total)} />
        <Stat label="Admitted" value={count(included.length)} />
        <Stat label="Rejected" value={count(rejected.length)} />
        <Stat label="Rules applied" value={count(rules.length)} />
      </StatRow>

      <section className="mt-12">
        <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">By rule</h2>
        <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
          Each candidate is decided by exactly one rule. A fallback is not a failure of the rule but
          its default: most events are admitted or rejected because of what they are, not because of
          an exception.
        </p>

        <div className="border-line overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
                <th className="px-4 py-2.5 font-medium">Rule</th>
                <th className="px-4 py-2.5 text-right font-medium">Admitted</th>
                <th className="px-4 py-2.5 text-right font-medium">Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {rules.map((rule) => (
                <tr key={rule.rule} className="hover:bg-ink-850/50">
                  <td className="text-fog-100 px-4 py-2 font-mono text-xs">{rule.rule}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{count(rule.included)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{count(rule.rejected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">
          Left out, and why
        </h2>
        <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
          {count(rejected.length)} candidates the corpus does not carry. Each one names the rule that
          excluded it, so a reader looking for a competition they remember can find out what
          happened to it.
        </p>

        <RejectedTable rows={rejected} />
      </section>
    </>
  )
}

function RejectedTable({ rows }: { rows: SelectionCandidate[] }) {
  return (
    <div className="border-line overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
            <th className="px-4 py-2.5 font-medium">Event</th>
            <th className="px-4 py-2.5 font-medium">League</th>
            <th className="px-4 py-2.5 font-medium">Rule</th>
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-ink-850/50">
              <td className="text-fog-100 px-4 py-2">{row.name}</td>
              <td className="text-fog-500 px-4 py-2 text-xs">{row.league || '—'}</td>
              <td className="text-fog-500 px-4 py-2 font-mono text-xs">{row.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
