import { useEffect, useMemo, useState } from 'react'
import { BrainCircuit, Gauge, MoveRight, RefreshCw } from 'lucide-react'

import AdminShell from '../admin/AdminShell'
import { buildClientNarrative, loadAdminDataSnapshot, type AdminClientInsight } from '../admin/adminData'
import SimulationPanel from '../components/SimulationPanel'

interface PageProps {
  onLogout: () => void
}

const queueItems = [
  'Escalate manufacturing hotspots over 100 kgCO2e',
  'Review incomplete logistics records before Friday close',
  'Push low-intensity scenario pack to client success team',
]

export default function AdminOperationsPage({ onLogout }: PageProps) {
  const [clients, setClients] = useState<AdminClientInsight[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadClients = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
      setStatusMessage('')
    }

    try {
      const snapshot = await loadAdminDataSnapshot()
      const prioritizedClients = [...snapshot.clients].sort((left, right) => right.highRiskCount - left.highRiskCount)
      setClients(prioritizedClients)
      setSelectedClientId((current) => current && prioritizedClients.some((client) => client.userId === current) ? current : prioritizedClients[0]?.userId ?? null)
      setErrorMessage('')
      if (options?.silent) {
        setStatusMessage(`Scenario queue refreshed for ${prioritizedClients.length} client${prioritizedClients.length === 1 ? '' : 's'}.`)
      }
    } catch (error) {
      console.error('Failed to load admin operations page', error)
      setErrorMessage('Unable to load the operations lab.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadClients()
  }, [])

  const selectedClient = useMemo(
    () => clients.find((client) => client.userId === selectedClientId) ?? clients[0] ?? null,
    [clients, selectedClientId],
  )

  return (
    <AdminShell
      onLogout={onLogout}
      eyebrow="Operations Lab"
      title="Admin Operations Lab"
      description="Use a dedicated admin planning surface to pressure-test network scenarios, triage high-risk accounts, and prepare interventions before client-facing follow-up."
      actions={
        <button type="button" onClick={() => void loadClients({ silent: true })} className="admin-focus-ring admin-interactive inline-flex items-center gap-2 rounded-[18px] bg-[linear-gradient(180deg,rgba(14,116,144,0.28),rgba(8,47,73,0.22))] px-4 py-2.5 text-sm text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_24px_rgba(0,0,0,0.26)] hover:bg-[linear-gradient(180deg,rgba(14,116,144,0.34),rgba(8,47,73,0.26))]"><RefreshCw size={16} /> Refresh scenarios</button>
      }
    >
      {statusMessage ? <div className="admin-surface surface-sm mb-6 rounded-[24px] bg-[linear-gradient(180deg,rgba(16,185,129,0.2),rgba(6,95,70,0.12))] px-5 py-4 text-sm text-emerald-100">{statusMessage}</div> : null}
      {errorMessage ? <div className="admin-surface surface-sm mb-6 rounded-[24px] bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(69,10,10,0.22))] px-5 py-4 text-sm text-rose-100">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <section className="space-y-6">
          <div className="admin-surface surface-lg rounded-[30px] p-6">
            <div className="flex items-center gap-3 text-white"><BrainCircuit size={18} className="text-cyan-100" /><div className="text-lg font-semibold">Intervention queue</div></div>
            <div className="mt-2 text-sm leading-6 text-slate-300/70">Admin actions are framed as cross-client operations, not individual supplier edits.</div>
            <div className="mt-5 space-y-3">
              {queueItems.map((item) => (
                <div key={item} className="admin-surface surface-sm rounded-[22px] px-4 py-4 text-sm text-slate-200/80">{item}</div>
              ))}
            </div>
          </div>

          <div className="admin-surface surface-lg rounded-[30px] p-6">
            <div className="text-lg font-semibold text-white">Priority client selection</div>
            <div className="mt-4 space-y-3">
              {isLoading ? <div className="admin-surface surface-sm rounded-[22px] px-4 py-6 text-sm text-slate-400">Loading priority clients...</div> : null}
              {!isLoading && clients.length === 0 ? <div className="admin-surface surface-sm rounded-[22px] px-4 py-6 text-sm text-slate-400">No client workspaces are available for intervention planning.</div> : null}
              {clients.map((client) => (
                <button
                  key={client.userId}
                  type="button"
                  onClick={() => setSelectedClientId(client.userId)}
                  className={`admin-focus-ring admin-interactive w-full rounded-[22px] p-4 text-left ${selectedClient?.userId === client.userId ? 'bg-[linear-gradient(180deg,rgba(14,116,144,0.26),rgba(8,47,73,0.18))] shadow-[inset_3px_0_0_rgba(103,232,249,0.82),0_18px_34px_rgba(0,0,0,0.28)]' : 'bg-[linear-gradient(180deg,rgba(16,28,42,0.84),rgba(9,18,29,0.92))] shadow-[0_14px_34px_rgba(0,0,0,0.24)] hover:bg-[linear-gradient(180deg,rgba(19,32,47,0.92),rgba(11,20,31,0.96))]'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">{client.email}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{client.momentumLabel}</div>
                    </div>
                    <div className="text-right text-sm text-slate-300/70">{client.highRiskCount} critical</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="admin-surface surface-md rounded-[24px] p-5"><div className="flex items-center gap-3 text-white"><Gauge size={18} className="text-emerald-100" /><span>Coverage</span></div><div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{selectedClient?.complianceScore || 0}%</div></div>
            <div className="admin-surface surface-md rounded-[24px] p-5"><div className="flex items-center gap-3 text-white"><MoveRight size={18} className="text-amber-100" /><span>Projected savings</span></div><div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">${(selectedClient?.scenarioSavings || 0).toLocaleString()}</div></div>
            <div className="admin-surface surface-md rounded-[24px] p-5"><div className="flex items-center gap-3 text-white"><BrainCircuit size={18} className="text-cyan-100" /><span>Admin briefing</span></div><div className="mt-3 text-sm leading-6 text-slate-300/70">{buildClientNarrative(selectedClient)}</div></div>
          </div>

          <div className="admin-surface surface-lg rounded-[30px] p-6">
            <div className="text-lg font-semibold text-white">Scenario sandbox</div>
            <div className="mt-2 text-sm leading-6 text-slate-300/70">This remains admin-side and read-only. Use it to frame next-step recommendations for the selected client.</div>
            <div className="mt-5">
              <SimulationPanel nodes={selectedClient?.nodes || []} onNodesChange={() => { }} />
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}
