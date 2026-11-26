import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { Layout } from './components/Layout'
import { Skeleton } from './components/Skeleton'
import { useDataset } from './lib/data'
import ChampionDetail from './routes/ChampionDetail'
import EntityIndex from './routes/EntityIndex'
import EventsIndex from './routes/EventsIndex'
import EraDetail from './routes/EraDetail'
import ErasIndex from './routes/ErasIndex'
import EventDetail from './routes/EventDetail'
import GameDetail from './routes/GameDetail'
import Glossary from './routes/Glossary'
import Home from './routes/Home'
import NotFound from './routes/NotFound'
import PhaseDetail from './routes/PhaseDetail'
import PlayerDetail from './routes/PlayerDetail'
import Selection from './routes/Selection'
import SeriesDetail from './routes/SeriesDetail'
import TeamDetail from './routes/TeamDetail'

// The Almanac's chart layer is visx; a reader who never opens it should not pay for
// the code. The routes are split so the main bundle stays the record's bundle.
const AlmanacEntry = lazy(() => import('./routes/AlmanacEntry'))
const AlmanacIndex = lazy(() => import('./routes/AlmanacIndex'))

export default function App() {
  const { data } = useDataset()

  return (
    <Layout meta={data?.meta ?? null}>
      <Suspense fallback={<Skeleton shape="page" />}>
        <Routes>
          <Route path="/" element={<Home />} />
        <Route path="/eras" element={<ErasIndex />} />
        <Route path="/eras/:era" element={<EraDetail />} />
        <Route path="/events" element={<EventsIndex />} />
        <Route path="/events/:event" element={<EventDetail />} />
        <Route path="/events/:event/phases/:phase" element={<PhaseDetail />} />
        <Route path="/series/:series" element={<SeriesDetail />} />
        <Route path="/games/:game" element={<GameDetail />} />
        <Route path="/players" element={<EntityIndex kind="player" />} />
        <Route path="/players/:player" element={<PlayerDetail />} />
        <Route path="/teams" element={<EntityIndex kind="team" />} />
        <Route path="/teams/:team" element={<TeamDetail />} />
        <Route path="/champions" element={<EntityIndex kind="champion" />} />
        <Route path="/champions/:champion" element={<ChampionDetail />} />
          <Route path="/almanac" element={<AlmanacIndex />} />
          <Route path="/almanac/:id" element={<AlmanacEntry />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/selection" element={<Selection />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
