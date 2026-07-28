import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { fmtARS, fmtUSD } from '../lib/currency'
import { getItems, getSaleUSD } from '../lib/sales'

export default function RWContadora({ sales, conversions }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return sales
      .filter(s => !search || s.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [sales, search])

  const totalARS = filtered.reduce((s, v) => s + v.totalARS, 0)
  const totalUSD = filtered.reduce((sum, s) => {
    const usd = getSaleUSD(s, conversions)
    return usd != null ? sum + usd : sum
  }, 0)

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-0.5">Rebe's Way</p>
        <h2 className="text-xl font-bold text-gray-900">Contadora</h2>
        <p className="text-sm text-gray-500">Resumen de ventas para contabilidad</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white" />
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-500">{filtered.length} venta{filtered.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-pink-700">{fmtARS(totalARS)}</span>
          {totalUSD > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">≈ {fmtUSD(totalUSD)}</span>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-gray-400 text-sm">
              {sales.length === 0 ? 'Todavía no hay ventas registradas.' : 'No hay ventas que coincidan.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Fecha', 'Descripción', 'Precio', 'Total'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const items = getItems(s)
                const cur = s.currency || 'ARS'
                const fmtCur = cur === 'USD' ? fmtUSD : fmtARS
                return (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap align-top">{s.date}</td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-medium text-gray-800">{s.description}</p>
                      {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap align-top">{items.length === 1 ? fmtCur(items[0].price) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-pink-700 whitespace-nowrap align-top">
                      {fmtARS(s.totalARS)}
                      {cur === 'USD' && <div className="text-xs font-normal text-gray-400">{fmtUSD(s.totalUSD ?? 0)}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
