import { LayoutDashboard, CreditCard, ArrowLeftRight, TrendingUp, Settings, Wallet, BarChart2 } from 'lucide-react'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'stats',     label: 'Stats',     Icon: BarChart2 },
  { id: 'income',    label: 'Income',    Icon: Wallet },
  { id: 'expenses',  label: 'Expenses',  Icon: CreditCard },
  { id: 'contadora', label: 'Contadora', Icon: ArrowLeftRight },
  { id: 'etoro',     label: 'eToro',     Icon: TrendingUp },
  { id: 'settings',  label: 'Settings',  Icon: Settings },
]

export default function Sidebar({ page, onNavigate }) {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <h1 className="text-base font-bold text-gray-900 tracking-tight">Finances</h1>
        <p className="text-xs text-gray-400 mt-0.5">Personal Dashboard</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              page === id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 leading-relaxed">USD ↔ ARS tracker<br />eToro investments</p>
      </div>
    </aside>
  )
}
