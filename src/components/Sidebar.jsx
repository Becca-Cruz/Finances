import { LayoutDashboard, CreditCard, ArrowLeftRight, TrendingUp, Settings, Wallet, BarChart2, ShoppingBag, LayoutGrid } from 'lucide-react'

const PERSONAL = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'stats',     label: 'Stats',     Icon: BarChart2 },
  { id: 'income',    label: 'Income',    Icon: Wallet },
  { id: 'expenses',  label: 'Expenses',  Icon: CreditCard },
  { id: 'contadora', label: 'Contadora', Icon: ArrowLeftRight },
  { id: 'etoro',     label: 'eToro',     Icon: TrendingUp },
]

const BUSINESS = [
  { id: 'rw-dashboard', label: 'Resumen',  Icon: LayoutGrid },
  { id: 'rw-gastos',    label: 'Gastos',   Icon: ShoppingBag },
]

export default function Sidebar({ page, onNavigate }) {
  const NavItem = ({ id, label, Icon, active }) => (
    <button
      onClick={() => onNavigate(id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  )

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <h1 className="text-base font-bold text-gray-900 tracking-tight">Finances</h1>
        <p className="text-xs text-gray-400 mt-0.5">Personal Dashboard</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {PERSONAL.map(item => <NavItem key={item.id} {...item} active={page === item.id} />)}

        {/* Rebe's Way section */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-bold text-pink-400 uppercase tracking-widest">Rebe's Way</p>
        </div>
        {BUSINESS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              page === item.id ? 'bg-pink-50 text-pink-700' : 'text-gray-600 hover:bg-pink-50/60 hover:text-pink-700'
            }`}
          >
            <item.Icon size={17} />
            {item.label}
          </button>
        ))}

        <div className="pt-3">
          <NavItem id="settings" label="Settings" Icon={Settings} active={page === 'settings'} />
        </div>
      </nav>
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 leading-relaxed">USD ↔ ARS tracker<br />eToro · Rebe's Way</p>
      </div>
    </aside>
  )
}
