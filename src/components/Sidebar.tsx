// AtlasFlow - Premium Sidebar with React Router navigation

import { LogOut, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

interface SidebarProps {
  onLogout: () => void
  settingsPath?: string
}

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Network Map', path: '/network-map' },
  { label: 'Simulations', path: '/simulations' },
  { label: 'Reports', path: '/reports' },
]

const reportLinks = ['Carbon Summary', 'Supplier Performance', 'Compliance']

export default function Sidebar({ onLogout, settingsPath = '/' }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside className="w-[260px] bg-[#07090d] border-r border-[#1c1f26] flex flex-col justify-between p-6 flex-shrink-0 h-screen">
      <div>
        {/* Logo row */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#0b1118] p-1">
            <img
              src="/logo11.png"
              alt="AtlasFlow logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-base tracking-tight">AtlasFlow</div>
            <div className="text-[10px] text-[#6b7280]">Enterprise • Australia</div>
          </div>
        </div>

        {/* Primary nav — real navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center w-full gap-3 px-4 h-11 rounded-2xl text-sm transition-all text-left ${active
                  ? 'bg-[rgba(100,224,221,0.12)] text-white border-l-4 border-[#64e0dd]'
                  : 'text-[#b8bec8] hover:bg-[#11151b]'
                  }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-8 px-4">
          <div className="text-[10px] font-medium text-[#6b7280] mb-3 tracking-wider">REPORTS</div>
          <div className="space-y-1 text-sm text-[#9ca3af]">
            {reportLinks.map((link) => (
              <div
                key={link}
                onClick={() => navigate('/reports')}
                className="py-1.5 hover:text-white cursor-pointer"
              >
                {link}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-2 space-y-1 text-sm">
        <div
          onClick={() => navigate(settingsPath)}
          className="flex items-center gap-3 px-4 py-3 text-[#b8bec8] hover:bg-[#11151b] hover:text-white rounded-2xl cursor-pointer"
        >
          <Settings size={16} className="shrink-0 text-[#8ea2b8]" />
          <span>Settings</span>
        </div>
        <div
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-[#ef4444] hover:bg-[#2a1114] hover:text-[#f87171] rounded-2xl cursor-pointer"
        >
          <LogOut size={16} className="shrink-0" />
          <span>Logout</span>
        </div>
      </div>
    </aside>
  )
}
