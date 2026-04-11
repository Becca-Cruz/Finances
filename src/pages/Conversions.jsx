import { useState, useMemo, useRef } from 'react'
import { Plus, Upload, Trash2, Info } from 'lucide-react'
import Modal from '../components/Modal'
import { parseDolarAppCSV } from '../lib/csvParser'
import { fmtARS, fmtUSD, fmtRate, getMonthlyRate } from '../lib/currency'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const today = () => new Date().toISOString().split('T')[0]

function ManualModal({ onSave, onClose }) {
  const [form, setForm] = useState({ date: today(), amountARS: '', rate: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const amountARS = parseFloat(form.amountARS) || 0
  const rate = parseFloat(form.rate) || 0
  const amountUSD = rate ? amountARS / rate : 0

  const handleSave = () => {
    if (!amountARS || !rate) return
    onSave({ id: uid(), date: form.date, amountARS, rateARS_USD: rate, amountUSD, source: 'manual' })
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <Modal title="Add Conversion" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received (ARS)</label>
          <input
            type="number" className={inputCls} placeholder="e.g. 410000"
            value={form.amountARS} onChange={e => set('amountARS', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rate (ARS per USD)</label>
          <input
            type="number" className={inputCls} placeholder="e.g. 1469.76"
            value={form.rate} onChange={e => set('rate', e.target.value)}
          />
          {amountUSD > 0 && (
            <p className="text-xs text-gray-500 mt-1">≈ {fmtUSD(amountUSD)} converted</p>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Save
          </button>
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function Conversions({ conversions, onAddMultiple, onAdd, onDelete }) {
  const [showManual, setShowManual] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const fileRef = useRef()

  const handleCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseDolarAppCSV(ev.target.result)
        if (parsed.length === 0) {
          setImportMsg({ type: 'error', text: 'No valid rows found. Is this a DolarApp export?' })
        } else {
          onAddMultiple(parsed)
          setImportMsg({ type: 'ok', text: `Imported ${parsed.length} conversion${parsed.length !== 1 ? 's' : ''} (duplicates skipped).` })
        }
      } catch {
        setImportMsg({ type: 'error', text: 'Failed to parse the file.' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this conversion?')) onDelete(id)
  }

  const sorted = useMemo(
    () => [...conversions].sort((a, b) => b.date.localeCompare(a.date)),
    [conversions]
  )

  // Monthly summaries
  const monthGroups = useMemo(() => {
    const map = {}
    for (const c of sorted) {
      const ym = c.date.slice(0, 7)
      if (!map[ym]) map[ym] = []
      map[ym].push(c)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [sorted])

  const totalUSD = conversions.reduce((s, c) => s + c.amountUSD, 0)
  const totalARS = conversions.reduce((s, c) => s + c.amountARS, 0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contadora</h2>
          <p className="text-sm text-gray-500">USD → ARS transfers to declare with your accountant</p>
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
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} /> Add Manually
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

      {/* Stats row */}
      {conversions.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total USD Converted', value: fmtUSD(totalUSD) },
            { label: 'Total ARS Received', value: fmtARS(totalARS) },
            { label: 'All-time Avg Rate', value: `$${fmtRate(totalARS / totalUSD)}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grouped by month */}
      {monthGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm">No conversions yet.<br />Import your DolarApp CSV or add one manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthGroups.map(([ym, items]) => {
            const monthTotalARS = items.reduce((s, c) => s + c.amountARS, 0)
            const monthTotalUSD = items.reduce((s, c) => s + c.amountUSD, 0)
            const avgRate = monthTotalARS / monthTotalUSD

            const [year, month] = ym.split('-')
            const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })

            return (
              <div key={ym} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Total: <strong className="text-gray-700">{fmtUSD(monthTotalUSD)}</strong></span>
                    <span>Avg rate: <strong className="text-gray-700">${fmtRate(avgRate)}</strong></span>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Date', 'ARS Received', 'USD Equivalent', 'Rate', 'Source', ''].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2.5 last:w-12">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(c => (
                      <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">{c.date}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{fmtARS(c.amountARS)}</td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{fmtUSD(c.amountUSD)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">${fmtRate(c.rateARS_USD)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.source === 'csv' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {c.source}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {showManual && (
        <ManualModal onSave={onAdd} onClose={() => setShowManual(false)} />
      )}
    </div>
  )
}
