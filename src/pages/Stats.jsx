import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, Area, AreaChart,
  BarChart, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'
import { fmtUSD } from '../lib/currency'
import { getParentId } from '../lib/defaults'

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
    amber:  'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className={`p-2.5 rounded-lg shrink-0 ml-2 ${colors[color]}`}><Icon size={18} /></span>
      </div>
    </div>
  )
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-44">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map(p => p.value != null && (
        <div key={p.name} className="flex justify-between gap-4 text-xs py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-500">{p.name}</span>
          </span>
          <span className="font-semibold text-gray-800">{fmtUSD(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function fmtYM(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

export default function Stats({ expenses, income, categories }) {
  // Available years from data
  const years = useMemo(() => {
    const ys = new Set()
    expenses.forEach(e => ys.add(e.date.slice(0, 4)))
    income.forEach(i => ys.add(i.date.slice(0, 4)))
    return [...ys].sort()
  }, [expenses, income])

  const [period, setPeriod] = useState('all')

  // All months present in data
  const allMonths = useMemo(() => {
    const s = new Set()
    expenses.forEach(e => s.add(e.date.slice(0, 7)))
    income.forEach(i => s.add(i.date.slice(0, 7)))
    return [...s].sort()
  }, [expenses, income])

  const months = period === 'all'
    ? allMonths
    : allMonths.filter(ym => ym.startsWith(period))

  // Top-level categories (for stacked chart)
  const topCats = useMemo(() => categories.filter(c => !c.parentId), [categories])

  // Per-month computed data
  const monthData = useMemo(() => {
    let cum = 0
    return months.map(ym => {
      const inc = income.filter(i => i.date.startsWith(ym)).reduce((s, i) => s + i.amountUSD, 0)
      const exp = expenses.filter(e => e.date.startsWith(ym)).reduce((s, e) => s + e.amountUSD, 0)
      const net = parseFloat((inc - exp).toFixed(2))
      cum = parseFloat((cum + net).toFixed(2))
      const rate = inc > 0 ? parseFloat(((net / inc) * 100).toFixed(1)) : null

      // Category breakdown
      const catTotals = {}
      for (const e of expenses.filter(x => x.date.startsWith(ym))) {
        const pid = getParentId(e.category, categories)
        catTotals[pid] = parseFloat(((catTotals[pid] || 0) + e.amountUSD).toFixed(2))
      }

      return { ym, label: fmtYM(ym), inc, exp, net, cum, rate, ...catTotals }
    })
  }, [months, expenses, income, categories])

  // Period totals
  const totalInc  = monthData.reduce((s, m) => s + m.inc, 0)
  const totalExp  = monthData.reduce((s, m) => s + m.exp, 0)
  const totalNet  = parseFloat((totalInc - totalExp).toFixed(2))
  const avgRate   = totalInc > 0 ? ((totalNet / totalInc) * 100).toFixed(1) : null

  // Which categories actually have data in this period (for stacked chart)
  const activeCats = useMemo(() => {
    const s = new Set(expenses.filter(e => months.includes(e.date.slice(0, 7))).map(e => getParentId(e.category, categories)))
    return topCats.filter(c => s.has(c.id))
  }, [expenses, months, topCats, categories])

  // Year groups for table
  const yearGroups = useMemo(() => {
    const map = {}
    for (const m of monthData) {
      const y = m.ym.slice(0, 4)
      if (!map[y]) map[y] = []
      map[y].push(m)
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [monthData])

  if (allMonths.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900">Stats</h2>
        <div className="mt-8 bg-white rounded-xl border border-gray-100 shadow-sm p-20 text-center">
          <p className="text-gray-400 text-sm">No data yet. Add income and expenses to see your stats.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Stats</h2>
          <p className="text-sm text-gray-500">Progress over time</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm bg-white shadow-sm">
          {['all', ...years].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-2 font-medium transition-colors ${period === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {p === 'all' ? 'All Time' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet}       label="Income"       value={fmtUSD(totalInc)} sub={`${months.length} months`} color="green" />
        <StatCard icon={TrendingDown} label="Expenses"     value={fmtUSD(totalExp)} sub={`${expenses.filter(e => months.includes(e.date.slice(0,7))).length} transactions`} color="red" />
        <StatCard icon={PiggyBank}    label="Net Saved"    value={fmtUSD(totalNet)} sub={totalNet >= 0 ? 'positive' : 'overspent'} color={totalNet >= 0 ? 'blue' : 'red'} />
        <StatCard icon={TrendingUp}   label="Savings Rate" value={avgRate != null ? `${avgRate}%` : '—'} sub="avg income saved" color="amber" />
      </div>

      {/* Income vs Expenses + Cumulative */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`} width={44} />
              <Tooltip content={<Tip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Bar dataKey="inc" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} barSize={18} />
              <Bar dataKey="exp" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={18} />
              <Line dataKey="net" name="Net" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Cumulative Savings</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthData}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`} width={44} />
              <Tooltip formatter={v => [fmtUSD(v), 'Saved']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="cum" name="Saved" stroke="#3b82f6" strokeWidth={2}
                fill="url(#cumGrad)" dot={{ r: 3, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category stacked bar */}
      {activeCats.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`} width={44} />
              <Tooltip content={<Tip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              {activeCats.map(cat => (
                <Bar key={cat.id} dataKey={cat.id} name={cat.name} stackId="a"
                  fill={cat.color} radius={activeCats[activeCats.length - 1].id === cat.id ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly table grouped by year */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Month by Month</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Month', 'Income', 'Expenses', 'Net Saved', 'Rate'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yearGroups.map(([year, rows]) => {
              const yInc = rows.reduce((s, m) => s + m.inc, 0)
              const yExp = rows.reduce((s, m) => s + m.exp, 0)
              const yNet = parseFloat((yInc - yExp).toFixed(2))
              const yRate = yInc > 0 ? ((yNet / yInc) * 100).toFixed(1) : null
              return [
                // Year header row
                <tr key={`hdr-${year}`} className="bg-blue-50/60 border-t border-blue-100">
                  <td colSpan={5} className="px-5 py-2 text-xs font-bold text-blue-700 uppercase tracking-wider">{year}</td>
                </tr>,
                // Month rows
                ...rows.map(m => (
                  <tr key={m.ym} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-600">{fmtYM(m.ym)}</td>
                    <td className="px-5 py-3 text-sm font-medium text-green-700">
                      {m.inc > 0 ? fmtUSD(m.inc) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{m.exp > 0 ? fmtUSD(m.exp) : <span className="text-gray-300">—</span>}</td>
                    <td className={`px-5 py-3 text-sm font-semibold ${m.net >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {m.inc > 0 || m.exp > 0 ? `${m.net >= 0 ? '+' : ''}${fmtUSD(m.net)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {m.rate != null ? `${m.rate}%` : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )),
                // Year total row
                <tr key={`tot-${year}`} className="border-t border-gray-200 bg-gray-50">
                  <td className="px-5 py-3 text-xs font-bold text-gray-600 uppercase">{year} Total</td>
                  <td className="px-5 py-3 text-sm font-bold text-green-700">{fmtUSD(yInc)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-700">{fmtUSD(yExp)}</td>
                  <td className={`px-5 py-3 text-sm font-bold ${yNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                    {yNet >= 0 ? '+' : ''}{fmtUSD(yNet)}
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-500">{yRate != null ? `${yRate}%` : '—'}</td>
                </tr>,
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
