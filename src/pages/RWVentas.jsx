import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, Camera, X } from 'lucide-react'
import Modal from '../components/Modal'
import { getRateForDate, arsToUsd, usdToArs, fmtARS, fmtUSD } from '../lib/currency'

const today = () => new Date().toISOString().split('T')[0]
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

function compressImage(file, maxDim = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width))
          width = maxDim
        } else if (height > maxDim) {
          width = Math.round(width * (maxDim / height))
          height = maxDim
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const CHANNELS = [
  { id: 'instagram',  name: 'Instagram',  color: '#ec4899' },
  { id: 'whatsapp',   name: 'WhatsApp',   color: '#10b981' },
  { id: 'tiktok',     name: 'TikTok',     color: '#000000' },
  { id: 'presencial', name: 'Presencial', color: '#3b82f6' },
  { id: 'otros',      name: 'Otros',      color: '#6b7280' },
]

const getCh = (id) => CHANNELS.find(c => c.id === id) || CHANNELS.find(c => c.id === 'otros')

// Sales saved before multi-item support only have flat description/quantity/priceARS fields.
// Sales saved before USD support have per-item `priceARS` instead of the currency-agnostic `price`.
const getItems = (sale) => {
  if (sale.items && sale.items.length) {
    return sale.items.map(it => ({
      description: it.description,
      quantity:    it.quantity,
      price:       it.price ?? it.priceARS ?? 0,
    }))
  }
  return [{ description: sale.description, quantity: sale.quantity, price: sale.priceARS }]
}

// Sales saved before USD support have no totalUSD; estimate it from that sale's date rate.
const getSaleUSD = (sale, conversions) => {
  if (sale.totalUSD != null) return sale.totalUSD
  const rate = getRateForDate(conversions, sale.date)
  return rate ? arsToUsd(sale.totalARS, rate) : null
}

function SaleModal({ sale, conversions, onSave, onClose }) {
  const [form, setForm] = useState({
    date:     sale?.date     || today(),
    channel:  sale?.channel  || 'instagram',
    currency: sale?.currency || 'ARS',
    rate:     sale?.rateARS_USD ? sale.rateARS_USD.toString() : '',
    notes:    sale?.notes    || '',
    photo:    sale?.photo    || null,
  })
  const [items, setItems] = useState(() => {
    if (!sale) return [{ id: uid(), description: '', quantity: '1', price: '' }]
    return getItems(sale).map(it => ({
      id:          uid(),
      description: it.description || '',
      quantity:    it.quantity?.toString() || '1',
      price:       it.price?.toString() || '',
    }))
  })
  const [uploading, setUploading] = useState(false)

  const set     = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (id, k, v) => setItems(list => list.map(it => it.id === id ? { ...it, [k]: v } : it))
  const addItem = () => setItems(list => [...list, { id: uid(), description: '', quantity: '1', price: '' }])
  const removeItem = (id) => setItems(list => list.length > 1 ? list.filter(it => it.id !== id) : list)

  const autoRate = getRateForDate(conversions, form.date)

  // Pre-fill exchange rate from Contadora whenever the date changes and it hasn't been touched yet.
  useMemo(() => {
    if (autoRate && !form.rate) setForm(f => ({ ...f, rate: autoRate.toFixed(2) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, autoRate])

  const rate  = parseFloat(form.rate) || autoRate || 0
  const itemTotals = items.map(it => (parseInt(it.quantity) || 0) * (parseFloat(it.price) || 0))
  const total = itemTotals.reduce((s, t) => s + t, 0)

  const equiv = total > 0 && rate
    ? (form.currency === 'ARS' ? `≈ ${fmtUSD(arsToUsd(total, rate))}` : `≈ ${fmtARS(usdToArs(total, rate))}`)
    : ''

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await compressImage(file)
      set('photo', dataUrl)
    } catch (err) {
      console.error('Error al procesar la foto', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSave = () => {
    const validItems = items
      .map(it => ({
        description: it.description.trim(),
        quantity:    parseInt(it.quantity) || 1,
        price:       parseFloat(it.price) || 0,
      }))
      .filter(it => it.description && it.price > 0)

    if (!validItems.length) return
    if (form.currency === 'USD' && !rate) return

    const totalInCurrency = validItems.reduce((s, it) => s + it.quantity * it.price, 0)
    const totalARS = form.currency === 'ARS' ? totalInCurrency : usdToArs(totalInCurrency, rate)
    const totalUSD = form.currency === 'USD' ? totalInCurrency : (rate ? arsToUsd(totalInCurrency, rate) : null)

    onSave({
      id:          sale?.id || uid(),
      date:        form.date,
      channel:     form.channel,
      currency:    form.currency,
      rateARS_USD: rate || 0,
      notes:       form.notes.trim(),
      photo:       form.photo || null,
      items:       validItems,
      description: validItems.map(it => it.description).join(', '),
      quantity:    validItems.reduce((s, it) => s + it.quantity, 0),
      totalARS:    parseFloat(totalARS.toFixed(2)),
      totalUSD:    totalUSD != null ? parseFloat(totalUSD.toFixed(2)) : null,
    })
    onClose()
  }

  const inputCls = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400'

  return (
    <Modal
      title={sale ? 'Edit Venta' : 'Nueva Venta'}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700">Save</button>
          <button onClick={onClose}   className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input type="date" className={`${inputCls} w-full`} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Canal</label>
            <select className={`${inputCls} w-full`} value={form.channel} onChange={e => set('channel', e.target.value)}>
              {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-600">Items</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
              {['ARS', 'USD'].map(cur => (
                <button key={cur} type="button" onClick={() => set('currency', cur)}
                  className={`px-2.5 py-1 font-semibold transition-colors ${form.currency === cur ? 'bg-pink-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {cur}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {items.map(it => (
              <div key={it.id} className="flex gap-2 items-start">
                <input type="text" className={`${inputCls} flex-1`} placeholder="ej. Lapicera beads azul"
                  value={it.description} onChange={e => setItem(it.id, 'description', e.target.value)} />
                <input type="number" min="1" className={`${inputCls} w-16`} placeholder="Qty"
                  value={it.quantity} onChange={e => setItem(it.id, 'quantity', e.target.value)} />
                <input type="number" min="0" className={`${inputCls} w-24`} placeholder={form.currency}
                  value={it.price} onChange={e => setItem(it.id, 'price', e.target.value)} />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(it.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700">
            <Plus size={14} /> Agregar item
          </button>
        </div>

        {form.currency === 'USD' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tipo de cambio (ARS por USD)
              {autoRate && <span className="text-gray-400 ml-1">— auto de Contadora</span>}
            </label>
            <input type="number" className={`${inputCls} w-full`} placeholder={autoRate ? autoRate.toFixed(2) : 'Ingresar tipo de cambio'}
              value={form.rate} onChange={e => set('rate', e.target.value)} />
          </div>
        )}

        {total > 0 && (
          <div className="bg-pink-50 rounded-lg px-4 py-2.5 flex justify-between items-center">
            <span className="text-sm text-pink-700">Total</span>
            <div className="text-right">
              <div className="text-lg font-bold text-pink-700">{form.currency === 'USD' ? fmtUSD(total) : fmtARS(total)}</div>
              {equiv && <div className="text-xs text-pink-400">{equiv}</div>}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
          <input type="text" className={`${inputCls} w-full`} placeholder="Color, cliente, etc." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Foto del pedido (opcional)</label>
          {form.photo ? (
            <div className="relative inline-block">
              <img src={form.photo} alt="Pedido" className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
              <button type="button" onClick={() => set('photo', null)}
                className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-red-600 shadow-sm">
                <X size={12} />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer hover:bg-gray-50 w-fit">
              <Camera size={16} />
              {uploading ? 'Procesando...' : 'Adjuntar foto'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
            </label>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function RWVentas({ sales, conversions, onAdd, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('all')
  const [lightbox, setLightbox] = useState(null)

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
  const totalUSD   = filtered.reduce((sum, s) => {
    const usd = getSaleUSD(s, conversions)
    return usd != null ? sum + usd : sum
  }, 0)

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
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-500">{filtered.length} venta{filtered.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">{totalUnits} unidad{totalUnits !== 1 ? 'es' : ''}</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-pink-700">{fmtARS(totalARS)}</span>
          {totalUSD > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">≈ {fmtUSD(totalUSD)}</span>
            </>
          )}
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
                const items = getItems(s)
                const cur = s.currency || 'ARS'
                const fmtCur = cur === 'USD' ? fmtUSD : fmtARS
                return (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap align-top">{s.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        {s.photo && (
                          <img src={s.photo} alt="Pedido" onClick={() => setLightbox(s.photo)}
                            className="h-9 w-9 rounded-md object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" />
                        )}
                        <div>
                          {items.length > 1 ? (
                            <ul className="space-y-0.5">
                              {items.map((it, i) => (
                                <li key={i} className="text-sm text-gray-800">
                                  <span className="font-medium">{it.description}</span>
                                  <span className="text-gray-400"> × {it.quantity} · {fmtCur(it.price)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm font-medium text-gray-800">{items[0]?.description}</p>
                          )}
                          {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: ch.color + '22', color: ch.color }}>{ch.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 align-top">{s.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap align-top">{items.length === 1 ? fmtCur(items[0].price) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-pink-700 whitespace-nowrap align-top">
                      {fmtARS(s.totalARS)}
                      {cur === 'USD' && <div className="text-xs font-normal text-gray-400">{fmtUSD(s.totalUSD ?? 0)}</div>}
                    </td>
                    <td className="px-4 py-3 align-top">
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
          conversions={conversions}
          onSave={modal === 'add' ? onAdd : onUpdate}
          onClose={() => setModal(null)}
        />
      )}

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Pedido" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  )
}
