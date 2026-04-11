import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import Modal from '../components/Modal'
import { fmtUSD, fmtARS, getRateForDate } from '../lib/currency'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

function IncomeModal({ entry, conversions, onSave, onClose }) {
  const thisMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(entry ? entry.date.slice(0, 7) : thisMonth)
  const [amountUSD, setAmountUSD] = useState(entry?.amountUSD?.toString() || '')
  const [notes, setNotes] = useState(entry?.notes || '')

  const rate = getRateForDate(conversions, month + '-01')
  const arsEquiv = rate && amountUSD ? parseFloat(amountUSD) * rate : null

  const handleSave = () => {
    if (!amountUSD) return
    onSave({
      id: entry?.id || uid(),
      date: month + '-01',
      amountUSD: parseFloat(amountUSD),
      notes: notes.trim(),
    })
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <Modal title={entry ? 'Edit Income' : 'Add Income'} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <input type="month" className={inputCls} value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount (USD)</label>
          <input
            type="number" className={inputCls} placeholder="e.g. 3903"
            value={amountUSD} onChange={e => setAmountUSD(e.target.value)}
          />
          {arsEquiv && (
            <p className="text-xs text-gray-400 mt-1">≈ {fmtARS(arsEquiv)} at ${rate.toFixed(2)}/USD</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <input
            type="text" className={inputCls} placeholder="e.g. salary, freelance..."
            value={notes} onChange={e => setNotes(e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Save</button>
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

export default function Income({ income, conversions, onAdd, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null)

  const sorted = useMemo(() => [...income].sort((a, b) => b.date.localeCompare(a.date)), [income])

  // Group by year
  const byYear = useMemo(() => {
    const map = {}
    for (const e of sorted) {
      const y = e.date.slice(0, 4)
      if (!map[y]) map[y] = []
      map[y].push(e)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [sorted])

  const totalAllTime = income.reduce((s, e) => s + e.amountUSD, 0)

  const handleDelete = (id) => {
    if (window.confirm('Delete this income entry?')) onDelete(id)
  }

  const monthLabel = (dateStr) => {
    const [y, m] = dateStr.split('-')
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Income</h2>
          <p className="text-sm text-gray-500">Your actual USD income, separate from DolarApp conversions</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add Income
        </button>
      </div>

      {income.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total All Time</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmtUSD(totalAllTime)}</p>
        </div>
      )}

      {byYear.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <Wallet size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No income entries yet. Add your monthly income here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byYear.map(([year, entries]) => {
            const yearTotal = entries.reduce((s, e) => s + e.amountUSD, 0)
            return (
              <div key={year} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{year}</span>
                  <span className="text-xs text-gray-500">Total: <strong className="text-gray-700">{fmtUSD(yearTotal)}</strong></span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Month', 'Income (USD)', 'Notes', ''].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2.5 last:w-16">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => {
                      const rate = getRateForDate(conversions, e.date)
                      return (
                        <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 capitalize">{monthLabel(e.date)}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-green-600">{fmtUSD(e.amountUSD)}</p>
                            {rate && <p className="text-xs text-gray-400">{fmtARS(e.amountUSD * rate)}</p>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{e.notes || '—'}</td>
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
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <IncomeModal
          entry={modal === 'add' ? null : modal}
          conversions={conversions}
          onSave={modal === 'add' ? onAdd : onUpdate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
