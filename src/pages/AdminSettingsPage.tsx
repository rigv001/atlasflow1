import { useState } from 'react'
import { BellRing, LockKeyhole, ShieldCheck, SlidersHorizontal } from 'lucide-react'

import AdminShell from '../admin/AdminShell'

interface PageProps {
  onLogout: () => void
}

export default function AdminSettingsPage({ onLogout }: PageProps) {
  const [settings, setSettings] = useState({
    alertDigest: true,
    weeklyComplianceReview: true,
    strictThresholds: false,
    showClientEmails: true,
  })

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <AdminShell
      onLogout={onLogout}
      eyebrow="Admin Settings"
      title="Admin Control Settings"
      description="Separate admin preferences for governance, alerting, and visibility. This page stays isolated from the client-facing settings workspace and keeps the full admin experience dark themed."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="admin-surface surface-lg rounded-[30px] p-6">
          <div className="flex items-center gap-3 text-white"><SlidersHorizontal size={18} className="text-cyan-100" /><div className="text-lg font-semibold">Governance controls</div></div>
          <div className="mt-5 space-y-4">
            {[
              { key: 'alertDigest', title: 'Daily alert digest', desc: 'Bundle high-risk events into one admin summary.' },
              { key: 'weeklyComplianceReview', title: 'Weekly compliance review', desc: 'Pin the watchlist for governance review every week.' },
              { key: 'strictThresholds', title: 'Strict risk thresholds', desc: 'Apply tighter hotspot labeling across admin dashboards.' },
              { key: 'showClientEmails', title: 'Show client emails', desc: 'Display workspace emails in admin registry cards.' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleSetting(item.key as keyof typeof settings)}
                className="admin-focus-ring admin-interactive flex w-full items-center justify-between rounded-[22px] bg-[linear-gradient(180deg,rgba(16,28,42,0.84),rgba(9,18,29,0.92))] px-4 py-4 text-left shadow-[0_14px_34px_rgba(0,0,0,0.24)] hover:bg-[linear-gradient(180deg,rgba(19,32,47,0.92),rgba(11,20,31,0.96))]"
              >
                <div>
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-300/66">{item.desc}</div>
                </div>
                <div className={`flex h-7 w-12 items-center rounded-full px-1 transition ${settings[item.key as keyof typeof settings] ? 'bg-cyan-300/70 justify-end' : 'bg-slate-700 justify-start'}`}>
                  <span className="h-5 w-5 rounded-full bg-[#071018]" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="admin-surface surface-lg rounded-[30px] p-6">
            <div className="flex items-center gap-3 text-white"><ShieldCheck size={18} className="text-emerald-100" /><div className="text-lg font-semibold">Access policy</div></div>
            <div className="admin-surface surface-sm mt-4 rounded-[24px] bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(6,95,70,0.12))] p-5 text-sm leading-6 text-emerald-50/84">Admin access is reserved for the hardcoded AtlasFlow owner account. This control page is intentionally isolated from the client settings page.</div>
          </div>

          <div className="admin-surface surface-lg rounded-[30px] p-6">
            <div className="flex items-center gap-3 text-white"><BellRing size={18} className="text-amber-100" /><div className="text-lg font-semibold">Alert routing</div></div>
            <div className="mt-4 text-sm leading-6 text-slate-300/70">Use this admin-only page to model how alerts appear across the control center. These toggles are local UI settings for now and do not alter backend rules.</div>
          </div>

          <div className="admin-surface surface-lg rounded-[30px] p-6">
            <div className="flex items-center gap-3 text-white"><LockKeyhole size={18} className="text-fuchsia-100" /><div className="text-lg font-semibold">Isolation note</div></div>
            <div className="mt-4 text-sm leading-6 text-slate-300/70">Client and admin experiences now use different layouts, navigation, and feature groupings. The admin dashboard is not a restyled copy of the user dashboard.</div>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}
