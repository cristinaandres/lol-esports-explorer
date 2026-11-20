import { Link } from 'react-router'

/**
 * The master-to-detail path, always visible.
 *
 * Every level of the site keeps the route that led there on screen. Going back
 * is not a browser gesture the reader has to know: it is a link at the top.
 */
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-fog-600 mb-6 flex flex-wrap items-center gap-2 text-xs">
      <Link to="/" className="hover:text-fog-100 no-underline">
        Eras
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span aria-hidden className="text-line-bright">
            /
          </span>
          {item.to ? (
            <Link to={item.to} className="hover:text-fog-100 no-underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-fog-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
