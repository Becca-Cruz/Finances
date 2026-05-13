import { useMemo } from 'react'
import { ShoppingBag, TrendingUp, DollarSign, Package } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { fmtARS, fmtUSD } from '../lib/currency'
import { RW_CATEGORIES } from './RWGastos'

function StatCard({ icon: Icon, label, value, sub, color = 'pink' }) {
  const colors = {
    pink:   'bg-pink-50 text-pink-600',
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className={`p-2.5 rounded-lg shrink-0 ml-2 ${colors[color]}`}><Icon size={18} /></span>
      </div>
    </div>
  )
}

export default function RWDashboard({ expenses, sales }) {
  const totalCostUSD = expenses.reduce((s, e) => s + e.amountUSD, 0)
  const totalCostARS = expenses.reduce((s, e) => s + e.amountARS, 0)
  const totalSalesARS = sales.reduce((s, v) => s + v.totalARS, 0)
  const totalUnits = sales.reduce((s, v) => s + v.quantity, 0)

  // Net profit: sales ARS minus costs ARS
  const netARS = totalSalesARS - totalCostARS
  const margin = totalSalesARS > 0 ? (netARS / totalSalesARS) * 100 : null

  // By category (costs)
  const byCat = useMemo(() => {
    const map = {}
    for (const e of expenses) map[e.category] = (map[e.category] || 0) + e.amountUSD
    return RW_CATEGORIES
      .map(c => ({ name: c.name, value: parseFloat((map[c.id] || 0).toFixed(2)), color: c.color }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  // Monthly: costs (ARS) vs revenue (ARS)
  const monthly = useMemo(() => {
    const map = {}
    for (const e of expenses) {
      const ym = e.date.slice(0, 7)
      if (!map[ym]) map[ym] = { costos: 0, ventas: 0 }
      map[ym].costos += e.amountARS
    }
    for (const s of sales) {
      const ym = s.date.slice(0, 7)
      if (!map[ym]) map[ym] = { costos: 0, ventas: 0 }
      map[ym].ventas += s.totalARS
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([ym, val]) => {
      const [y, m] = ym.split('-').map(Number)
      return {
        month: new Date(y, m - 1).toLocaleString('es-AR', { month: 'short', year: '2-digit' }),
        Costos: parseFloat(val.costos.toFixed(0)),
        Ventas: parseFloat(val.ventas.toFixed(0)),
      }
    })
  }, [expenses, sales])

  const hasData = expenses.length > 0 || sales.length > 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-0.5">Rebe's Way</p>
        <h2 className="text-xl font-bold text-gray-900">Resumen</h2>
        <p className="text-sm text-gray-500">Overview del negocio</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Costos" value={fmtUSD(totalCostUSD)} sub={fmtARS(totalCostARS)} color="blue" />
        <StatCard icon={Package} label="Total Ventas" value={fmtARS(totalSalesARS)} sub={`${totalUnits} unidad${totalUnits !== 1 ? 'es' : ''}`} color="green" />
        <StatCard
          icon={DollarSign}
          label="Ganancia Neta"
          value={totalSalesARS > 0 ? fmtARS(netARS) : '—'}
          sub={totalSalesARS > 0 ? undefined : 'registra ventas para calcular'}
          color={netARS >= 0 ? 'green' : 'pink'}
        />
        <StatCard
          icon={TrendingUp}
          label="Margen"
          value={margin !== null ? `${margin.toFixed(1)}%` : '—'}
          sub={margin !== null ? (margin >= 0 ? 'sobre ventas' : 'pérdida') : 'sin ventas aún'}
          color={margin !== null && margin >= 0 ? 'green' : 'pink'}
        />
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <ShoppingBag size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay datos todavía</p>
          <p className="text-gray-400 text-sm mt-1">Ve a <strong>Gastos</strong> o <strong>Ventas</strong> para empezar a registrar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Ventas vs Costos por Mes (ARS)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barSize={18} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [fmtARS(v)]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Ventas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Costos" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By category */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Costos por Categoría</h3>
            <div className="space-y-2.5">
              {byCat.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin costos registrados</p>
              ) : byCat.map(c => {
                const pct = totalCostUSD > 0 ? (c.value / totalCostUSD) * 100 : 0
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{c.name}</span>
                      <span className="text-gray-500">{fmtUSD(c.value)} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
