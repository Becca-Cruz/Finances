import { useState, useMemo } from 'react'
import { format, subMonths, addMonths, parseISO } from 'date-fns'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { ChevronLeft, ChevronRight, DollarSign, TrendingDown, PiggyBank, Repeat2 } from 'lucide-react'
import { getMonthlyRate, fmtARS, fmtUSD, fmtRate } from '../lib/currency'

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
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className={`p-2.5 rounded-lg ${colors[color]}`}>
          <Icon size={18} />
        </span>
      </div>
    </div>
  )
}

const CUSTOM_TOOLTIP = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-800">{payload[0].name}</p>
      <p className="text-gray-600">{fmtUSD(payload[0].value)}</p>
    </div>
  )
}

export default function Dashboard({ expenses, conversions, investments, categories }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const yearMonth = format(selectedDate, 'yyyy-MM')

  const monthExpenses = useMemo(
    () => expenses.filter(e => e.date.startsWith(yearMonth)),
    [expenses, yearMonth]
  )
  const monthConversions = useMemo(
    () => conversions.filter(c => c.date.startsWith(yearMonth)),
    [conversions, yearMonth]
  )
  const monthInvestments = useMemo(
    () => investments.filter(i => i.date.startsWith(yearMonth)),
    [investments, yearMonth]
  )

  const totalIncomeUSD = monthConversions.reduce((s, c) => s + c.amountUSD, 0)
  const totalExpensesUSD = monthExpenses.reduce((s, e) => s + e.amountUSD, 0)
  const totalExpensesARS = monthExpenses.reduce((s, e) => s + e.amountARS, 0)
  const netUSD = totalIncomeUSD - totalExpensesUSD
  const avgRate = getMonthlyRate(conversions, yearMonth)
  const totalInvestedUSD = monthInvestments.reduce((s, i) => s + i.amountUSD, 0)

  // Pie chart: expenses by category this month
  const catMap = {}
  for (const e of monthExpenses) {
    catMap[e.category] = (catMap[e.category] || 0) + e.amountUSD
  }
  const pieData = categories
    .map(c => ({ name: c.name, value: catMap[c.id] || 0, color: c.color }))
    .filter(d => d.value > 0)

  // Bar chart: last 6 months expenses in USD
  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(selectedDate, 5 - i)
    const ym = format(d, 'yyyy-MM')
    const total = expenses.filter(e => e.date.startsWith(ym)).reduce((s, e) => s + e.amountUSD, 0)
    return { month: format(d, 'MMM'), expenses: parseFloat(total.toFixed(2)) }
  })

  // Recent expenses (last 5)
  const recent = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const getCat = (id) => categories.find(c => c.id === id) || { name: id, color: '#6b7280' }

  const isCurrentMonth = format(new Date(), 'yyyy-MM') === yearMonth

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">Overview of your finances</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <button
            onClick={() => setSelectedDate(d => subMonths(d, 1))}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-700 w-28 text-center">
            {format(selectedDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setSelectedDate(d => addMonths(d, 1))}
            disabled={isCurrentMonth}
            className="text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Income (USD)"
          value={fmtUSD(totalIncomeUSD)}
          sub={`${monthConversions.length} transfer${monthConversions.length !== 1 ? 's' : ''}`}
          color="green"
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses"
          value={fmtUSD(totalExpensesUSD)}
          sub={fmtARS(totalExpensesARS)}
          color="red"
        />
        <StatCard
          icon={PiggyBank}
          label="Net Savings"
          value={fmtUSD(netUSD)}
          sub={netUSD >= 0 ? 'positive' : 'overspent'}
          color={netUSD >= 0 ? 'blue' : 'red'}
        />
        <StatCard
          icon={Repeat2}
          label="Avg Rate"
          value={avgRate ? `$${fmtRate(avgRate)}` : '—'}
          sub="ARS per USD"
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Expenses by Category</h3>
          {pieData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              No expenses this month
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-600 truncate flex-1">{d.name}</span>
                    <span className="font-medium text-gray-800">{fmtUSD(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Spending (USD)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip
                formatter={(v) => [fmtUSD(v), 'Expenses']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="expenses" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent expenses */}
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
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cat.color + '22', color: cat.color }}>
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

        {/* Investments summary */}
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
                <span>{fmtUSD(totalInvestedUSD)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
