import { useState, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Income from './pages/Income'
import Expenses from './pages/Expenses'
import Conversions from './pages/Conversions'
import EToroPage from './pages/eToro'
import Stats from './pages/Stats'
import RWDashboard from './pages/RWDashboard'
import RWGastos from './pages/RWGastos'
import RWVentas from './pages/RWVentas'
import Settings from './pages/Settings'
import { useLocalStorage } from './lib/storage'
import { DEFAULT_CATEGORIES } from './lib/defaults'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [expenseFilter, setExpenseFilter] = useState({ dateFrom: '', dateTo: '' })
  const navigateToExpenses = useCallback((dateFrom, dateTo) => {
    setExpenseFilter({ dateFrom, dateTo })
    setPage('expenses')
  }, [])
  const handleSidebarNav = useCallback((p) => {
    setExpenseFilter({ dateFrom: '', dateTo: '' })
    setPage(p)
  }, [])
  const [expenses, setExpenses] = useLocalStorage('fin_expenses', [])
  const [conversions, setConversions] = useLocalStorage('fin_conversions', [])
  const [investments, setInvestments] = useLocalStorage('fin_investments', [])
  const [categories, setCategories] = useLocalStorage('fin_categories', DEFAULT_CATEGORIES)
  const [income, setIncome] = useLocalStorage('fin_income', [])
  const [etoroData, setEtoroData] = useLocalStorage('fin_etoro', null)
  const [rwExpenses, setRwExpenses] = useLocalStorage('rw_expenses', [])
  const addRwExpense    = useCallback((e) => setRwExpenses(p => [e, ...p]), [setRwExpenses])
  const updateRwExpense = useCallback((e) => setRwExpenses(p => p.map(x => x.id === e.id ? e : x)), [setRwExpenses])
  const deleteRwExpense = useCallback((id) => setRwExpenses(p => p.filter(x => x.id !== id)), [setRwExpenses])

  const [rwSales, setRwSales] = useLocalStorage('rw_sales', [])
  const addRwSale    = useCallback((s) => setRwSales(p => [s, ...p]), [setRwSales])
  const updateRwSale = useCallback((s) => setRwSales(p => p.map(x => x.id === s.id ? s : x)), [setRwSales])
  const deleteRwSale = useCallback((id) => setRwSales(p => p.filter(x => x.id !== id)), [setRwSales])

  // Migrate categories: add parentId field + add any missing default subcategories
  useEffect(() => {
    const storedIds = new Set(categories.map(c => c.id))
    const missing = DEFAULT_CATEGORIES.filter(d => !storedIds.has(d.id))
    const needsParentMigration = categories.some(c => c.parentId === undefined)
    if (!needsParentMigration && missing.length === 0) return
    setCategories(cats => {
      const updated = cats.map(cat => {
        if (cat.parentId !== undefined) return cat
        const def = DEFAULT_CATEGORIES.find(d => d.id === cat.id)
        return { ...cat, parentId: def?.parentId ?? null }
      })
      return [...updated, ...missing]
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addExpense = useCallback((e) => setExpenses(p => [e, ...p]), [setExpenses])
  const addExpenses = useCallback((items) => {
    setExpenses(p => {
      const ids = new Set(p.map(x => x.id))
      return [...items.filter(x => !ids.has(x.id)), ...p]
    })
  }, [setExpenses])
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

  const addIncome = useCallback((i) => setIncome(p => [i, ...p]), [setIncome])
  const updateIncome = useCallback((i) => setIncome(p => p.map(x => x.id === i.id ? i : x)), [setIncome])
  const deleteIncome = useCallback((id) => setIncome(p => p.filter(x => x.id !== id)), [setIncome])

  const content = {
    dashboard: (
      <Dashboard
        expenses={expenses} conversions={conversions}
        investments={investments} categories={categories} income={income}
        onNavigate={navigateToExpenses}
      />
    ),
    income: (
      <Income
        income={income} conversions={conversions}
        onAdd={addIncome} onUpdate={updateIncome} onDelete={deleteIncome}
      />
    ),
    expenses: (
      <Expenses
        expenses={expenses} categories={categories} conversions={conversions}
        onAdd={addExpense} onUpdate={updateExpense} onDelete={deleteExpense}
        onAddConversions={addConversions}
        initialDateFrom={expenseFilter.dateFrom}
        initialDateTo={expenseFilter.dateTo}
      />
    ),
    contadora: (
      <Conversions
        conversions={conversions}
        onAddMultiple={addConversions} onAdd={addConversion} onDelete={deleteConversion}
      />
    ),
    etoro: (
      <EToroPage
        data={etoroData} onImport={setEtoroData}
        onAddExpenses={addExpenses} expenses={expenses}
      />
    ),
    stats: (
      <Stats expenses={expenses} income={income} categories={categories} />
    ),
    'rw-dashboard': (
      <RWDashboard expenses={rwExpenses} sales={rwSales} />
    ),
    'rw-gastos': (
      <RWGastos
        expenses={rwExpenses} conversions={conversions}
        onAdd={addRwExpense} onUpdate={updateRwExpense} onDelete={deleteRwExpense}
      />
    ),
    'rw-ventas': (
      <RWVentas
        sales={rwSales}
        onAdd={addRwSale} onUpdate={updateRwSale} onDelete={deleteRwSale}
      />
    ),
    settings: (
      <Settings
        categories={categories} setCategories={setCategories}
        expenses={expenses} conversions={conversions}
        investments={investments} income={income}
        setExpenses={setExpenses} setConversions={setConversions}
        setInvestments={setInvestments} setIncome={setIncome}
      />
    ),
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar page={page} onNavigate={handleSidebarNav} />
      <main className="flex-1 overflow-y-auto">
        {content[page]}
      </main>
    </div>
  )
}
