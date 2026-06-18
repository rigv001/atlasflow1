import { useEffect, useMemo, useState } from 'react'
import { Activity, Layers3, ScanSearch, ShieldAlert } from 'lucide-react'

import AdminShell from '../admin/AdminShell'
import { buildAdminEdges, loadAdminDataSnapshot, type AdminClientInsight } from '../admin/adminData'
import NodeGraph from '../components/NodeGraph'
import { formatAppError } from '../utils/errors'

interface PageProps {
  onLogout: () => void
}

export default function AdminClientsPage({ onLogout }: PageProps) {
  const [clients, setClients] = useState<AdminClientInsight[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await loadAdminDataSnapshot()
        setClients(snapshot.clients)
        setSelectedClientId(snapshot.clients[0]?.userId ?? null)
        setSelectedNodeId(snapshot.clients[0]?.nodes[0]?.id ?? null)
      } catch (error) {
        console.error('Failed to load client oversight page', error)
        setErrorMessage(`Unable to load client oversight data. ${formatAppError(error, 'Unknown client oversight error.')}`)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const filteredClients = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase()
    if (!normalized) return clients

    return clients.filter((client) => {
      return client.email.toLowerCase().includes(normalized) || client.topCategory.toLowerCase().includes(normalized)
    })
  }, [clients, searchValue])

  const selectedClient = filteredClients.find((client) => client.userId === selectedClientId) || filteredClients[0] || null
  const selectedEdges = buildAdminEdges(selectedClient?.nodes || [])

  return (
    <AdminShell
      onLogout={onLogout}
      eyebrow="Client Oversight"
      title="Admin Client Registry"
      description="Review every client workspace from a single dark operations surface. Filter accounts, inspect network structure, and compare readiness without stepping into the client UX."
      actions={
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search email or hotspot"
          className="admin-focus-ring h-11 rounded-[18px] bg-[linear-gradient(180deg,rgba(13,23,36,0.92),rgba(9,18,29,0.98))] px-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(0,0,0,0.24)] placeholder:text-slate-500"
        />
      }
    >
      {errorMessage ? <div className="admin-surface surface-sm mb-6 rounded-[24px] bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(69,10,10,0.22))] px-5 py-4 text-sm text-rose-100">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <section className="admin-surface surface-lg rounded-[30px] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-white">Client list</div>
              <div className="mt-1 text-sm text-slate-300/66">{filteredClients.length} result{filteredClients.length === 1 ? '' : 's'} in the registry.</div>
            </div>
            <div className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">Admin-only</div>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading ? <div className="admin-surface surface-sm rounded-[22px] px-4 py-6 text-sm text-slate-400">Loading client registry...</div> : null}
            {!isLoading && filteredClients.length === 0 ? <div className="admin-surface surface-sm rounded-[22px] px-4 py-6 text-sm text-slate-400">{clients.length === 0 ? 'No persisted client workspaces are available yet.' : 'No matching clients found.'}</div> : null}
            {filteredClients.map((client) => (
              <button
                key={client.userId}
                type="button"
                onClick={() => {
                  setSelectedClientId(client.userId)
                  setSelectedNodeId(client.nodes[0]?.id ?? null)
                }}
                className={`admin-focus-ring admin-interactive w-full rounded-[24px] p-4 text-left ${selectedClient?.userId === client.userId ? 'bg-[linear-gradient(180deg,rgba(14,116,144,0.26),rgba(8,47,73,0.18))] shadow-[inset_3px_0_0_rgba(103,232,249,0.82),0_18px_34px_rgba(0,0,0,0.28)]' : 'bg-[linear-gradient(180deg,rgba(16,28,42,0.84),rgba(9,18,29,0.92))] shadow-[0_14px_34px_rgba(0,0,0,0.24)] hover:bg-[linear-gradient(180deg,rgba(19,32,47,0.92),rgba(11,20,31,0.96))]'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{client.email}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">{client.topCategory} hotspot</div>
                  </div>
                  <div className="rounded-full bg-[linear-gradient(180deg,rgba(245,158,11,0.2),rgba(120,53,15,0.22))] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{client.momentumLabel}</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300/70">
                  <div className="admin-surface surface-sm rounded-[18px] px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Coverage</div>
                    <div className="mt-1 text-white">{client.complianceScore}%</div>
                  </div>
                  <div className="admin-surface surface-sm rounded-[18px] px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Critical share</div>
                    <div className="mt-1 text-white">{client.riskShare}%</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="admin-surface surface-md rounded-[24px] p-5"><div className="flex items-center gap-3 text-white"><Activity size={18} className="text-cyan-100" /><span>Avg intensity</span></div><div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{selectedClient?.averageIntensity || 0}</div></div>
            <div className="admin-surface surface-md rounded-[24px] p-5"><div className="flex items-center gap-3 text-white"><ShieldAlert size={18} className="text-amber-100" /><span>Critical suppliers</span></div><div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{selectedClient?.highRiskCount || 0}</div></div>
            <div className="admin-surface surface-md rounded-[24px] p-5"><div className="flex items-center gap-3 text-white"><Layers3 size={18} className="text-fuchsia-100" /><span>Total nodes</span></div><div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{selectedClient?.nodes.length || 0}</div></div>
            <div className="admin-surface surface-md rounded-[24px] p-5"><div className="flex items-center gap-3 text-white"><ScanSearch size={18} className="text-emerald-100" /><span>Scenario savings</span></div><div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">${(selectedClient?.scenarioSavings || 0).toLocaleString()}</div></div>
          </div>

          <div className="admin-surface surface-lg rounded-[30px] p-5">
            <div className="mb-4 text-lg font-semibold text-white">Selected network</div>
            <div className="admin-surface surface-sm h-[520px] rounded-[24px] bg-[linear-gradient(180deg,rgba(3,8,13,0.96),rgba(6,14,22,0.98))] p-4">
              {selectedClient ? (
                <NodeGraph
                  nodes={selectedClient.nodes}
                  edges={selectedEdges}
                  selectedNodeId={selectedNodeId}
                  showLabels={true}
                  showEdges={true}
                  connectionOpacity={0.7}
                  theme={{
                    canvasGlow: 'rgba(56, 189, 248, 0.18)',
                    panelTint: 'rgba(5, 14, 22, 0.76)',
                    grid: 'rgba(125, 211, 252, 0.2)',
                    accent: '#38bdf8',
                  }}
                  onNodesChange={() => { }}
                  onEdgesChange={() => { }}
                  onSelectNode={setSelectedNodeId}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">Select a client to inspect their network.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}
