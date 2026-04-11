import { useState } from 'react'
import { Plus, Trash2, Download, Upload, AlertTriangle } from 'lucide-react'
import Modal from '../components/Modal'
import { DEFAULT_CATEGORIES, SWATCH_COLORS } from '../lib/defaults'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

function CategoryModal({ category, onSave, onClose }) {
  const [name, setName] = useState(category?.name || '')
  const [color, setColor] = useState(category?.color || SWATCH_COLORS[0])

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ id: category?.id || uid(), name: name.trim(), color })
    onClose()
  }

  return (
    <Modal title={category ? 'Edit Category' : 'Add Category'} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Category name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {SWATCH_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-5 h-5 rounded-full" style={{ background: color }} />
            <span className="text-xs text-gray-500">{name || 'Preview'}</span>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
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

export default function Settings({
  categories, setCategories,
  expenses, conversions, investments, income,
  setExpenses, setConversions, setInvestments, setIncome,
}) {
  const [catModal, setCatModal] = useState(null)

  const addCat = (cat) => setCategories(prev => [...prev, cat])
  const updateCat = (cat) => setCategories(prev => prev.map(c => c.id === cat.id ? cat : c))
  const deleteCat = (id) => {
    if (window.confirm('Delete this category? Expenses with this category will show as Unknown.')) {
      setCategories(prev => prev.filter(c => c.id !== id))
    }
  }

  const exportData = () => {
    const data = { expenses, conversions, investments, categories, income, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finances-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.expenses) setExpenses(data.expenses)
        if (data.conversions) setConversions(data.conversions)
        if (data.investments) setInvestments(data.investments)
        if (data.categories) setCategories(data.categories)
        if (data.income) setIncome(data.income)
        alert('Data imported successfully!')
      } catch {
        alert('Failed to parse backup file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const clearAll = () => {
    if (window.confirm('Clear ALL data? This cannot be undone.') &&
        window.confirm('Are you really sure? All expenses, conversions and investments will be deleted.')) {
      setExpenses([])
      setConversions([])
      setInvestments([])
      setIncome([])
      setCategories(DEFAULT_CATEGORIES)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage categories and your data</p>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Expense Categories</h3>
          <button
            onClick={() => setCatModal('add')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                <span className="text-sm text-gray-700 font-medium">{cat.name}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setCatModal(cat)}
                  className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteCat(cat.id)}
                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data management */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Data Management</h3>
          <p className="text-xs text-gray-400 mt-0.5">Your data is stored locally in this browser.</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Export backup</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {expenses.length} expenses · {conversions.length} transfers · {investments.length} investments · {income.length} income entries
              </p>
            </div>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download size={14} /> Export JSON
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Import backup</p>
              <p className="text-xs text-gray-400 mt-0.5">Restores expenses, conversions, investments and categories.</p>
            </div>
            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
              <Upload size={14} /> Import JSON
              <input type="file" accept=".json" className="hidden" onChange={importData} />
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">Clear all data</p>
                <p className="text-xs text-red-400 mt-0.5">Permanently deletes everything. Cannot be undone.</p>
              </div>
            </div>
            <button
              onClick={clearAll}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {catModal && (
        <CategoryModal
          category={catModal === 'add' ? null : catModal}
          onSave={catModal === 'add' ? addCat : updateCat}
          onClose={() => setCatModal(null)}
        />
      )}
    </div>
  )
}
