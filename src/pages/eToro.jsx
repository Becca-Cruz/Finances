import { useState, useRef } from 'react'
import { Upload, TrendingUp, DollarSign, PiggyBank, Percent, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { fmtUSD } from '../lib/currency'
import { parseEtoroXLSX } from '../lib/etoroParser'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-40">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-gray-600">{p.name}</span>
          </span>
          <span className="font-semibold text-gray-800">{fmtUSD(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function eToro({ data, onImport }) {
  const fileRef = useRef()
  const [importErr, setImportErr] = useState(null)
  const [showDividends, setShowDividends] = useState(false)
  const [editingValue, setEditingValue] = useState(false)
  const [valueInput, setValueInput] = useState('')

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseEtoroXLSX(ev.target.result)
        // Preserve existing portfolio value if already set
        onImport({ ...parsed, portfolioValue: data?.portfolioValue ?? null })
        setImportErr(null)
      } catch {
        setImportErr("Failed to parse the file. Make sure it's an eToro account statement (.xlsx).")
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const startEdit = () => {
    setValueInput(data?.portfolioValue?.toString() || '')
    setEditingValue(true)
  }

  const saveValue = () => {
    const v = parseFloat(valueInput)
    onImport({ ...data, portfolioValue: isNaN(v) ? null : v })
    setEditingValue(false)
  }

  const cancelEdit = () => setEditingValue(false)

  // Use manually entered portfolio value if available, otherwise fall back to last realized equity
  const portfolioValue = data?.portfolioValue ?? data?.lastEquity ?? 0
  const profit = data ? parseFloat((portfolioValue - (data.totalDeposited || 0)).toFixed(2)) : 0
  const pct = data?.totalDeposited > 0 ? ((profit / data.totalDeposited) * 100).toFixed(2) : '0.00'

  const chartData = data?.months?.map(m => ({
    month: new Date(parseInt(m.ym.split('-')[0]), parseInt(m.ym.split('-')[1]) - 1)
      .toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    Deposit: m.deposit,
    Dividends: m.dividends,
    'Portfolio Value': m.lastEquity,
    'Total Deposited': m.totalDeposited,
  })) || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">eToro</h2>
          <p className="text-sm text-gray-500">
            {data
              ? `Statement: ${data.months[0]?.ym} → ${data.months[data.months.length - 1]?.ym}`
              : 'Import your eToro account statement to get started'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Upload size={15} /> {data ? 'Update Statement' : 'Import Statement (.xlsx)'}
          </button>
        </div>
      </div>

      {importErr && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{importErr}</div>
      )}

      {!data ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-20 text-center">
          <TrendingUp size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No data yet</p>
          <p className="text-gray-400 text-sm mt-1">Import your eToro account statement (.xlsx) to see your monthly overview.</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Deposited */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Deposited</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{fmtUSD(data.totalDeposited)}</p>
                  <p className="text-xs text-gray-400 mt-1">{data.months.length} months</p>
                </div>
                <span className="p-2.5 rounded-lg shrink-0 ml-2 bg-blue-50 text-blue-600"><DollarSign size={18} /></span>
              </div>
            </div>

            {/* Portfolio Value — editable */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Portfolio Value</p>
                  {editingValue ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        className="w-full text-xl font-bold text-gray-900 border-b border-blue-400 focus:outline-none bg-transparent"
                        value={valueInput}
                        onChange={e => setValueInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveValue(); if (e.key === 'Escape') cancelEdit() }}
                        autoFocus
                      />
                      <button onClick={saveValue} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
                      <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold text-purple-700">{fmtUSD(portfolioValue)}</p>
                      <button onClick={startEdit} className="p-1 text-gray-300 hover:text-gray-600 transition-colors"><Pencil size={13} /></button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {data.portfolioValue != null ? 'manually entered' : 'from statement'}
                  </p>
                </div>
                <span className="p-2.5 rounded-lg shrink-0 ml-2 bg-purple-50 text-purple-600"><PiggyBank size={18} /></span>
              </div>
            </div>

            {/* Dividends */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dividends</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{fmtUSD(data.totalDividends)}</p>
                  <p className="text-xs text-gray-400 mt-1">{Object.keys(data.byInstrument).length} assets</p>
                </div>
                <span className="p-2.5 rounded-lg shrink-0 ml-2 bg-green-50 text-green-600"><TrendingUp size={18} /></span>
              </div>
            </div>

            {/* P&L */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total P&L</p>
                  <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {profit >= 0 ? '+' : ''}{fmtUSD(profit)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{profit >= 0 ? '+' : ''}{pct}% return</p>
                </div>
                <span className="p-2.5 rounded-lg shrink-0 ml-2 bg-amber-50 text-amber-600"><Percent size={18} /></span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-5">Monthly Overview</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}`}
                />
                <YAxis
                  yAxisId="right" orientation="right"
                  tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar yAxisId="left" dataKey="Deposit" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={28} />
                <Bar yAxisId="left" dataKey="Dividends" fill="#10b981" radius={[3, 3, 0, 0]} barSize={28} />
                <Line yAxisId="right" type="monotone" dataKey="Portfolio Value" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} />
                <Line yAxisId="right" type="monotone" dataKey="Total Deposited" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 mt-2 text-right">
              Solid line = portfolio value (from statement) · Dashed = total deposited
            </p>
          </div>

          {/* Monthly table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Monthly Breakdown</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Month', 'Deposit', 'Total Deposited', 'Portfolio Value', 'Dividends', 'P&L'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.months.map(m => {
                  const [y, mo] = m.ym.split('-').map(Number)
                  const label = new Date(y, mo - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
                  return (
                    <tr key={m.ym} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-gray-700">{label}</td>
                      <td className="px-5 py-3 text-sm text-blue-600 font-semibold">
                        {m.deposit > 0 ? fmtUSD(m.deposit) : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">{fmtUSD(m.totalDeposited)}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-purple-700">{fmtUSD(m.lastEquity)}</td>
                      <td className="px-5 py-3 text-sm text-green-600 font-medium">
                        {m.dividends > 0 ? fmtUSD(m.dividends) : '—'}
                      </td>
                      <td className={`px-5 py-3 text-sm font-semibold ${m.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {m.profit >= 0 ? '+' : ''}{fmtUSD(m.profit)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Dividend breakdown (collapsible) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowDividends(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>Dividends by Asset</span>
              {showDividends ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {showDividends && (
              <div className="border-t border-gray-100">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Asset', 'Total Dividends'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.byInstrument).sort((a, b) => b[1] - a[1]).map(([name, total]) => (
                      <tr key={name} className="border-t border-gray-50">
                        <td className="px-5 py-3 text-sm text-gray-700">{name}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-green-600">{fmtUSD(total)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                      <td className="px-5 py-3 text-sm font-bold text-green-700">{fmtUSD(data.totalDividends)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
