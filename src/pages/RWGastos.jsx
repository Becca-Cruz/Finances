import { useState, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react'
import Modal from '../components/Modal'
import { getRateForDate, arsToUsd, usdToArs, fmtARS, fmtUSD, fmtRate } from '../lib/currency'

const today = () => new Date().toISOString().split('T')[0]
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export const RW_CATEGORIES = [
  { id: 'mercaderia', name: 'Mercadería', color: '#3b82f6' },
  { id: 'packaging',  name: 'Packaging',  color: '#f59e0b' },
  { id: 'envios',     name: 'Envíos',     color: '#10b981' },
  { id: 'marketing',  name: 'Marketing',  color: '#ec4899' },
  { id: 'herramientas', name: 'Herramientas', color: '#8b5cf6' },
  { id: 'otros',      name: 'Otros',      color: '#6b7280' },
]

const getCat = (id) => RW_CATEGORIES.find(c => c.id === id) || { name: id, color: '#6b7280' }

function ExpenseModal({ expense, conversions, onSave, onClose }) {
  const [form, setForm] = useState({
    date:     expense?.date     || today(),
    description: expense?.description || '',
    category: expense?.category || 'mercaderia',
    currency: expense?.inputCurrency || 'USD',
    amount:   expense?.inputAmount?.toString() || '',
    rate:     '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const autoRate = getRateForDate(conversions, form.date)
  const rate = parseFloat(form.rate) || autoRate || 0
  const amount = parseFloat(form.amount) || 0

  // Pre-fill rate from conversions when date changes
  useMemo(() => {
    if (autoRate) setForm(f => ({ ...f, rate: autoRate.toFixed(2) }))
  }, [form.date, autoRate])

  useMemo(() => {
    if (expense?.rateARS_USD) setForm(f => ({ ...f, rate: expense.rateARS_USD.toFixed(2) }))
  }, [])

  const equiv = form.currency === 'ARS'
    ? (rate ? `≈ ${fmtUSD(arsToUsd(amount, rate))}` : '')
    : (rate ? `≈ ${fmtARS(usdToArs(amount, rate))}` : '')

  const handleSave = () => {
    if (!form.description.trim() || !amount) return
    if (form.currency === 'ARS' && !rate) return
    const amountARS = form.currency === 'ARS' ? amount : (rate ? usdToArs(amount, rate) : 0)
    const amountUSD = form.currency === 'USD' ? amount : arsToUsd(amount, rate)
    onSave({
      id: expense?.id || uid(),
      date: form.date,
      description: form.description.trim(),
      category: form.category,
      inputCurrency: form.currency,
      inputAmount: amount,
      rateARS_USD: rate || 0,
      amountARS: parseFloat(amountARS.toFixed(2)),
      amountUSD: parseFloat(amountUSD.toFixed(2)),
    })
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <Modal title={expense ? 'Edit Expense' : 'Add Expense'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
              {RW_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input type="text" className={inputCls} placeholder="¿Qué compraste?" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
          <div className="flex gap-2">
            <input type="number" className={`${inputCls} flex-1`} placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} min="0" />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {['USD', 'ARS'].map(cur => (
                <button key={cur} onClick={() => set('currency', cur)}
                  className={`px-3 py-2 font-medium transition-colors ${form.currency === cur ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {cur}
                </button>
              ))}
            </div>
          </div>
          {equiv && <p className="text-xs text-gray-400 mt-1 ml-1">{equiv}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Exchange Rate (ARS per USD)
            {form.currency === 'USD'
              ? <span className="text-gray-400 ml-1">— optional</span>
              : autoRate && !form.rate && <span className="text-gray-400 ml-1">— auto from Contadora</span>}
          </label>
          <input type="number" className={inputCls} placeholder={autoRate ? autoRate.toFixed(2) : 'Enter rate'} value={form.rate} onChange={e => set('rate', e.target.value)} />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

export default function RWGastos({ expenses, conversions, onAdd, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterCur, setFilterCur] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const filtered = useMemo(() => {
    const rows = expenses.filter(e => {
      if (filterCat !== 'all' && e.category !== filterCat) return false
      if (filterCur !== 'all' && e.inputCurrency !== filterCur) return false
      if (dateFrom && e.date < dateFrom) return false
      if (dateTo && e.date > dateTo) return false
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'ars') rows.sort((a, b) => dir * (a.amountARS - b.amountARS))
    else if (sortField === 'usd') rows.sort((a, b) => dir * (a.amountUSD - b.amountUSD))
    else rows.sort((a, b) => b.date.localeCompare(a.date))
    return rows
  }, [expenses, filterCat, filterCur, dateFrom, dateTo, search, sortField, sortDir])

  const totalARS = filtered.reduce((s, e) => s + e.amountARS, 0)
  const totalUSD = filtered.reduce((s, e) => s + e.amountUSD, 0)

  // Summary by category (for the top bar)
  const catSummary = useMemo(() => {
    const map = {}
    for (const e of expenses) {
      map[e.category] = (map[e.category] || 0) + e.amountUSD
    }
    return RW_CATEGORIES.filter(c => map[c.id] > 0).map(c => ({ ...c, total: map[c.id] }))
  }, [expenses])

  const handleDelete = (id) => { if (window.confirm('Delete this expense?')) onDelete(id) }
  const toggleSort = (f) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('desc') } }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-0.5">Rebe's Way</p>
          <h2 className="text-xl font-bold text-gray-900">Gastos</h2>
          <p className="text-sm text-gray-500">Compras y costos del negocio</p>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Category summary chips */}
      {catSummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {catSummary.map(c => (
            <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${filterCat === c.id ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}
              style={filterCat === c.id ? { background: c.color, borderColor: c.color } : {}}>
              <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
              {c.name} · {fmtUSD(c.total)}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400">
            <option value="all">All Categories</option>
            {RW_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {['all', 'ARS', 'USD'].map(cur => (
              <button key={cur} onClick={() => setFilterCur(cur)}
                className={`px-3 py-2 font-medium transition-colors ${filterCur === cur ? 'bg-pink-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {cur === 'all' ? 'All' : cur}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={13} className="text-gray-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          {(dateFrom || dateTo || filterCat !== 'all' || filterCur !== 'all' || search) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setFilterCat('all'); setFilterCur('all'); setSearch('') }}
              className="text-xs text-pink-600 hover:underline">Clear filters</button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500">{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">|</span>
          <span className="font-medium text-gray-700">ARS: <span className="text-gray-900">{fmtARS(totalARS)}</span></span>
          <span className="text-gray-300">|</span>
          <span className="font-medium text-gray-700">USD: <span className="text-gray-900">{fmtUSD(totalUSD)}</span></span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-gray-400 text-sm">
              {expenses.length === 0 ? 'No expenses yet. ¡Agrega tu primera compra!' : 'No expenses match your filters.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Description</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('ars')}>
                  ARS {sortField === 'ars' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('usd')}>
                  USD {sortField === 'usd' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Rate</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const cat = getCat(e.category)
                return (
                  <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{e.description}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{ background: cat.color + '22', color: cat.color }}>{cat.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtARS(e.amountARS)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtUSD(e.amountUSD)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{e.rateARS_USD ? fmtRate(e.rateARS_USD) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal(e)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ExpenseModal
          expense={modal === 'add' ? null : modal}
          conversions={conversions}
          onSave={modal === 'add' ? onAdd : onUpdate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
