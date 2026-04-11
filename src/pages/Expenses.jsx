import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Filter, Upload, Info, ChevronUp, ChevronDown } from 'lucide-react'
import Modal from '../components/Modal'
import { getRateForDate, arsToUsd, usdToArs, fmtARS, fmtUSD, fmtRate } from '../lib/currency'
import { getParentId } from '../lib/defaults'
import { parseFullMeowCSV } from '../lib/csvParser'

const today = () => new Date().toISOString().split('T')[0]
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

function ExpenseModal({ expense, categories, conversions, onSave, onClose }) {
  const [form, setForm] = useState({
    date: expense?.date || today(),
    description: expense?.description || '',
    category: expense?.category || categories[0]?.id || '',
    currency: expense?.inputCurrency || 'ARS',
    amount: expense?.inputAmount?.toString() || '',
    rate: '',
  })

  const autoRate = getRateForDate(conversions, form.date)

  useEffect(() => {
    setForm(f => ({ ...f, rate: autoRate ? autoRate.toFixed(2) : f.rate }))
  }, [form.date, autoRate])

  useEffect(() => {
    if (!expense?.rateARS_USD) return
    setForm(f => ({ ...f, rate: expense.rateARS_USD.toFixed(2) }))
  }, [])

  const rate = parseFloat(form.rate) || 0
  const amount = parseFloat(form.amount) || 0
  const equiv = form.currency === 'ARS'
    ? (rate ? `≈ ${fmtUSD(arsToUsd(amount, rate))}` : '')
    : (rate ? `≈ ${fmtARS(usdToArs(amount, rate))}` : '')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.description.trim() || !form.amount) return
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
      amountARS,
      amountUSD,
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
              {categories.filter(c => !c.parentId).map(parent => {
                const children = categories.filter(c => c.parentId === parent.id)
                if (children.length > 0) return (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name} — general</option>
                    {children.map(child => <option key={child.id} value={child.id}>&nbsp;&nbsp;↳ {child.name}</option>)}
                  </optgroup>
                )
                return <option key={parent.id} value={parent.id}>{parent.name}</option>
              })}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input
            type="text"
            className={inputCls}
            placeholder="What was this for?"
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
          <div className="flex gap-2">
            <input
              type="number"
              className={`${inputCls} flex-1`}
              placeholder="0.00"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              min="0"
            />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {['ARS', 'USD'].map(cur => (
                <button
                  key={cur}
                  onClick={() => set('currency', cur)}
                  className={`px-3 py-2 font-medium transition-colors ${
                    form.currency === cur ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
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
              : autoRate && !form.rate && <span className="text-gray-400 ml-1">— auto from conversions</span>
            }
          </label>
          <input
            type="number"
            className={inputCls}
            placeholder={autoRate ? autoRate.toFixed(2) : 'Enter rate manually'}
            value={form.rate}
            onChange={e => set('rate', e.target.value)}
          />
          {form.currency === 'USD' && !rate && (
            <p className="text-xs text-gray-400 mt-1">Without a rate the ARS equivalent will be blank.</p>
          )}
          {form.currency === 'ARS' && !autoRate && conversions.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No conversions logged yet — enter rate manually.</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function Expenses({ expenses, categories, conversions, onAdd, onUpdate, onDelete, onAddConversions, initialDateFrom = '', initialDateTo = '' }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterCur, setFilterCur] = useState('all')
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('desc')
  const [modal, setModal] = useState(null)
  const [importMsg, setImportMsg] = useState(null)
  const fileRef = useRef()

  const handleCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const { expenses: parsedExp, transfers } = parseFullMeowCSV(ev.target.result, categories, conversions)
        const existingExpMap = new Map(expenses.map(x => [x.id, x]))
        const expToAdd = parsedExp.filter(p => !existingExpMap.has(p.id))
        // Update existing expenses that were saved with amountUSD=0 because no rate was available yet
        const expToUpdate = parsedExp.filter(p => {
          const existing = existingExpMap.get(p.id)
          return existing && existing.amountUSD === 0 && p.amountUSD > 0
        })
        expToAdd.forEach(onAdd)
        expToUpdate.forEach(onUpdate)
        if (transfers.length > 0) onAddConversions(transfers)
        const parts = []
        if (expToAdd.length) parts.push(`${expToAdd.length} gasto${expToAdd.length !== 1 ? 's' : ''}`)
        if (expToUpdate.length) parts.push(`${expToUpdate.length} actualizados con tasa`)
        if (transfers.length) parts.push(`${transfers.length} transferencia${transfers.length !== 1 ? 's' : ''} (Contadora)`)
        setImportMsg(parts.length
          ? { type: 'ok', text: `Imported: ${parts.join(' · ')}` }
          : { type: 'ok', text: 'Already up to date — no new rows.' })
      } catch {
        setImportMsg({ type: 'error', text: 'Failed to parse the file.' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

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
    if (sortField === 'category') {
      const getName = (e) => categories.find(c => c.id === e.category)?.name?.toLowerCase() || e.category
      rows.sort((a, b) => dir * getName(a).localeCompare(getName(b)))
    } else if (sortField === 'ars') {
      rows.sort((a, b) => dir * (a.amountARS - b.amountARS))
    } else if (sortField === 'usd') {
      rows.sort((a, b) => dir * (a.amountUSD - b.amountUSD))
    } else {
      rows.sort((a, b) => b.date.localeCompare(a.date))
    }
    return rows
  }, [expenses, filterCat, filterCur, dateFrom, dateTo, search, sortField, sortDir, categories])

  const totalARS = filtered.reduce((s, e) => s + e.amountARS, 0)
  const totalUSD = filtered.reduce((s, e) => s + e.amountUSD, 0)

  const getCat = (id) => {
    const cat = categories.find(c => c.id === id) || { id, name: id, color: '#6b7280', parentId: null }
    const parent = cat.parentId ? categories.find(c => c.id === cat.parentId) : null
    return { ...cat, parent }
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this expense?')) onDelete(id)
  }

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300 ml-1 inline" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-500 ml-1 inline" />
      : <ChevronDown size={12} className="text-blue-500 ml-1 inline" />
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
          <p className="text-sm text-gray-500">Track your spending in ARS & USD</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Upload size={15} /> Import CSV
          </button>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {importMsg && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${importMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <Info size={15} className="mt-0.5 shrink-0" />
          <span>{importMsg.text}</span>
          <button onClick={() => setImportMsg(null)} className="ml-auto text-xs underline">dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.filter(c => !c.parentId).map(parent => {
              const children = categories.filter(c => c.parentId === parent.id)
              if (children.length > 0) return (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.id}>{parent.name}</option>
                  {children.map(child => <option key={child.id} value={child.id}>&nbsp;&nbsp;↳ {child.name}</option>)}
                </optgroup>
              )
              return <option key={parent.id} value={parent.id}>{parent.name}</option>
            })}
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {['all', 'ARS', 'USD'].map(cur => (
              <button
                key={cur}
                onClick={() => setFilterCur(cur)}
                className={`px-3 py-2 font-medium transition-colors ${
                  filterCur === cur ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cur === 'all' ? 'All' : cur}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={13} className="text-gray-400" />
          <input
            type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
          {(dateFrom || dateTo || filterCat !== 'all' || filterCur !== 'all' || search) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setFilterCat('all'); setFilterCur('all'); setSearch('') }}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">|</span>
          <span className="font-medium text-gray-700">Total: <span className="text-gray-900">{fmtARS(totalARS)}</span></span>
          <span className="text-gray-300">|</span>
          <span className="font-medium text-gray-700"><span className="text-gray-900">{fmtUSD(totalUSD)}</span></span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-gray-400 text-sm">
              {expenses.length === 0 ? 'No expenses yet. Add your first one!' : 'No expenses match your filters.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date', 'Description'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
                <th
                  className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('category')}
                >
                  Category<SortIcon field="category" />
                </th>
                <th
                  className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('ars')}
                >
                  ARS<SortIcon field="ars" />
                </th>
                <th
                  className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('usd')}
                >
                  USD<SortIcon field="usd" />
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
                      <div className="flex flex-col gap-0.5">
                        {cat.parent && (
                          <span className="text-[10px] text-gray-400 font-medium">{cat.parent.name}</span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap w-fit"
                          style={{ background: (cat.parent?.color || cat.color) + '22', color: cat.parent?.color || cat.color }}>
                          {cat.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtARS(e.amountARS)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtUSD(e.amountUSD)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtRate(e.rateARS_USD)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setModal(e)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
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
          categories={categories}
          conversions={conversions}
          onSave={modal === 'add' ? onAdd : onUpdate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
