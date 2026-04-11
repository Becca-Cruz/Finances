import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Conversions from './pages/Conversions'
import Investments from './pages/Investments'
import Settings from './pages/Settings'
import { useLocalStorage } from './lib/storage'
import { DEFAULT_CATEGORIES } from './lib/defaults'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [expenses, setExpenses] = useLocalStorage('fin_expenses', [])
  const [conversions, setConversions] = useLocalStorage('fin_conversions', [])
  const [investments, setInvestments] = useLocalStorage('fin_investments', [])
  const [categories, setCategories] = useLocalStorage('fin_categories', DEFAULT_CATEGORIES)

  const addExpense = useCallback((e) => setExpenses(p => [e, ...p]), [setExpenses])
  const updateExpense = useCallback((e) => setExpenses(p => p.map(x => x.id === e.id ? e : x)), [setExpenses])
  const deleteExpense = useCallback((id) => setExpenses(p => p.filter(x => x.id !== id)), [setExpenses])

  const addConversions = useCallback((items) => {
    setConversions(p => {
      const ids = new Set(p.map(c => c.id))
      return [...items.filter(c => !ids.has(c.id)), ...p]
    })
  }, [setConversions])
  const addConversion = useCallback((c) => setConversions(p => [c, ...p]), [setConversions])
  const deleteConversion = useCallback((id) => setConversions(p => p.filter(c => c.id !== id)), [setConversions])

  const addInvestment = useCallback((i) => setInvestments(p => [i, ...p]), [setInvestments])
  const updateInvestment = useCallback((i) => setInvestments(p => p.map(x => x.id === i.id ? i : x)), [setInvestments])
  const deleteInvestment = useCallback((id) => setInvestments(p => p.filter(x => x.id !== id)), [setInvestments])

  const content = {
    dashboard: (
      <Dashboard
        expenses={expenses}
        conversions={conversions}
        investments={investments}
        categories={categories}
      />
    ),
    expenses: (
      <Expenses
        expenses={expenses}
        categories={categories}
        conversions={conversions}
        onAdd={addExpense}
        onUpdate={updateExpense}
        onDelete={deleteExpense}
      />
    ),
    conversions: (
      <Conversions
        conversions={conversions}
        onAddMultiple={addConversions}
        onAdd={addConversion}
        onDelete={deleteConversion}
      />
    ),
    investments: (
      <Investments
        investments={investments}
        onAdd={addInvestment}
        onUpdate={updateInvestment}
        onDelete={deleteInvestment}
      />
    ),
    settings: (
      <Settings
        categories={categories}
        setCategories={setCategories}
        expenses={expenses}
        conversions={conversions}
        investments={investments}
        setExpenses={setExpenses}
        setConversions={setConversions}
        setInvestments={setInvestments}
      />
    ),
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        {content[page]}
      </main>
    </div>
  )
}
