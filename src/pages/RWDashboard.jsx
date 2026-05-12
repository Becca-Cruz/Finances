import { useMemo } from 'react'
import { ShoppingBag, TrendingUp, DollarSign, Package } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
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

export default function RWDashboard({ expenses }) {
  const totalUSD = expenses.reduce((s, e) => s + e.amountUSD, 0)
  const totalARS = expenses.reduce((s, e) => s + e.amountARS, 0)

  // By category
  const byCat = useMemo(() => {
    const map = {}
    for (const e of expenses) map[e.category] = (map[e.category] || 0) + e.amountUSD
    return RW_CATEGORIES
      .map(c => ({ name: c.name, value: parseFloat((map[c.id] || 0).toFixed(2)), color: c.color }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  // Monthly spending
  const monthly = useMemo(() => {
    const map = {}
    for (const e of expenses) {
      const ym = e.date.slice(0, 7)
      map[ym] = (map[ym] || 0) + e.amountUSD
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([ym, val]) => {
      const [y, m] = ym.split('-').map(Number)
      return {
        month: new Date(y, m - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        value: parseFloat(val.toFixed(2)),
      }
    })
  }, [expenses])

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
        <StatCard icon={ShoppingBag} label="Total Invertido" value={fmtUSD(totalUSD)} sub="en USD" color="blue" />
        <StatCard icon={DollarSign}  label="Total en ARS"    value={fmtARS(totalARS)} sub="equivalente" color="amber" />
        <StatCard icon={Package}     label="Ventas"
          value="—"
          sub="próximamente"
          color="green"
        />
        <StatCard icon={TrendingUp}  label="Ganancia Neta"
          value="—"
          sub="registra ventas para calcular"
          color="pink"
        />
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <ShoppingBag size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay gastos todavía</p>
          <p className="text-gray-400 text-sm mt-1">Ve a <strong>Gastos</strong> para registrar tus primeras compras.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Gastos por Mes (USD)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => [fmtUSD(v), 'Gastos']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By category */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Por Categoría</h3>
            <div className="space-y-2.5">
              {byCat.map(c => {
                const pct = totalUSD > 0 ? (c.value / totalUSD) * 100 : 0
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
