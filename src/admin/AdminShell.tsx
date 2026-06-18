import { BarChart3, BellRing, FileCheck2, Home, LogOut, Network, Settings2, Shield, Sparkles } from 'lucide-react'
import { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface AdminShellProps {
  title: string
  eyebrow: string
  description: string
  onLogout: () => void
  children: ReactNode
  actions?: ReactNode
}

const navItems = [
  { label: 'Command Center', path: '/admin', icon: Home },
  { label: 'Client Oversight', path: '/admin/clients', icon: Network },
  { label: 'Operations Lab', path: '/admin/operations', icon: BarChart3 },
  { label: 'Compliance Hub', path: '/admin/compliance', icon: FileCheck2 },
  { label: 'Admin Settings', path: '/admin/settings', icon: Settings2 },
]

export default function AdminShell({ title, eyebrow, description, onLogout, children, actions }: AdminShellProps) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-[var(--admin-bg)] text-white" style={{ fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' }}>
      <aside className="sticky top-0 flex h-screen w-[308px] flex-col justify-between bg-[linear-gradient(180deg,rgba(5,11,20,0.96),rgba(7,14,24,0.94))] px-6 py-6 shadow-[24px_0_80px_rgba(0,0,0,0.38)]">
        <div>
          <div className="admin-surface surface-lg rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.11),transparent_40%),linear-gradient(180deg,rgba(16,28,42,0.96),rgba(9,18,29,0.98))] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,rgba(16,28,42,0.95),rgba(8,17,24,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_rgba(0,0,0,0.3)]">
                <img src="/logo11.png" alt="AtlasFlow" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-200/58">Admin Authority</div>
                <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">AtlasFlow Control</div>
              </div>
            </div>
            <div className="admin-surface surface-sm mt-5 rounded-[22px] p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-200/72">
                <Shield size={14} />
                Full access
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-200/74">Dedicated admin workspace for cross-client monitoring, operational interventions, and compliance review.</div>
            </div>
          </div>

          <nav className="mt-8 space-y-2.5">
            {navItems.map((item) => {
              const active = location.pathname === item.path
              const Icon = item.icon

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`admin-focus-ring admin-interactive relative flex w-full items-center gap-3 overflow-hidden rounded-[22px] px-4 py-3 text-left ${active ? 'bg-[linear-gradient(180deg,rgba(22,78,99,0.34),rgba(8,47,73,0.2))] text-white shadow-[inset_3px_0_0_rgba(103,232,249,0.9),0_16px_34px_rgba(0,0,0,0.34)]' : 'bg-white/[0.025] text-slate-300 hover:bg-white/[0.05]'}`}
                >
                  <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all ${active ? 'bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.28)]' : 'bg-transparent'}`} />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-[16px] ${active ? 'bg-cyan-300/16 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'bg-[#0a1118] text-slate-400'}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Admin route</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="space-y-3">
          <div className="admin-surface surface-sm rounded-[24px] bg-[linear-gradient(180deg,rgba(120,53,15,0.22),rgba(19,18,18,0.72))] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-amber-100/74">
              <BellRing size={14} />
              Admin notice
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-200/72">Client-facing pages stay separate. This shell only links to admin-only dashboards and tooling.</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="admin-focus-ring admin-interactive flex w-full items-center justify-between rounded-[22px] bg-[linear-gradient(180deg,rgba(127,29,29,0.3),rgba(69,10,10,0.22))] px-4 py-3 text-sm font-medium text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.28)] hover:bg-[linear-gradient(180deg,rgba(153,27,27,0.32),rgba(69,10,10,0.26))]"
          >
            <span className="flex items-center gap-3">
              <LogOut size={16} />
              Sign out
            </span>
            <Sparkles size={16} className="text-rose-200/70" />
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_90%_10%,rgba(244,114,182,0.06),transparent_18%),linear-gradient(180deg,#050b14,#040913_58%,#03070f)]">
        <header className="px-8 py-7">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(9,18,29,0.42),rgba(9,18,29,0.18))] px-1 py-1">
            <div className="flex flex-col gap-4 rounded-[24px] bg-[linear-gradient(180deg,rgba(9,18,29,0.72),rgba(6,13,22,0.56))] px-7 py-7 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[12px] uppercase tracking-[0.26em] text-cyan-200/56">{eyebrow}</div>
                <div className="mt-2 text-[42px] font-semibold tracking-[-0.06em] text-white">{title}</div>
                <div className="mt-3 max-w-3xl text-sm leading-6 text-slate-200/68">{description}</div>
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </div>
        </header>
        <div className="px-8 pb-8">{children}</div>
      </main>
    </div>
  )
}
