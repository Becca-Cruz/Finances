import { useState, useMemo } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { ChevronLeft, ChevronRight, ChevronDown, TrendingDown, PiggyBank, Repeat2, Wallet } from 'lucide-react'
import { getMonthlyRate, getRateForDate, fmtARS, fmtUSD, fmtRate, usdToArs } from '../lib/currency'
import { getParentId } from '../lib/defaults'

function PieLegend({ pieData, categories, catMap, fmtChartVal, viewARS, monthExpenses }) {
  const [expanded, setExpanded] = useState({})
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  return (
    <div className="flex items-start gap-4">
      <ResponsiveContainer width="45%" height={200}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(v) => [fmtChartVal(v)]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-0.5 overflow-hidden py-1">
        {pieData.map((d) => {
          const children = categories.filter(c => c.parentId === d.id)
          const hasChildren = children.length > 0
          const isOpen = expanded[d.id]

          // Expenses attributed directly to parent ID
          const directVal = monthExpenses
            .filter(e => e.category === d.id)
            .reduce((s, e) => s + (viewARS ? e.amountARS : e.amountUSD), 0)

          // Expenses attributed to each subcategory
          const childRows = children
            .map(child => ({
              child,
              val: monthExpenses
                .filter(e => e.category === child.id)
                .reduce((s, e) => s + (viewARS ? e.amountARS : e.amountUSD), 0),
            }))
            .filter(({ val }) => val > 0)

          return (
            <div key={d.id}>
              <button
                onClick={() => hasChildren && toggle(d.id)}
                className={`w-full flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition-colors ${hasChildren ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
              >
                {hasChildren ? (
                  <span className={`flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={10} className="text-gray-600" />
                  </span>
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-gray-700 truncate flex-1 text-left font-medium">{d.name}</span>
                <span className="font-semibold text-gray-900 shrink-0">{fmtChartVal(d.value)}</span>
              </button>
              {isOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 pl-2" style={{ borderColor: d.color + '44' }}>
                  {childRows.map(({ child, val }) => (
                    <div key={child.id} className="flex items-center gap-2 text-xs py-0.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: child.color }} />
                      <span className="text-gray-500 truncate flex-1">{child.name}</span>
                      <span className="text-gray-600 shrink-0">{fmtChartVal(val)}</span>
                    </div>
                  ))}
                  {directVal > 0 && (
                    <div className="flex items-center gap-2 text-xs py-0.5">
                      <span className="w-2 h-2 rounded-full shrink-0 bg-gray-300" />
                      <span className="text-gray-400 truncate flex-1">Other</span>
                      <span className="text-gray-500 shrink-0">{fmtChartVal(directVal)}</span>
                    </div>
                  )}
                  {childRows.length === 0 && directVal === 0 && (
                    <p className="text-xs text-gray-400 py-0.5 pl-1">No breakdown available</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className={`p-2.5 rounded-lg shrink-0 ml-2 ${colors[color]}`}>
          <Icon size={18} />
        </span>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-800">{payload[0].name}</p>
      <p className="text-gray-600">{payload[0].value}</p>
    </div>
  )
}

export default function Dashboard({ expenses, conversions, investments, categories, income, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewARS, setViewARS] = useState(false)
  const [pieCurrency, setPieCurrency] = useState('ARS')

  const yearMonth = format(selectedDate, 'yyyy-MM')
  const isCurrentMonth = format(new Date(), 'yyyy-MM') === yearMonth

  const monthExpenses = useMemo(() => expenses.filter(e => e.date.startsWith(yearMonth)), [expenses, yearMonth])
  const monthConversions = useMemo(() => conversions.filter(c => c.date.startsWith(yearMonth)), [conversions, yearMonth])
  const monthInvestments = useMemo(() => investments.filter(i => i.date.startsWith(yearMonth)), [investments, yearMonth])
  const monthIncome = useMemo(() => income.filter(i => i.date.startsWith(yearMonth)), [income, yearMonth])

  const avgRate = getMonthlyRate(conversions, yearMonth)

  // USD values
  const totalIncomeUSD = monthIncome.reduce((s, i) => s + i.amountUSD, 0)
  const totalExpensesUSD = monthExpenses.reduce((s, e) => s + e.amountUSD, 0)
  const totalExpensesARS = monthExpenses.reduce((s, e) => s + e.amountARS, 0)
  const netUSD = totalIncomeUSD - totalExpensesUSD

  // ARS values
  const incomeARS = avgRate ? usdToArs(totalIncomeUSD, avgRate) : 0
  const netARS = incomeARS - totalExpensesARS

  // Contadora (DolarApp conversions)
  const contadoraARS = monthConversions.reduce((s, c) => s + c.amountARS, 0)
  const contadoraUSD = monthConversions.reduce((s, c) => s + c.amountUSD, 0)

  // Display helpers
  const fmt = (usd, ars) => viewARS ? fmtARS(ars) : fmtUSD(usd)

  // Split expenses by input currency for stat card
  const arsExpenses = monthExpenses.filter(e => e.inputCurrency === 'ARS')
  const usdExpenses = monthExpenses.filter(e => e.inputCurrency === 'USD')
  const totalArsExpensesUSD = arsExpenses.reduce((s, e) => s + e.amountUSD, 0)
  const totalUsdExpensesDirect = usdExpenses.reduce((s, e) => s + e.amountUSD, 0)

  // Pie chart: group by parent category, filtered by input currency
  const pieExpenses = monthExpenses.filter(e => e.inputCurrency === pieCurrency)
  const catMap = {}
  for (const e of pieExpenses) {
    const pid = getParentId(e.category, categories)
    catMap[pid] = (catMap[pid] || 0) + (viewARS ? e.amountARS : e.amountUSD)
  }
  const topLevel = categories.filter(c => !c.parentId)
  const pieData = topLevel
    .map(c => ({ id: c.id, name: c.name, value: parseFloat((catMap[c.id] || 0).toFixed(2)), color: c.color }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // Bar chart: last 6 months
  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(selectedDate, 5 - i)
    const ym = format(d, 'yyyy-MM')
    const monthExps = expenses.filter(e => e.date.startsWith(ym))
    const val = viewARS
      ? monthExps.reduce((s, e) => s + e.amountARS, 0)
      : monthExps.reduce((s, e) => s + e.amountUSD, 0)
    return { month: format(d, 'MMM'), value: parseFloat(val.toFixed(2)), ym }
  })

  const handleBarClick = (data) => {
    if (!onNavigate || !data?.ym) return
    const [y, m] = data.ym.split('-').map(Number)
    const dateFrom = `${data.ym}-01`
    const dateTo = `${data.ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    onNavigate(dateFrom, dateTo)
  }

  // Recent expenses
  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const getCat = (id) => categories.find(c => c.id === id) || { name: id, color: '#6b7280' }

  const fmtChartVal = (v) => viewARS ? fmtARS(v) : fmtUSD(v)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">Overview of your finances</p>
        </div>
        <div className="flex items-center gap-2">
          {/* ARS/USD toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm bg-white shadow-sm">
            {['USD', 'ARS'].map(cur => (
              <button
                key={cur}
                onClick={() => setViewARS(cur === 'ARS')}
                className={`px-3 py-2 font-medium transition-colors ${
                  (cur === 'ARS') === viewARS ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>
          {/* Month nav */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <button onClick={() => setSelectedDate(d => subMonths(d, 1))} className="text-gray-400 hover:text-gray-700 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-700 w-28 text-center">
              {format(selectedDate, 'MMMM yyyy')}
            </span>
            <button onClick={() => setSelectedDate(d => addMonths(d, 1))} disabled={isCurrentMonth} className="text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          label="Income"
          value={fmt(totalIncomeUSD, incomeARS)}
          sub={viewARS && !avgRate ? 'No rate for this month' : `${monthIncome.length} entr${monthIncome.length !== 1 ? 'ies' : 'y'}`}
          color="green"
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses"
          value={fmt(totalExpensesUSD, totalExpensesARS)}
          sub={usdExpenses.length > 0
            ? `ARS ${fmtUSD(totalArsExpensesUSD)} · USD ${fmtUSD(totalUsdExpensesDirect)}`
            : `${monthExpenses.length} transaction${monthExpenses.length !== 1 ? 's' : ''}`}
          color="red"
        />
        <StatCard
          icon={PiggyBank}
          label="Net Savings"
          value={fmt(netUSD, netARS)}
          sub={(viewARS ? netARS : netUSD) >= 0 ? 'positive' : 'overspent'}
          color={(viewARS ? netARS : netUSD) >= 0 ? 'blue' : 'red'}
        />
        <StatCard
          icon={Repeat2}
          label="Avg Rate"
          value={avgRate ? `$${fmtRate(avgRate)}` : '—'}
          sub="ARS per USD"
          color="amber"
        />
      </div>

      {/* Contadora info bar */}
      {(contadoraARS > 0 || monthConversions.length > 0) && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Contadora</span>
          <span className="text-sm text-purple-700">{monthConversions.length} transfer{monthConversions.length !== 1 ? 's' : ''}</span>
          <span className="text-sm font-semibold text-purple-800">{fmtARS(contadoraARS)} convertidos</span>
          <span className="text-sm text-purple-600">≈ {fmtUSD(contadoraUSD)}</span>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Expenses by Category</h3>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs bg-gray-50">
              {[['ARS', 'ARG'], ['USD', 'USA']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPieCurrency(val)}
                  className={`px-2.5 py-1 font-medium transition-colors ${pieCurrency === val ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {pieData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              No {pieCurrency} expenses this month
            </div>
          ) : (
            <>
              <PieLegend
                pieData={pieData}
                categories={categories}
                catMap={catMap}
                fmtChartVal={fmtChartVal}
                viewARS={viewARS}
                monthExpenses={pieExpenses}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 px-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                <span className="text-sm font-bold text-gray-900">
                  {fmtChartVal(pieData.reduce((s, d) => s + d.value, 0))}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Monthly Spending ({viewARS ? 'ARS' : 'USD'})
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => viewARS ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip formatter={(v) => [fmtChartVal(v), 'Expenses']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} onClick={handleBarClick} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Recent Expenses</h3>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No expenses yet</div>
          ) : (
            <table className="w-full">
              <tbody>
                {recent.map(e => {
                  const cat = getCat(e.category)
                  return (
                    <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{e.description}</p>
                        <p className="text-xs text-gray-400">{e.date}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{ background: cat.color + '22', color: cat.color }}>
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="text-sm font-semibold text-gray-800">{fmtARS(e.amountARS)}</p>
                        <p className="text-xs text-gray-400">{fmtUSD(e.amountUSD)}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">eToro This Month</h3>
          </div>
          {monthInvestments.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No investments this month</div>
          ) : (
            <div className="p-4 space-y-2">
              {monthInvestments.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{inv.asset}</p>
                    {inv.notes && <p className="text-xs text-gray-400">{inv.notes}</p>}
                  </div>
                  <span className="text-sm font-bold text-blue-600">{fmtUSD(inv.amountUSD)}</span>
                </div>
              ))}
              <div className="pt-2 flex justify-between text-xs font-semibold text-gray-700 border-t border-gray-100">
                <span>Total</span>
                <span>{fmtUSD(monthInvestments.reduce((s, i) => s + i.amountUSD, 0))}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
