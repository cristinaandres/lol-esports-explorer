import { Route, Routes } from 'react-router'

import { Layout } from './components/Layout'
import { useDataset } from './lib/data'
import EraDetail from './routes/EraDetail'
import Glossary from './routes/Glossary'
import Home from './routes/Home'
import NotFound from './routes/NotFound'

export default function App() {
  const { data } = useDataset()

  return (
    <Layout meta={data?.meta ?? null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/eras/:era" element={<EraDetail />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
