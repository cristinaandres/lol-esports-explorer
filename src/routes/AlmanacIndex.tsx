import { Link } from 'react-router'

import { VerdictChip } from '../components/Answer'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { LoadFailure } from '../components/LoadFailure'
import { PageHeader } from '../components/PageHeader'
import { Skeleton } from '../components/Skeleton'
import { classLabel, familyLabel, groupByClass, questionHref } from '../lib/almanac'
import { useAlmanac } from '../lib/data'
import type { AlmanacCard, AlmanacIndex } from '../lib/answer'

/**
 * The Almanac's index: the eighteen cards, in four classes.
 *
 * A card carries the headline of the all-games window, because a reader who does
 * not click still deserves the number with its denominator. The class is the
 * navigation; the answer family is a tag on the card, not a second menu.
 */
export default function AlmanacIndexRoute() {
  const state = useAlmanac()

  if (state.status === 'loading') return <Skeleton shape="cards" />
  if (state.status === 'failed')
    return <LoadFailure failures={[{ what: 'The Almanac', error: state.error }]} onRetry={state.retry} />

  return <AlmanacIndexView index={state.data} />
}

export function AlmanacIndexView({ index }: { index: AlmanacIndex }) {
  const groups = groupByClass(index.cards)

  return (
    <>
      <Breadcrumbs items={[{ label: 'The Almanac' }]} />
      <PageHeader
        eyebrow="Eighteen questions · four classes"
        title="The Almanac"
        lead="The recurring questions a pick'em asks, answered as records from a window of the past. Each card carries a number with its interval and its sample; each entry page carries the evidence, the limits and the cut date. It is descriptive: it does not predict a match."
      />

      <div className="space-y-14">
        {groups.map((group) => (
          <section key={group.cls} aria-labelledby={`class-${group.cls}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`class-${group.cls}`} className="text-fog-100 text-lg font-semibold tracking-tight">
                {group.title}
              </h2>
              <span className="text-fog-600 font-mono text-xs">{group.cards.length} questions</span>
            </div>
            <p className="text-fog-500 mb-6 max-w-3xl text-sm leading-relaxed">{group.blurb}</p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.cards.map((card) => (
                <Card key={card.id} card={card} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="text-fog-600 mt-14 max-w-3xl text-xs leading-relaxed">
        The catalogue is closed. A new question is a spec change and a new row in the audit,
        never a string typed at runtime. Every card answers from a season of the past; the
        prediction phase is separate and deferred.
      </p>
    </>
  )
}

function Card({ card }: { card: AlmanacCard }) {
  return (
    <Link
      to={questionHref(card.id)}
      className="border-line bg-ink-900 hover:border-line-bright hover:bg-ink-850 group flex min-h-48 flex-col rounded-xl border p-5 no-underline transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-fog-600 font-mono text-[10px] tracking-[0.14em] uppercase">
          {familyLabel(card.family)}
        </span>
        <VerdictChip verdict={card.verdict} />
      </div>

      <h3 className="text-fog-100 group-hover:text-gold mt-3 text-sm leading-snug font-semibold tracking-tight transition-colors">
        {card.question}
      </h3>

      <p className="text-fog-300 mt-3 text-sm leading-relaxed tabular-nums line-clamp-4">
        {card.headline.text}
      </p>

      <p className="text-fog-600 mt-auto pt-4 text-[11px]">
        {classLabel(card.class)} · All games · open the evidence →
      </p>
    </Link>
  )
}
