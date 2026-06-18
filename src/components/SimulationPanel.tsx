// AtlasFlow - Simulation panel
// Change carbon intensity and see total emissions update live


import { FlowNode } from '../types'
import { calculateTotalEmissions } from '../utils/calculateEmissions'

interface SimulationPanelProps {
  nodes: FlowNode[]
  onNodesChange: (nodes: FlowNode[]) => void | Promise<void>
  onNodeValueChange?: (nodeId: string, newValue: number) => void | Promise<void>
  onCreateSupplier?: () => void
  onEditSupplier?: (nodeId: string) => void
  onDeleteSupplier?: (nodeId: string) => void
  isManageable?: boolean
  statusMessage?: string
  errorMessage?: string
}

const supplierStatusTone = (intensity: number) => {
  if (intensity < 60) return { label: 'Optimized', tone: 'text-[#4ade80] border-[#14532d] bg-[#052e16]' }
  if (intensity <= 100) return { label: 'Watchlist', tone: 'text-[#facc15] border-[#713f12] bg-[#2a1905]' }
  return { label: 'High risk', tone: 'text-[#f87171] border-[#7f1d1d] bg-[#2f0a0a]' }
}

const clampIntensity = (value: number) => {
  if (Number.isNaN(value)) return 0
  return Math.min(500, Math.max(0, value))
}

export default function SimulationPanel({
  nodes,
  onNodesChange,
  onNodeValueChange,
  onCreateSupplier,
  onEditSupplier,
  onDeleteSupplier,
  isManageable = false,
  statusMessage,
  errorMessage,
}: SimulationPanelProps) {
  const totalEmissions = calculateTotalEmissions(nodes)
  const proposedEmissions = Math.max(0, Math.round(totalEmissions * 0.82))
  const emissionsReduction = Math.max(0, totalEmissions - proposedEmissions)

  const handleIntensityChange = (nodeId: string, newValue: number) => {
    const clampedValue = clampIntensity(newValue)

    if (onNodeValueChange) {
      onNodeValueChange(nodeId, clampedValue)
      return
    }

    const updatedNodes = nodes.map((node) =>
      node.id === nodeId
        ? {
          ...node,
          data: {
            ...node.data,
            carbonIntensity: clampedValue,
          },
        }
        : node,
    )

    onNodesChange(updatedNodes)
  }

  return (
    <div className="bg-[#090b10] border border-[#1b2028] rounded-[18px] p-6 shadow-[0_8px_32px_rgba(0,0,0,.45)] h-full">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-semibold tracking-tight">Carbon Intensity Simulator</div>
          <div className="mt-0.5 text-xs text-[#6b7280]">What-if analysis • Instant recalculation • Supplier workspace</div>
        </div>

        {isManageable ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCreateSupplier}
              className="rounded-2xl border border-[#22c55e]/40 bg-[#052e16] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4ade80] hover:border-[#22c55e]"
            >
              Add supplier
            </button>
          </div>
        ) : null}
      </div>

      {statusMessage ? (
        <div className="mb-4 rounded-2xl border border-[#14532d] bg-[#052e16] px-4 py-3 text-sm text-[#86efac]">{statusMessage}</div>
      ) : null}

      {errorMessage ? (
        <div className="mb-4 rounded-2xl border border-[#7f1d1d] bg-[#2f0a0a] px-4 py-3 text-sm text-[#fca5a5]">{errorMessage}</div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="p-4 bg-[#050608] rounded-2xl border border-[#1b2028]">
          <div className="text-xs text-[#6b7280]">CURRENT STATE</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-white">{totalEmissions} <span className="text-sm">kgCO₂e</span></div>
          <div className="mt-2 text-xs text-[#6b7280]">Based on {nodes.length} active supplier{nodes.length === 1 ? '' : 's'}</div>
        </div>
        <div className="p-4 bg-[#052e16] rounded-2xl border border-[#22c55e]">
          <div className="text-xs text-[#4ade80]">PROPOSED (SIMULATED)</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-[#4ade80]">{proposedEmissions} <span className="text-sm">kgCO₂e</span></div>
          <div className="mt-1 text-xs text-[#4ade80]">−{emissionsReduction} kgCO₂e (−18%)</div>
        </div>
      </div>

      <div className="space-y-5">
        {nodes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1b2028] bg-[#050608] px-5 py-8 text-center">
            <div className="text-sm text-white">No suppliers yet</div>
            <div className="mt-2 text-sm text-[#6b7280]">
              Create your first supplier to start modelling carbon intensity and scenario changes.
            </div>
            {isManageable ? (
              <button
                type="button"
                onClick={onCreateSupplier}
                className="mt-5 rounded-2xl border border-[#64e0dd]/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#64e0dd] hover:bg-[#64e0dd]/10"
              >
                Create supplier
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="-mt-2 text-xs text-[#6b7280]">Adjust carbon intensity live, review supplier metadata, and manage your supplier set from one workspace.</p>

            {nodes.map((node) => {
              const tone = supplierStatusTone(node.data.carbonIntensity)
              return (
                <div key={node.id} className="rounded-[22px] border border-[#1b2028] bg-[#050608] p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="truncate text-base font-semibold text-white">{node.data.label}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.tone}`}>
                          {tone.label}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#8b95a5]">
                        <span>{node.data.category || 'General supplier'}</span>
                        <span>{node.data.region || 'AU'}</span>
                        {node.data.notes ? <span className="max-w-full truncate">{node.data.notes}</span> : null}
                      </div>
                    </div>

                    {isManageable ? (
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                          type="button"
                          onClick={() => onEditSupplier?.(node.id)}
                          className="rounded-2xl border border-[#1b2028] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9aa3b2] hover:border-[#64e0dd]/30 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSupplier?.(node.id)}
                          className="rounded-2xl border border-[#3f1f26] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fda4af] hover:border-[#fb7185]/50 hover:text-[#ffe4e6]"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-[#9aa3b2]">Carbon intensity</span>
                    <span className="font-mono tabular-nums text-[#64e0dd]">{node.data.carbonIntensity} kgCO₂e</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="5"
                    value={node.data.carbonIntensity}
                    onChange={(e) => handleIntensityChange(node.id, Number(e.target.value))}
                    className="mt-3 w-full accent-[#64e0dd]"
                  />

                  <div className="mt-2 flex justify-between text-xs text-[#6b7280]">
                    <span>Low impact</span>
                    <span>High impact</span>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      <div className="mt-4 text-[10px] italic text-[#6b7280]">Changes update the network live. Use the supplier workspace to model your own operating data safely.</div>
    </div>
  )
}