import { useEffect, useState } from 'react'
import { BadgeCheck, Bell, Building2, Mail, ShieldCheck, Sparkles } from 'lucide-react'

import Sidebar from '../components/Sidebar'
import { ProfileState } from '../types'
import { PROFILE_AVATARS, loadCurrentUserProfile, saveCurrentUserProfile } from '../utils/profile'

interface PageProps {
  onLogout: () => void
  settingsPath: string
}

const createNotificationPreferences = () => ({
  weeklyDigest: true,
  supplierAlerts: true,
  scenarioReminders: false,
})

export default function SettingsPage({ onLogout, settingsPath }: PageProps) {
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [profileDraft, setProfileDraft] = useState<ProfileState | null>(null)
  const [accountEmail, setAccountEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notifications, setNotifications] = useState(createNotificationPreferences)

  useEffect(() => {
    const load = async () => {
      try {
        const { user, profile: loadedProfile } = await loadCurrentUserProfile()
        if (!user) {
          setErrorMessage('Unable to load your account. Please sign in again.')
          return
        }

        setProfile(loadedProfile)
        setProfileDraft(loadedProfile)
        setAccountEmail(user.email || '')
      } catch (error) {
        console.error('Failed to load profile settings', error)
        setErrorMessage('Unable to load your settings right now.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const handleProfileFieldChange = (field: keyof ProfileState, value: string) => {
    setProfileDraft((current) => (current ? { ...current, [field]: value } : current))
    setStatusMessage('')
    setErrorMessage('')
  }

  const handleNotificationToggle = (field: keyof typeof notifications) => {
    setNotifications((current) => ({ ...current, [field]: !current[field] }))
    setStatusMessage('Preferences update locally in this browser session.')
  }

  const handleReset = () => {
    if (!profile) return
    setProfileDraft(profile)
    setStatusMessage('Changes reset to your saved profile.')
    setErrorMessage('')
  }

  const handleSave = async () => {
    if (!profileDraft) return

    setIsSaving(true)
    setStatusMessage('')
    setErrorMessage('')

    try {
      const { error, profile: savedProfile } = await saveCurrentUserProfile(profileDraft)
      if (error) {
        console.error('Failed to save profile settings', error)
        const details = error instanceof Error ? error.message : 'Please try again.'
        setErrorMessage(`Settings could not be saved. ${details}`)
        return
      }

      setProfile(savedProfile)
      setProfileDraft(savedProfile)
      setStatusMessage('Settings saved successfully.')
    } catch (error) {
      console.error('Unexpected error saving profile settings', error)
      const details = error instanceof Error ? error.message : 'Please try again.'
      setErrorMessage(`Settings could not be saved. ${details}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#061014] text-white" style={{ fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' }}>
      <Sidebar onLogout={onLogout} settingsPath={settingsPath} />

      <div className="flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_24%),linear-gradient(180deg,#091317,#05080b)]">
        <header className="border-b border-emerald-500/18 px-8 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[12px] uppercase tracking-[0.24em] text-emerald-200/60">Account Control</div>
              <div className="mt-2 text-[34px] font-semibold tracking-[-0.05em]">User Settings</div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-200/68">
                Manage the identity, reporting context, and notification defaults used across your AtlasFlow workspace.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={!profileDraft || isLoading || isSaving}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5 disabled:opacity-50"
              >
                Reset changes
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!profileDraft || isLoading || isSaving}
                className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-medium text-[#052114] transition hover:bg-emerald-200 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-8 py-8">
          {errorMessage ? <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div> : null}
          {statusMessage ? <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{statusMessage}</div> : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
            <section className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.24em] text-emerald-100/50">
                      <Sparkles size={14} />
                      Profile identity
                    </div>
                    <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Workspace profile</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300/70">
                      These fields appear throughout the user dashboard and reports for your client workspace.
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                    Client account
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-center">
                      <div className="flex h-28 w-28 items-center justify-center rounded-[30px] border border-emerald-300/25 bg-[radial-gradient(circle_at_30%_20%,rgba(110,231,183,0.2),rgba(3,12,14,0.94)_72%)] text-6xl shadow-[0_0_40px_rgba(52,211,153,0.12)]">
                        {profileDraft?.avatar || '🌿'}
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {PROFILE_AVATARS.map((avatar) => (
                        <button
                          key={avatar}
                          type="button"
                          onClick={() => handleProfileFieldChange('avatar', avatar)}
                          className={`flex h-12 items-center justify-center rounded-2xl border text-2xl transition ${profileDraft?.avatar === avatar ? 'border-emerald-300 bg-emerald-300/12' : 'border-white/10 bg-white/[0.03] hover:border-emerald-300/40'}`}
                        >
                          {avatar}
                        </button>
                      ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-white/8 bg-[#091014] p-4">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Live preview</div>
                      <div className="mt-2 text-lg font-semibold text-white">{profileDraft?.name || 'Customer'}</div>
                      <div className="mt-1 text-sm text-slate-300/72">{profileDraft?.title || 'Sustainability Lead'} • {profileDraft?.team || 'Operations'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block text-sm text-slate-200/84">
                      Display name
                      <input value={profileDraft?.name || ''} onChange={(event) => handleProfileFieldChange('name', event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none focus:border-emerald-300" />
                    </label>
                    <label className="block text-sm text-slate-200/84">
                      Primary site
                      <input value={profileDraft?.site || ''} onChange={(event) => handleProfileFieldChange('site', event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none focus:border-emerald-300" />
                    </label>
                    <label className="block text-sm text-slate-200/84">
                      Job title
                      <input value={profileDraft?.title || ''} onChange={(event) => handleProfileFieldChange('title', event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none focus:border-emerald-300" />
                    </label>
                    <label className="block text-sm text-slate-200/84">
                      Team
                      <input value={profileDraft?.team || ''} onChange={(event) => handleProfileFieldChange('team', event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none focus:border-emerald-300" />
                    </label>
                    <label className="block text-sm text-slate-200/84 md:col-span-2">
                      Focus area
                      <input value={profileDraft?.focusArea || ''} onChange={(event) => handleProfileFieldChange('focusArea', event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none focus:border-emerald-300" />
                    </label>
                    <label className="block text-sm text-slate-200/84 md:col-span-2">
                      Timezone
                      <input value={profileDraft?.timezone || ''} onChange={(event) => handleProfileFieldChange('timezone', event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none focus:border-emerald-300" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                  <div className="flex items-center gap-3 text-white">
                    <div className="rounded-2xl border border-sky-400/25 bg-sky-400/10 p-3 text-sky-100">
                      <Mail size={18} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Account contact</div>
                      <div className="text-sm text-slate-300/70">Primary identity for sign-in and export attribution.</div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-4 text-sm text-slate-200/84">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Email</div>
                      <div className="mt-2 text-base text-white">{accountEmail || 'Loading...'}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Customer number</div>
                      <div className="mt-2 font-mono text-base text-white">{profileDraft?.customerNo || 'Pending'}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-slate-300/74">
                      Account email remains managed by Supabase auth. This page controls the operational metadata shown around the product.
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                  <div className="flex items-center gap-3 text-white">
                    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-amber-100">
                      <Bell size={18} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Notifications</div>
                      <div className="text-sm text-slate-300/70">Session-level communication defaults for this browser.</div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ['weeklyDigest', 'Weekly executive digest', 'Receive summary snapshots of emissions movement.'],
                      ['supplierAlerts', 'Supplier risk alerts', 'Flag suppliers that cross the high-intensity threshold.'],
                      ['scenarioReminders', 'Scenario reminders', 'Prompt the team to revisit unsaved what-if scenarios.'],
                    ].map(([key, title, description]) => {
                      const field = key as keyof typeof notifications
                      return (
                        <button
                          key={field}
                          type="button"
                          onClick={() => handleNotificationToggle(field)}
                          className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-emerald-300/30"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{title}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-300/64">{description}</div>
                          </div>
                          <div className={`flex h-7 w-12 items-center rounded-full border px-1 transition ${notifications[field] ? 'border-emerald-300/40 bg-emerald-300/18 justify-end' : 'border-white/10 bg-white/5 justify-start'}`}>
                            <span className={`h-5 w-5 rounded-full ${notifications[field] ? 'bg-emerald-200' : 'bg-slate-400'}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(6,13,15,0.84))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                <div className="flex items-center gap-3 text-white">
                  <div className="rounded-2xl border border-white/12 bg-white/10 p-3 text-white">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Profile integrity</div>
                    <div className="text-sm text-emerald-50/72">Keep identity details aligned across dashboards and reports.</div>
                  </div>
                </div>
                <div className="mt-5 space-y-4 text-sm text-emerald-50/82">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                    <span>Metadata storage</span>
                    <span className="font-medium text-white">Supabase auth profile</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                    <span>Dashboard sync</span>
                    <span className="font-medium text-white">Immediate after save</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                    <span>Workspace scope</span>
                    <span className="font-medium text-white">Per signed-in user</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <div className="flex items-center gap-3 text-white">
                  <div className="rounded-2xl border border-violet-400/25 bg-violet-400/10 p-3 text-violet-100">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Workspace effects</div>
                    <div className="text-sm text-slate-300/70">Where your saved identity shows up.</div>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm text-slate-300/78">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">Dashboard customer card and avatar.</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">Report pack headers and executive context.</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">Future account-level personalization surfaces.</div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <div className="flex items-center gap-3 text-white">
                  <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-cyan-100">
                    <BadgeCheck size={18} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Save checklist</div>
                    <div className="text-sm text-slate-300/70">A quick sanity check before you commit profile changes.</div>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm text-slate-300/78">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">Use a recognizable customer name for stakeholder-facing exports.</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">Keep the site and timezone aligned with the operating team reviewing alerts.</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">Use the same focus area phrasing you present in governance reviews.</div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
