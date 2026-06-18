import { useEffect, useMemo, useState } from 'react'
import { BookmarkPlus, GitCompareArrows, LineChart, Save, Sparkles } from 'lucide-react'

import Sidebar from '../components/Sidebar'
import SimulationPanel from '../components/SimulationPanel'
import { useBufferedNodePersistence } from '../hooks/useBufferedNodePersistence'
import { FlowNode, SavedScenario } from '../types'
import { loadCurrentUserNodes, saveNodesForUser } from '../services/supplyNodes'
import { calculateScenarioCostImpact, getNetworkInsightSnapshot } from '../utils/networkAnalytics'

interface PageProps {
  onLogout: () => void
  settingsPath: string
}

const SCENARIO_STORAGE_KEY = 'atlasflow-saved-scenarios'

const cloneNodes = (nodes: FlowNode[]) => nodes.map((node) => ({
  ...node,
  position: { ...node.position },
  data: { ...node.data },
}))

const createScenarioName = (count: number) => `Scenario ${count + 1}`

export default function SimulationsPage({ onLogout, settingsPath }: PageProps) {
  const [seedNodes, setSeedNodes] = useState<FlowNode[]>([])
  const [persistedNodes, setPersistedNodes] = useState<FlowNode[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([])
  const [comparisonScenarioId, setComparisonScenarioId] = useState<string>('live')
  const [scenarioNotes, setScenarioNotes] = useState('')

  const {
    nodes,
    setImmediateNodes,
    updateNode,
    flushNow,
    isPersisting,
    hasPendingChanges,
  } = useBufferedNodePersistence({
    initialNodes: seedNodes,
    debounceMs: 320,
    onPersist: async (nextNodes) => {
      if (!userId) return
      await saveNodesForUser(userId, nextNodes)
      setPersistedNodes(nextNodes)
    },
    onPersistSuccess: () => {
      setStatusMessage('Scenario saved.')
    },
    onPersistError: (message?: string) => {
      console.warn('[Persistence] Save warning (non-blocking):', message)
    },
  })

  useEffect(() => {
    const load = async () => {
      try {
        const { user, nodes: loadedNodes } = await loadCurrentUserNodes()
        setUserId(user?.id ?? null)
        setSeedNodes(loadedNodes)
        setPersistedNodes(loadedNodes)
      } catch (error) {
        console.error('Failed to load simulation nodes', error)
        setErrorMessage('Unable to load simulation data right now.')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SCENARIO_STORAGE_KEY)
    if (!storedValue) return

    try {
      const parsed = JSON.parse(storedValue) as SavedScenario[]
      setSavedScenarios(parsed)
    } catch {
      setSavedScenarios([])
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(savedScenarios))
  }, [savedScenarios])

  useEffect(() => {
    return () => {
      void flushNow()
    }
  }, [flushNow])

  const persistNodes = async (nextNodes: FlowNode[]) => {
    setErrorMessage('')
    setStatusMessage('Changes queued. Saving in background...')
    setImmediateNodes(nextNodes)
  }

  const handleSliderChange = (nodeId: string, nextValue: number) => {
    setErrorMessage('')
    setStatusMessage('Adjusting scenario...')
    updateNode(nodeId, (node) => ({
      ...node,
      data: {
        ...node.data,
        carbonIntensity: Math.min(500, Math.max(0, nextValue)),
      },
    }))
  }

  const handleSaveScenario = () => {
    const nextScenario: SavedScenario = {
      id: `scenario-${Date.now()}`,
      name: createScenarioName(savedScenarios.length),
      createdAt: new Date().toLocaleString(),
      notes: scenarioNotes.trim() || 'Saved from the live simulation workspace.',
      nodes: cloneNodes(nodes),
    }

    setSavedScenarios((current) => [nextScenario, ...current])
    setComparisonScenarioId(nextScenario.id)
    setScenarioNotes('')
    setStatusMessage(`Saved ${nextScenario.name} for side-by-side comparison.`)
  }

  const comparisonScenario = comparisonScenarioId === 'live'
    ? null
    : savedScenarios.find((scenario) => scenario.id === comparisonScenarioId) ?? null

  const comparisonNodes = comparisonScenario?.nodes ?? persistedNodes
  const costImpact = useMemo(() => calculateScenarioCostImpact(comparisonNodes, nodes), [comparisonNodes, nodes])
  const liveInsights = useMemo(() => getNetworkInsightSnapshot(nodes), [nodes])
  const comparisonInsights = useMemo(() => getNetworkInsightSnapshot(comparisonNodes), [comparisonNodes])

  const supplierDiffs = useMemo(() => {
    const baselineMap = new Map(comparisonNodes.map((node) => [node.id, node]))
    return nodes
      .map((node) => {
        const baselineNode = baselineMap.get(node.id)
        const baselineIntensity = Number(baselineNode?.data.carbonIntensity) || 0
        const currentIntensity = Number(node.data.carbonIntensity) || 0
        return {
          nodeId: node.id,
          label: node.data.label,
          category: node.data.category || 'General',
          baselineIntensity,
          currentIntensity,
          delta: currentIntensity - baselineIntensity,
        }
      })
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
  }, [comparisonNodes, nodes])

  return (
    <div className="flex h-screen overflow-hidden bg-[#071012] text-white" style={{ fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' }}>
      <Sidebar onLogout={onLogout} settingsPath={settingsPath} />
      <div className="flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(43,95,79,0.24),transparent_28%),linear-gradient(180deg,#081113,#05080a)]">
        <header className="border-b border-[#163130] px-8 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[12px] uppercase tracking-[0.24em] text-[#7ea79b]">Scenario Laboratory</div>
              <div className="mt-2 text-[32px] font-semibold tracking-[-0.05em]">Simulation Studio</div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-[#8ea2a1]">
                Save named simulation states, compare them against your live network, and quantify emissions and cost impact before you commit a change.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-[22px] border border-[#173432] bg-[#0a1517] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#64827f]">Live emissions</div>
                <div className="mt-2 text-2xl font-semibold">{costImpact.simulatedMetrics.totalEmissions}</div>
              </div>
              <div className="rounded-[22px] border border-[#173432] bg-[#0a1517] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#64827f]">Baseline emissions</div>
                <div className="mt-2 text-2xl font-semibold">{costImpact.baselineMetrics.totalEmissions}</div>
              </div>
              <div className="rounded-[22px] border border-[#173432] bg-[#0a1517] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#64827f]">Delta</div>
                <div className={`mt-2 text-2xl font-semibold ${costImpact.emissionsDelta <= 0 ? 'text-[#8df2a3]' : 'text-[#fda4af]'}`}>{costImpact.emissionsDelta}</div>
              </div>
              <div className="rounded-[22px] border border-[#173432] bg-[#0a1517] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#64827f]">Projected cost impact</div>
                <div className={`mt-2 text-2xl font-semibold ${costImpact.costDelta <= 0 ? 'text-[#d7f679]' : 'text-[#fda4af]'}`}>${Math.abs(costImpact.costDelta).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-8 py-8">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <section className="space-y-6">
              <div className="rounded-[28px] border border-[#173432] bg-[#0a1517]/92 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.26)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold">Saved scenarios</div>
                    <div className="mt-1 text-sm text-[#8ea2a1]">Snapshot a version of the network, then compare it against the live sliders before presenting recommendations.</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={comparisonScenarioId}
                      onChange={(event) => setComparisonScenarioId(event.target.value)}
                      className="h-11 rounded-2xl border border-[#214341] bg-[#091214] px-4 text-sm text-white outline-none"
                    >
                      <option value="live">Current saved baseline</option>
                      {savedScenarios.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
                      ))}
                    </select>
                    <input
                      value={scenarioNotes}
                      onChange={(event) => setScenarioNotes(event.target.value)}
                      placeholder="Why this scenario matters"
                      className="h-11 min-w-[220px] rounded-2xl border border-[#214341] bg-[#091214] px-4 text-sm text-white outline-none placeholder:text-[#58706d]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveScenario}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#dff77a] px-5 text-sm font-medium text-[#07110f] hover:translate-y-[-1px]"
                    >
                      <BookmarkPlus size={16} />
                      Save scenario
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {savedScenarios.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-[#214341] bg-[#091214] px-5 py-6 text-sm text-[#8ea2a1]">
                      No saved scenarios yet. Build one from the live workspace and use it as your comparison anchor.
                    </div>
                  ) : (
                    savedScenarios.map((scenario) => (
                      <button
                        key={scenario.id}
                        type="button"
                        onClick={() => setComparisonScenarioId(scenario.id)}
                        className={`rounded-[22px] border px-5 py-4 text-left transition-all ${comparisonScenarioId === scenario.id ? 'border-[#dff77a]/60 bg-[#121d11]' : 'border-[#1b3331] bg-[#091214] hover:border-[#315a56]'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white">{scenario.name}</div>
                          <Save size={14} className="text-[#b7cbbf]" />
                        </div>
                        <div className="mt-2 text-xs text-[#6e8b88]">{scenario.createdAt}</div>
                        <div className="mt-3 text-sm leading-6 text-[#9ab3b0]">{scenario.notes}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {errorMessage ? <div className="rounded-[20px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div> : null}
              {!errorMessage && statusMessage ? <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{statusMessage}</div> : null}

              {isLoading ? (
                <div className="rounded-[28px] border border-[#173432] bg-[#0a1517] p-8 text-sm text-[#8ea2a1]">Loading simulation baseline...</div>
              ) : (
                <SimulationPanel
                  nodes={nodes}
                  onNodesChange={persistNodes}
                  onNodeValueChange={handleSliderChange}
                  statusMessage={isPersisting ? 'Saving scenario...' : hasPendingChanges ? 'Changes queued locally...' : ''}
                  errorMessage={errorMessage}
                />
              )}
            </section>

            <aside className="space-y-6">
              <div className="rounded-[28px] border border-[#173432] bg-[#0a1517]/92 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">Scenario comparison</div>
                    <div className="mt-1 text-sm text-[#8ea2a1]">Live state versus {comparisonScenario?.name || 'current saved baseline'}. </div>
                  </div>
                  <GitCompareArrows size={18} className="text-[#dff77a]" />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[22px] border border-[#1b3331] bg-[#091214] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#63827f]">Baseline</div>
                    <div className="mt-2 text-2xl font-semibold">{costImpact.baselineMetrics.totalEmissions}</div>
                    <div className="mt-2 text-sm text-[#8ea2a1]">{comparisonInsights.metrics.highRiskCount} high-risk suppliers</div>
                  </div>
                  <div className="rounded-[22px] border border-[#204541] bg-[#101a12] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#8df2a3]">Live simulation</div>
                    <div className="mt-2 text-2xl font-semibold text-[#dff77a]">{costImpact.simulatedMetrics.totalEmissions}</div>
                    <div className="mt-2 text-sm text-[#a3c2ae]">{liveInsights.metrics.highRiskCount} high-risk suppliers</div>
                  </div>
                </div>
                <div className="mt-5 rounded-[22px] border border-[#1b3331] bg-[#091214] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white"><LineChart size={16} /> Supplier deltas</div>
                  <div className="mt-4 space-y-3">
                    {supplierDiffs.slice(0, 6).map((diff) => (
                      <div key={diff.nodeId} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
                        <div>
                          <div className="text-sm font-medium text-white">{diff.label}</div>
                          <div className="text-xs text-[#6e8b88]">{diff.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-white">{diff.currentIntensity} kgCO2e</div>
                          <div className={`text-xs ${diff.delta <= 0 ? 'text-[#8df2a3]' : 'text-[#fda4af]'}`}>{diff.delta > 0 ? '+' : ''}{diff.delta} vs baseline</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#173432] bg-[#0a1517]/92 p-6">
                <div className="flex items-center gap-2 text-lg font-semibold"><Sparkles size={17} className="text-[#dff77a]" /> Recommendations</div>
                <div className="mt-4 space-y-3">
                  {liveInsights.topOpportunities.map((opportunity, index) => (
                    <div key={opportunity.nodeId} className="rounded-[22px] border border-[#1b3331] bg-[#091214] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white">{index + 1}. {opportunity.label}</div>
                        <div className="text-xs text-[#dff77a]">Save ${opportunity.annualSavings.toLocaleString()}</div>
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[#9ab3b0]">{opportunity.rationale}</div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#6e8b88]">
                        <span>{opportunity.region}</span>
                        <span>{opportunity.category}</span>
                        <span>{opportunity.currentIntensity} to {opportunity.suggestedIntensity} kgCO2e</span>
                        <span>{opportunity.reduction} kgCO2e reduction</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
