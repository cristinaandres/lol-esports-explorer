import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="py-16">
      <p className="text-fog-600 mb-3 font-mono text-xs tracking-widest uppercase">404</p>
      <h1 className="text-fog-100 text-2xl font-semibold tracking-tight">
        That page is not part of the record.
      </h1>
      <p className="text-fog-300 mt-3 text-sm">
        <Link to="/eras" className="text-gold">
          Back to the eras
        </Link>
        .
      </p>
    </div>
  )
}
