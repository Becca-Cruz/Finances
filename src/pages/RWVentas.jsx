import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import Modal from '../components/Modal'
import { fmtARS } from '../lib/currency'

const today = () => new Date().toISOString().split('T')[0]
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export const CHANNELS = [
  { id: 'instagram',  name: 'Instagram',  color: '#ec4899' },
  { id: 'whatsapp',   name: 'WhatsApp',   color: '#10b981' },
  { id: 'presencial', name: 'Presencial', color: '#3b82f6' },
  { id: 'otros',      name: 'Otros',      color: '#6b7280' },
]

const getCh = (id) => CHANNELS.find(c => c.id === id) || CHANNELS[3]

function SaleModal({ sale, onSave, onClose }) {
  const [form, setForm] = useState({
    date:        sale?.date        || today(),
    description: sale?.description || '',
    quantity:    sale?.quantity?.toString() || '1',
    priceARS:    sale?.priceARS?.toString() || '',
    channel:     sale?.channel     || 'instagram',
    notes:       sale?.notes       || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const qty   = parseInt(form.quantity)  || 1
  const price = parseFloat(form.priceARS) || 0
  const total = qty * price

  const handleSave = () => {
    if (!form.description.trim() || !price) return
    onSave({
      id:          sale?.id || uid(),
      date:        form.date,
      description: form.description.trim(),
      quantity:    qty,
      priceARS:    price,
      totalARS:    parseFloat(total.toFixed(2)),
      channel:     form.channel,
      notes:       form.notes.trim(),
    })
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400'

  return (
    <Modal title={sale ? 'Edit Venta' : 'Nueva Venta'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Canal</label>
            <select className={inputCls} value={form.channel} onChange={e => set('channel', e.target.value)}>
              {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
          <input type="text" className={inputCls} placeholder="ej. Lapicera beads azul" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
            <input type="number" min="1" className={inputCls} value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio por unidad (ARS)</label>
            <input type="number" min="0" className={inputCls} placeholder="0.00" value={form.priceARS} onChange={e => set('priceARS', e.target.value)} />
          </div>
        </div>

        {total > 0 && (
          <div className="bg-pink-50 rounded-lg px-4 py-2.5 flex justify-between items-center">
            <span className="text-sm text-pink-700">Total</span>
            <span className="text-lg font-bold text-pink-700">{fmtARS(total)}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
          <input type="text" className={inputCls} placeholder="Color, cliente, etc." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} className="flex-1 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700">Save</button>
          <button onClick={onClose}   className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

export default function RWVentas({ sales, onAdd, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('all')

  const filtered = useMemo(() => {
    return sales
      .filter(s => {
        if (filterChannel !== 'all' && s.channel !== filterChannel) return false
        if (search && !s.description.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [sales, filterChannel, search])

  const totalARS   = filtered.reduce((s, v) => s + v.totalARS, 0)
  const totalUnits = filtered.reduce((s, v) => s + v.quantity, 0)

  const handleDelete = (id) => { if (window.confirm('Delete this sale?')) onDelete(id) }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-0.5">Rebe's Way</p>
          <h2 className="text-xl font-bold text-gray-900">Ventas</h2>
          <p className="text-sm text-gray-500">Registro de cada venta</p>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors">
          <Plus size={16} /> Nueva Venta
        </button>
      </div>

      {/* Channel filter chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterChannel('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterChannel === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Todos
        </button>
        {CHANNELS.map(c => (
          <button key={c.id} onClick={() => setFilterChannel(filterChannel === c.id ? 'all' : c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterChannel === c.id ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}
            style={filterChannel === c.id ? { background: c.color, borderColor: c.color } : {}}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white" />
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500">{filtered.length} venta{filtered.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">{totalUnits} unidad{totalUnits !== 1 ? 'es' : ''}</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-pink-700">{fmtARS(totalARS)}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-gray-400 text-sm">
              {sales.length === 0 ? '¡Registra tu primera venta!' : 'No hay ventas que coincidan.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Fecha', 'Descripción', 'Canal', 'Qty', 'Precio', 'Total', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 last:w-16">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const ch = getCh(s.channel)
                return (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{s.date}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{s.description}</p>
                      {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: ch.color + '22', color: ch.color }}>{ch.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtARS(s.priceARS)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-pink-700 whitespace-nowrap">{fmtARS(s.totalARS)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal(s)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
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
        <SaleModal
          sale={modal === 'add' ? null : modal}
          onSave={modal === 'add' ? onAdd : onUpdate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
