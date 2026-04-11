import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react'
import Modal from '../components/Modal'
import { fmtUSD } from '../lib/currency'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const today = () => new Date().toISOString().split('T')[0]

const ASSET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#ef4444', '#06b6d4', '#f97316',
]

function InvestmentModal({ investment, onSave, onClose }) {
  const [form, setForm] = useState({
    date: investment?.date || today(),
    asset: investment?.asset || '',
    amountUSD: investment?.amountUSD?.toString() || '',
    notes: investment?.notes || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.asset.trim() || !form.amountUSD) return
    onSave({
      id: investment?.id || uid(),
      date: form.date,
      asset: form.asset.trim().toUpperCase(),
      amountUSD: parseFloat(form.amountUSD),
      notes: form.notes.trim(),
    })
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <Modal title={investment ? 'Edit Investment' : 'Add Investment'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset / Ticker</label>
            <input
              type="text" className={inputCls} placeholder="e.g. NVDA, BTC, SPY"
              value={form.asset} onChange={e => set('asset', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount (USD)</label>
          <input
            type="number" className={inputCls} placeholder="0.00"
            value={form.amountUSD} onChange={e => set('amountUSD', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <input
            type="text" className={inputCls} placeholder="e.g. monthly DCA, rebalance..."
            value={form.notes} onChange={e => set('notes', e.target.value)}
          />
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

export default function Investments({ investments, onAdd, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null)
  const [filterAsset, setFilterAsset] = useState('all')

  const sorted = useMemo(() => [...investments].sort((a, b) => b.date.localeCompare(a.date)), [investments])

  // Asset totals for pie chart
  const assetTotals = useMemo(() => {
    const map = {}
    for (const inv of investments) {
      map[inv.asset] = (map[inv.asset] || 0) + inv.amountUSD
    }
    return Object.entries(map)
      .map(([asset, total], i) => ({ asset, total, color: ASSET_COLORS[i % ASSET_COLORS.length] }))
      .sort((a, b) => b.total - a.total)
  }, [investments])

  const assets = useMemo(() => [...new Set(investments.map(i => i.asset))].sort(), [investments])

  const filtered = filterAsset === 'all' ? sorted : sorted.filter(i => i.asset === filterAsset)

  const totalInvested = investments.reduce((s, i) => s + i.amountUSD, 0)

  const getColor = (asset) => assetTotals.find(a => a.asset === asset)?.color || '#6b7280'

  const handleDelete = (id) => {
    if (window.confirm('Delete this investment entry?')) onDelete(id)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Investments</h2>
          <p className="text-sm text-gray-500">eToro portfolio tracker</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add Investment
        </button>
      </div>

      {investments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Portfolio pie */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Asset Allocation</h3>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="55%" height={130}>
                <PieChart>
                  <Pie data={assetTotals} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="total" paddingAngle={2}>
                    {assetTotals.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtUSD(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {assetTotals.map(({ asset, total, color }) => (
                  <div key={asset} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="font-semibold text-gray-700 w-12">{asset}</span>
                    <span className="text-gray-500">{fmtUSD(total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Invested</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmtUSD(totalInvested)}</p>
              <p className="text-xs text-gray-400 mt-1">{investments.length} entries</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assets</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{assetTotals.length}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {assetTotals.slice(0, 4).map(({ asset, color }) => (
                  <span key={asset} className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: color + '22', color }}>
                    {asset}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      {assets.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {['all', ...assets].map(a => (
            <button
              key={a}
              onClick={() => setFilterAsset(a)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterAsset === a ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              style={filterAsset === a ? { background: a === 'all' ? '#3b82f6' : getColor(a) } : {}}
            >
              {a === 'all' ? 'All assets' : a}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <TrendingUp size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No investments yet. Add your first eToro entry!</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date', 'Asset', 'Amount (USD)', 'Notes', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 last:w-16">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{inv.date}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold px-2 py-0.5 rounded"
                      style={{ background: getColor(inv.asset) + '22', color: getColor(inv.asset) }}>
                      {inv.asset}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{fmtUSD(inv.amountUSD)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{inv.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal(inv)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(inv.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <InvestmentModal
          investment={modal === 'add' ? null : modal}
          onSave={modal === 'add' ? onAdd : onUpdate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
