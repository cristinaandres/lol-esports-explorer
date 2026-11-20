import { Link } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageSkeleton } from '../components/PageSkeleton'
import { EraGrid } from '../components/EraGrid'
import { PageHeader } from '../components/PageHeader'
import { useDataset } from '../lib/data'
import { count } from '../lib/format'

/**
 * The index of eras.
 *
 * This is the page every era trail points at, and the reason the breadcrumb can say
 * `Home / Eras / Atakhan` without pretending the home page is the era list. For now
 * it is the home page minus the general figures: the home page still opens with the
 * corpus totals, and this page opens with the eras themselves.
 */
export default function ErasIndex() {
  const { status, data, error } = useDataset()

  if (status === 'loading') return <PageSkeleton />
  if (status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {error.message}</p>

  const { eras } = data
  const withGames = eras.filter((era) => era.games > 0)

  return (
    <>
      <Breadcrumbs items={[{ label: 'Eras' }]} />

      <PageHeader
        eyebrow="Index"
        title="Eras"
        lead={`${count(withGames.length)} declared eras carried a game. An era is not a chapter of history this site invented: it is a declared rule about which statistics could exist when a game was played.`}
        aside={
          <p className="text-fog-600 text-right font-mono text-xs leading-relaxed">
            {count(eras.length)} declared
            <br />
            {count(eras.length - withGames.length)} with no game
          </p>
        }
      />

      <EraGrid eras={eras} />

      <div className="border-line mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t pt-6">
        <span className="text-fog-600 text-[11px] tracking-[0.14em] uppercase">Or browse</span>
        <Link to="/players" className="text-fog-300 hover:text-gold text-sm no-underline">
          every player
        </Link>
        <Link to="/teams" className="text-fog-300 hover:text-gold text-sm no-underline">
          every team
        </Link>
        <Link to="/champions" className="text-fog-300 hover:text-gold text-sm no-underline">
          every champion
        </Link>
      </div>
    </>
  )
}
