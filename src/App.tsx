import { Route, Routes } from 'react-router'

import { Layout } from './components/Layout'
import { useDataset } from './lib/data'
import EraDetail from './routes/EraDetail'
import EventDetail from './routes/EventDetail'
import GameDetail from './routes/GameDetail'
import Glossary from './routes/Glossary'
import Home from './routes/Home'
import NotFound from './routes/NotFound'
import PlayerDetail from './routes/PlayerDetail'
import SeriesDetail from './routes/SeriesDetail'

export default function App() {
  const { data } = useDataset()

  return (
    <Layout meta={data?.meta ?? null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/eras/:era" element={<EraDetail />} />
        <Route path="/events/:event" element={<EventDetail />} />
        <Route path="/series/:series" element={<SeriesDetail />} />
        <Route path="/games/:game" element={<GameDetail />} />
        <Route path="/players/:player" element={<PlayerDetail />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
