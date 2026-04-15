import { useState, useRef } from 'react'
import { Upload, TrendingUp, DollarSign, PiggyBank, Percent, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { fmtUSD } from '../lib/currency'
import { parseEtoroXLSX } from '../lib/etoroParser'

const TICKER_COLORS = {
  VOO:  '#3b82f6',
  SCHD: '#10b981',
  VXUS: '#f59e0b',
  VTI:  '#8b5cf6',
  QQQ:  '#ec4899',
}
const fallbackColor = (i) => ['#6366f1','#ef4444','#06b6d4','#f97316'][i % 4]

function fmt(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-40">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map(p => p.value != null && (
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

export default function eToro({ data, onImport, onAddExpenses, expenses }) {
  const fileRef = useRef()
  const [importErr, setImportErr] = useState(null)
  const [importMsg, setImportMsg] = useState(null)
  const [showDividends, setShowDividends] = useState(false)
  const [editingMonth, setEditingMonth] = useState(null)
  const [editInput, setEditInput] = useState('')

  const monthBalances = data?.monthBalances || {}

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseEtoroXLSX(ev.target.result)
        // Preserve existing month balances across re-imports
        onImport({ ...parsed, monthBalances: data?.monthBalances || {} })
        // Import deposit expenses (deduped)
        if (parsed.depositExpenses?.length && onAddExpenses) {
          const existingIds = new Set((expenses || []).map(x => x.id))
          const newDeps = parsed.depositExpenses.filter(d => !existingIds.has(d.id))
          if (newDeps.length) {
            onAddExpenses(newDeps)
            setImportMsg(`Imported ${newDeps.length} deposit expense${newDeps.length !== 1 ? 's' : ''} to Expenses.`)
          } else {
            setImportMsg('Deposits already up to date.')
          }
        }
        setImportErr(null)
      } catch {
        setImportErr("Failed to parse the file. Make sure it's an eToro account statement (.xlsx).")
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const startEdit = (ym) => {
    setEditInput(monthBalances[ym]?.toString() || '')
    setEditingMonth(ym)
  }
  const saveBalance = () => {
    const v = parseFloat(editInput)
    onImport({ ...data, monthBalances: { ...monthBalances, [editingMonth]: isNaN(v) ? null : v } })
    setEditingMonth(null)
  }
  const clearBalance = (ym) => {
    onImport({ ...data, monthBalances: { ...monthBalances, [ym]: null } })
  }

  // Latest entered balance (for stat card)
  const latestBalance = (() => {
    const ms = data?.months || []
    for (let i = ms.length - 1; i >= 0; i--) {
      const v = monthBalances[ms[i].ym]
      if (v != null) return v
    }
    return null
  })()

  const profit = latestBalance != null && data
    ? parseFloat((latestBalance - data.totalDeposited).toFixed(2))
    : null
  const pct = profit != null && data?.totalDeposited > 0
    ? ((profit / data.totalDeposited) * 100).toFixed(2)
    : null

  const chartData = data?.months?.map(m => ({
    month: fmt(m.ym),
    Deposit: m.deposit || undefined,
    Dividends: m.dividends || undefined,
    Balance: monthBalances[m.ym] ?? undefined,
    'Total Deposited': m.totalDeposited,
  })) || []

  // Asset allocation pie
  const positionEntries = Object.entries(data?.positions || {})
    .sort((a, b) => b[1] - a[1])
  const totalPositions = positionEntries.reduce((s, [, v]) => s + v, 0)

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
      {importMsg && (
        <div className="flex items-center justify-between bg-green-50 text-green-700 text-sm p-3 rounded-lg">
          <span>{importMsg}</span>
          <button onClick={() => setImportMsg(null)} className="text-xs underline ml-4">dismiss</button>
        </div>
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
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Deposited</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{fmtUSD(data.totalDeposited)}</p>
                  <p className="text-xs text-gray-400 mt-1">{data.months.length} months</p>
                </div>
                <span className="p-2.5 rounded-lg shrink-0 ml-2 bg-blue-50 text-blue-600"><DollarSign size={18} /></span>
              </div>
            </div>

            {/* Balance — shows latest entered monthly balance */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</p>
                  <p className="text-2xl font-bold text-purple-700 mt-1">
                    {latestBalance != null ? fmtUSD(latestBalance) : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {latestBalance != null ? 'end of month' : 'enter below ↓'}
                  </p>
                </div>
                <span className="p-2.5 rounded-lg shrink-0 ml-2 bg-purple-50 text-purple-600"><PiggyBank size={18} /></span>
              </div>
            </div>

            {/* Dividends */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
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
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total P&L</p>
                  <p className={`text-2xl font-bold mt-1 ${profit == null ? 'text-gray-300' : profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {profit == null ? '—' : `${profit >= 0 ? '+' : ''}${fmtUSD(profit)}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {pct != null ? `${pct >= 0 ? '+' : ''}${pct}% return` : 'set balance to calculate'}
                  </p>
                </div>
                <span className="p-2.5 rounded-lg shrink-0 ml-2 bg-amber-50 text-amber-600"><Percent size={18} /></span>
              </div>
            </div>
          </div>

          {/* Asset allocation + chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Allocation pie */}
            {positionEntries.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Asset Allocation</h3>
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width="55%" height={130}>
                    <PieChart>
                      <Pie data={positionEntries.map(([k, v]) => ({ name: k, value: v }))}
                        cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                        {positionEntries.map(([k], i) => (
                          <Cell key={k} fill={TICKER_COLORS[k] || fallbackColor(i)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={v => fmtUSD(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1">
                    {positionEntries.map(([ticker, total], i) => (
                      <div key={ticker} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: TICKER_COLORS[ticker] || fallbackColor(i) }} />
                        <span className="font-semibold text-gray-700 w-12">{ticker}</span>
                        <span className="text-gray-500">{totalPositions > 0 ? `${((total / totalPositions) * 100).toFixed(0)}%` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Monthly chart */}
            <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ${positionEntries.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Overview</h3>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${v}`} width={45} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} width={42} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar yAxisId="left" dataKey="Deposit" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={22} />
                  <Bar yAxisId="left" dataKey="Dividends" fill="#10b981" radius={[3, 3, 0, 0]} barSize={22} />
                  <Line yAxisId="right" type="monotone" dataKey="Balance" stroke="#7c3aed" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#7c3aed' }} connectNulls={false} />
                  <Line yAxisId="right" type="monotone" dataKey="Total Deposited" stroke="#94a3b8"
                    strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly table with editable balance */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Monthly Breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">Enter your end-of-month balance from eToro</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Month', 'Deposit', 'Total Deposited', 'Balance', 'Dividends', 'P&L'].map(h => (
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
                  const bal = monthBalances[m.ym]
                  const rowProfit = bal != null ? parseFloat((bal - m.totalDeposited).toFixed(2)) : null
                  const isEditing = editingMonth === m.ym
                  return (
                    <tr key={m.ym} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-gray-700">{label}</td>
                      <td className="px-5 py-3 text-sm text-blue-600 font-semibold">
                        {m.deposit > 0 ? fmtUSD(m.deposit) : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">{fmtUSD(m.totalDeposited)}</td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-sm">$</span>
                            <input
                              type="number"
                              className="w-24 text-sm font-semibold text-purple-700 border-b border-blue-400 focus:outline-none bg-transparent"
                              value={editInput}
                              onChange={e => setEditInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveBalance(); if (e.key === 'Escape') setEditingMonth(null) }}
                              autoFocus
                            />
                            <button onClick={saveBalance} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={13} /></button>
                            <button onClick={() => setEditingMonth(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span className={`text-sm font-semibold ${bal != null ? 'text-purple-700' : 'text-gray-300'}`}>
                              {bal != null ? fmtUSD(bal) : '—'}
                            </span>
                            <button
                              onClick={() => startEdit(m.ym)}
                              className="p-1 text-gray-200 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Pencil size={11} />
                            </button>
                            {bal != null && (
                              <button
                                onClick={() => clearBalance(m.ym)}
                                className="p-1 text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-green-600 font-medium">
                        {m.dividends > 0 ? fmtUSD(m.dividends) : '—'}
                      </td>
                      <td className={`px-5 py-3 text-sm font-semibold ${rowProfit == null ? 'text-gray-300' : rowProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {rowProfit == null ? '—' : `${rowProfit >= 0 ? '+' : ''}${fmtUSD(rowProfit)}`}
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
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5">{h}</th>
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
