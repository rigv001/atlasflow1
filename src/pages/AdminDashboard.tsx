import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BadgeAlert, CircleGauge, Radar, ShieldCheck, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import AdminShell from '../admin/AdminShell'
import { buildAdminEdges, buildClientNarrative, loadAdminDataSnapshot, type AdminClientInsight } from '../admin/adminData'
import NodeGraph from '../components/NodeGraph'
import SimulationPanel from '../components/SimulationPanel'
import { formatAppError } from '../utils/errors'

interface AdminDashboardProps {
  onLogout: () => void
}

const metricCards = [
  { key: 'clients', label: 'Client workspaces', icon: ShieldCheck, accent: 'from-cyan-300 to-sky-500' },
  { key: 'suppliers', label: 'Tracked suppliers', icon: Radar, accent: 'from-fuchsia-300 to-rose-500' },
  { key: 'totalEmissions', label: 'System emissions', icon: CircleGauge, accent: 'from-emerald-300 to-teal-500' },
  { key: 'highRiskCount', label: 'Critical suppliers', icon: BadgeAlert, accent: 'from-amber-300 to-orange-500' },
] as const

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const navigate = useNavigate()
  const [clients, setClients] = useState<AdminClientInsight[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [systemSummary, setSystemSummary] = useState({
    clients: 0,
    suppliers: 0,
    totalEmissions: 0,
    averageIntensity: 0,
    highRiskCount: 0,
    criticalShare: 0,
    coverageScore: 0,
    flaggedRegions: [] as string[],
  })

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await loadAdminDataSnapshot()
        setClients(snapshot.clients)
        setSystemSummary(snapshot.summary)
        setSelectedClientId(snapshot.clients[0]?.userId ?? null)
        setSelectedNodeId(snapshot.clients[0]?.nodes[0]?.id ?? null)
      } catch (error) {
        console.error('Failed to load admin command center', error)
        const detail = formatAppError(error, 'Unknown admin data error.')
        setErrorMessage(`Unable to load admin control data right now. ${detail}`)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const selectedClient = useMemo(
    () => clients.find((client) => client.userId === selectedClientId) ?? null,
    [clients, selectedClientId],
  )

  const selectedEdges = useMemo(
    () => buildAdminEdges(selectedClient?.nodes || []),
    [selectedClient],
  )

  return (
    <AdminShell
      onLogout={onLogout}
      eyebrow="Command Center"
      title="Admin Dashboard"
      description="Operate a fully separate control surface for the platform: scan client health, inspect supplier networks, and trigger cross-workspace follow-up without using the client dashboard."
      actions={
        <>
          <button type="button" onClick={() => navigate('/admin/clients')} className="admin-focus-ring admin-interactive rounded-[18px] bg-[linear-gradient(180deg,rgba(14,116,144,0.28),rgba(8,47,73,0.22))] px-4 py-2.5 text-sm font-medium text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_24px_rgba(0,0,0,0.26)] hover:bg-[linear-gradient(180deg,rgba(14,116,144,0.34),rgba(8,47,73,0.26))]">Open client oversight</button>
          <button type="button" onClick={() => navigate('/admin/compliance')} className="admin-focus-ring admin-interactive rounded-[18px] bg-[linear-gradient(180deg,rgba(226,232,240,0.96),rgba(203,213,225,0.9))] px-4 py-2.5 text-sm font-medium text-[#071018] shadow-[0_14px_28px_rgba(0,0,0,0.22)] hover:bg-[linear-gradient(180deg,rgba(241,245,249,0.98),rgba(226,232,240,0.92))]">View compliance hub</button>
        </>
      }
    >
      {errorMessage ? <div className="admin-surface surface-sm mb-6 rounded-[24px] bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(69,10,10,0.22))] px-5 py-4 text-sm text-rose-100">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon
          const value = systemSummary[card.key]
          return (
            <div key={card.key} className="admin-surface surface-md admin-interactive rounded-[24px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{card.label}</div>
                  <div className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white">{value}</div>
                </div>
                <div className={`relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br ${card.accent} shadow-[0_18px_34px_rgba(0,0,0,0.24)]`}>
                  <div className="absolute inset-1 rounded-[14px] bg-white/16" />
                  <Icon size={20} className="relative text-[#071018]" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="admin-surface surface-lg rounded-[30px] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-cyan-200/56">
                <Sparkles size={14} />
                System pulse
              </div>
              <div className="mt-3 text-[30px] font-semibold tracking-[-0.05em] text-white">Executive control board</div>
              <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/72">
                {buildClientNarrative(selectedClient)}
              </div>
            </div>
            <div className="rounded-full bg-[linear-gradient(180deg,rgba(16,185,129,0.2),rgba(6,95,70,0.14))] px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              Dark-only admin shell
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="admin-surface surface-sm rounded-[22px] p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Data coverage</div>
              <div className="mt-3 text-3xl font-semibold text-white">{systemSummary.coverageScore}%</div>
              <div className="mt-2 text-sm text-slate-300/66">Average admin-readiness score across all client workspaces.</div>
            </div>
            <div className="admin-surface surface-sm rounded-[22px] p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Critical share</div>
              <div className="mt-3 text-3xl font-semibold text-white">{systemSummary.criticalShare}%</div>
              <div className="mt-2 text-sm text-slate-300/66">Share of tracked suppliers operating above the risk threshold.</div>
            </div>
            <div className="admin-surface surface-sm rounded-[22px] p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Flagged regions</div>
              <div className="mt-3 flex flex-wrap gap-2">{systemSummary.flaggedRegions.map((region) => <span key={region} className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{region}</span>)}</div>
            </div>
          </div>

          <div className="admin-surface surface-sm mt-6 h-[420px] rounded-[28px] bg-[linear-gradient(180deg,rgba(3,8,13,0.96),rgba(6,14,22,0.98))] p-4">
            {selectedClient ? (
              <NodeGraph
                nodes={selectedClient.nodes}
                edges={selectedEdges}
                selectedNodeId={selectedNodeId}
                showLabels={true}
                showEdges={true}
                connectionOpacity={0.7}
                theme={{
                  canvasGlow: 'rgba(34, 211, 238, 0.18)',
                  panelTint: 'rgba(5, 14, 22, 0.76)',
                  grid: 'rgba(94, 234, 212, 0.18)',
                  accent: '#22d3ee',
                }}
                onNodesChange={() => {}}
                onEdgesChange={() => {}}
                onSelectNode={setSelectedNodeId}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                {isLoading ? 'Loading client network...' : 'No persisted client network data is available yet.'}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="admin-surface surface-lg rounded-[30px] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-white">Priority workspaces</div>
                <div className="mt-1 text-sm text-slate-300/66">Ranked by risk exposure, not by the client-facing dashboard layout.</div>
              </div>
              <button type="button" onClick={() => navigate('/admin/clients')} className="admin-focus-ring inline-flex items-center gap-2 text-sm text-cyan-100 transition hover:text-white">All clients <ArrowRight size={16} /></button>
            </div>
            <div className="mt-5 space-y-3">
              {clients.slice(0, 4).map((client) => (
                <button
                  key={client.userId}
                  type="button"
                  onClick={() => {
                    setSelectedClientId(client.userId)
                    setSelectedNodeId(client.nodes[0]?.id ?? null)
                  }}
                  className={`admin-focus-ring admin-interactive w-full rounded-[22px] p-4 text-left ${selectedClientId === client.userId ? 'bg-[linear-gradient(180deg,rgba(14,116,144,0.26),rgba(8,47,73,0.18))] shadow-[inset_3px_0_0_rgba(103,232,249,0.82),0_18px_34px_rgba(0,0,0,0.28)]' : 'bg-[linear-gradient(180deg,rgba(16,28,42,0.84),rgba(9,18,29,0.92))] shadow-[0_14px_34px_rgba(0,0,0,0.24)] hover:bg-[linear-gradient(180deg,rgba(19,32,47,0.92),rgba(11,20,31,0.96))]'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">{client.email}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{client.topCategory} hotspot</div>
                    </div>
                    <div className="rounded-full bg-[linear-gradient(180deg,rgba(245,158,11,0.2),rgba(120,53,15,0.22))] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{client.momentumLabel}</div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-slate-300/70">
                    <div><div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Coverage</div><div className="mt-1 text-white">{client.complianceScore}%</div></div>
                    <div><div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Critical</div><div className="mt-1 text-white">{client.highRiskCount}</div></div>
                    <div><div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Savings</div><div className="mt-1 text-white">${client.scenarioSavings.toLocaleString()}</div></div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="admin-surface surface-lg rounded-[30px] p-6">
            <div className="text-lg font-semibold text-white">Admin simulation view</div>
            <div className="mt-1 text-sm text-slate-300/66">Run a read-only what-if model against the selected client without entering their workspace.</div>
            <div className="mt-5">
              <SimulationPanel nodes={selectedClient?.nodes || []} onNodesChange={() => {}} />
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}
