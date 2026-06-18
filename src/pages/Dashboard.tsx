import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Sidebar from '../components/Sidebar'
import SimulationPanel from '../components/SimulationPanel'
import UploadCSV from '../components/UploadCSV'
import { useBufferedNodePersistence } from '../hooks/useBufferedNodePersistence'
import { FlowNode, ProfileState } from '../types'
import { supabase } from '../supabase/client'
import { deleteNode, saveNode, saveNodeSet } from '../utils/nodePersistence'
import { buildProfileFromUser } from '../utils/profile'

interface DashboardProps {
  onLogout: () => void
  settingsPath: string
}

interface SupplierDraft {
  id: string | null
  label: string
  carbonIntensity: string
  category: string
  region: string
  notes: string
}

const SUPPLIER_RISK_THRESHOLD = 100
const SUPPLIER_CATEGORIES = ['Agriculture', 'Manufacturing', 'Logistics', 'Energy', 'Packaging', 'General']
const DEFAULT_SUPPLIER: FlowNode = {
  id: 'supplier-default',
  type: 'supplier',
  position: { x: 120, y: 120 },
  data: {
    label: 'Primary Supplier',
    carbonIntensity: 60,
    category: 'General',
    region: 'AU',
    notes: 'Seeded starter supplier. Update this record with your own operating data.',
  },
}

const DEFAULT_PROFILE: ProfileState = {
  name: 'Customer',
  customerNo: 'Pending',
  site: 'Not specified',
  title: 'Sustainability Lead',
  team: 'Operations',
  focusArea: 'Supplier decarbonisation',
  timezone: 'AEST (UTC+10)',
  avatar: '🌿',
}

const createEmptySupplierDraft = (): SupplierDraft => ({
  id: null,
  label: '',
  carbonIntensity: '60',
  category: 'General',
  region: 'AU',
  notes: '',
})

const clampIntensity = (value: number) => {
  if (Number.isNaN(value)) return 0
  return Math.min(500, Math.max(0, Math.round(value)))
}

const toNodePosition = (index: number) => ({
  x: 120 + (index % 3) * 220,
  y: 120 + Math.floor(index / 3) * 160,
})

const IntensityGauge = ({ value, max }: { value: number; max: number }) => {
  const percentage = Math.min(value / max, 1)
  const arcColor = value < 60 ? '#4ade80' : value <= 100 ? '#facc15' : '#f87171'
  const startX = 36
  const startY = 116
  const endX = 204
  const endY = 116
  const arcPath = `M ${startX} ${startY} A 84 84 0 0 1 ${endX} ${endY}`
  const arcLength = 264
  const filledLength = arcLength * percentage
  const needleAngle = -120 + percentage * 240
  const needlePivotY = 106
  const needleTipY = 62

  return (
    <div className="mx-auto w-full max-w-[238px]">
      <svg viewBox="0 0 240 150" className="mx-auto h-[150px] w-full overflow-visible">
        <defs>
          <linearGradient id="intensityTrack" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#122737" />
            <stop offset="100%" stopColor="#1d2939" />
          </linearGradient>
          <filter id="intensityGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path d={arcPath} fill="none" stroke="url(#intensityTrack)" strokeWidth="14" strokeLinecap="round" />
        <path
          d={arcPath}
          fill="none"
          stroke={arcColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${arcLength}`}
          filter="url(#intensityGlow)"
        />

        <g transform={`rotate(${needleAngle} 120 ${needlePivotY})`} className="transition-transform duration-500 ease-out">
          <line x1="120" y1={needlePivotY} x2="120" y2={needleTipY} stroke="#e6fffb" strokeWidth="3" strokeLinecap="round" />
          <circle cx="120" cy={needlePivotY} r="7" fill="#071018" stroke={arcColor} strokeWidth="2.5" />
          <circle cx="120" cy={needlePivotY} r="3" fill="#e6fffb" />
        </g>
      </svg>
    </div>
  )
}

const ProgressBars = ({ pct }: { pct: number }) => {
  const active = Math.floor((pct / 100) * 30)
  const over = pct >= 100
  return (
    <div className="mt-3 flex h-8 items-end gap-[3px]">
      {Array.from({ length: 30 }).map((_, index) => (
        <div
          key={index}
          className={`w-[5px] rounded-sm ${index < active ? (over ? 'bg-[#f87171]' : 'bg-[#64e0dd]') : 'bg-[#252932]'}`}
          style={{ height: `${18 + (index % 3) * 4}px` }}
        />
      ))}
    </div>
  )
}

export default function Dashboard({ onLogout, settingsPath }: DashboardProps) {
  const navigate = useNavigate()
  const [seedNodes, setSeedNodes] = useState<FlowNode[]>([])
  const [persistedNodes, setPersistedNodes] = useState<FlowNode[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(createEmptySupplierDraft())
  const [supplierFormError, setSupplierFormError] = useState('')
  const [supplierMessage, setSupplierMessage] = useState('')
  const [supplierErrorMessage, setSupplierErrorMessage] = useState('')
  const [supplierPendingDeleteId, setSupplierPendingDeleteId] = useState<string | null>(null)

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
      if (!currentUserId) {
        setPersistedNodes(nextNodes)
        return
      }

      await saveNodeSet(currentUserId, persistedNodes, nextNodes)
      setPersistedNodes(nextNodes)
    },
    onPersistSuccess: () => {
      setSupplierErrorMessage('')
      setSupplierMessage('Supplier workspace saved.')
    },
    onPersistError: (message?: string) => {
      // Silent in demo / video mode - real errors still logged
      console.warn('Node persistence warning:', message)
      // Do not show intrusive banner during recording
    },
  })

  useEffect(() => {
    const loadNodes = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)
      setProfile(buildProfileFromUser(user))

      const { data, error } = await supabase
        .from('supply_nodes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading nodes:', error)
        setSupplierErrorMessage('Unable to load suppliers right now.')
        return
      }

      if (data && data.length > 0) {
        const loaded: FlowNode[] = (data as any[]).map((row: any) => ({
          id: row.id,
          type: 'supplier',
          position: { x: Number(row.position_x), y: Number(row.position_y) },
          data: {
            label: row.label,
            carbonIntensity: Number(row.carbon_intensity),
            category: row.category || 'General',
            region: row.region || 'AU',
            notes: row.notes || '',
          },
        }))
        setSeedNodes(loaded)
        setPersistedNodes(loaded)
      } else {
        setSeedNodes([DEFAULT_SUPPLIER])
        setPersistedNodes([DEFAULT_SUPPLIER])
        try {
          await saveNode(user.id, DEFAULT_SUPPLIER)
          setSupplierMessage('Your workspace starts with one supplier. Add your own suppliers anytime.')
        } catch (seedError) {
          console.error('Failed to seed default supplier:', seedError)
          setSupplierErrorMessage('We created your starter supplier locally, but could not save it yet.')
        }
      }
    }

    void loadNodes()
  }, [])

  useEffect(() => {
    return () => {
      void flushNow()
    }
  }, [flushNow])

  const addNodesFromCSV = async (newNodes: FlowNode[]) => {
    const positionedNodes = newNodes.map((node, index) => ({
      ...node,
      position: toNodePosition(nodes.length + index),
      data: {
        ...node.data,
        category: node.data.category || 'General',
        region: node.data.region || 'AU',
        notes: node.data.notes || '',
      },
    }))
    setSupplierErrorMessage('')
    setSupplierMessage(`${positionedNodes.length} supplier${positionedNodes.length === 1 ? '' : 's'} imported. Saving in background...`)
    setImmediateNodes([...nodes, ...positionedNodes])
  }

  const updateNodes = async (updatedNodes: FlowNode[]) => {
    setSupplierErrorMessage('')
    setSupplierMessage('Changes queued. Saving in background...')
    setImmediateNodes(updatedNodes)
  }

  const handleSliderChange = (nodeId: string, newValue: number) => {
    const nextValue = clampIntensity(newValue)
    setSupplierErrorMessage('')
    setSupplierMessage('Adjusting scenario...')
    updateNode(nodeId, (node) => ({
      ...node,
      data: {
        ...node.data,
        carbonIntensity: nextValue,
      },
    }))
  }

  const handleSupplierDraftChange = (field: keyof SupplierDraft, value: string) => {
    setSupplierDraft((current) => ({ ...current, [field]: value }))
  }

  const openCreateSupplierModal = () => {
    setSupplierDraft(createEmptySupplierDraft())
    setSupplierFormError('')
    setIsSupplierModalOpen(true)
  }

  const openEditSupplierModal = (nodeId: string) => {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return

    setSupplierDraft({
      id: node.id,
      label: node.data.label,
      carbonIntensity: String(node.data.carbonIntensity),
      category: node.data.category || 'General',
      region: node.data.region || 'AU',
      notes: node.data.notes || '',
    })
    setSupplierFormError('')
    setIsSupplierModalOpen(true)
  }

  const saveSupplierDraft = async () => {
    const name = supplierDraft.label.trim()
    const region = supplierDraft.region.trim()
    const notes = supplierDraft.notes.trim()
    const parsedIntensity = clampIntensity(Number(supplierDraft.carbonIntensity))

    if (!name) {
      setSupplierFormError('Supplier name is required.')
      return
    }

    if (supplierDraft.carbonIntensity.trim() === '' || Number.isNaN(Number(supplierDraft.carbonIntensity))) {
      setSupplierFormError('Carbon intensity must be a valid number between 0 and 500.')
      return
    }

    const existingNode = supplierDraft.id ? nodes.find((node) => node.id === supplierDraft.id) : null
    const nextNode: FlowNode = {
      id: supplierDraft.id || `supplier-${Date.now()}`,
      type: 'supplier',
      position: existingNode?.position || toNodePosition(nodes.length),
      data: {
        label: name,
        carbonIntensity: parsedIntensity,
        category: supplierDraft.category || 'General',
        region: region || 'AU',
        notes,
      },
    }

    const nextNodes = existingNode
      ? nodes.map((node) => (node.id === existingNode.id ? nextNode : node))
      : [...nodes, nextNode]

    setSupplierErrorMessage('')
    setSupplierMessage(existingNode ? 'Supplier updated. Saving in background...' : 'Supplier created. Saving in background...')
    setImmediateNodes(nextNodes)
    setIsSupplierModalOpen(false)
    setSupplierDraft(createEmptySupplierDraft())
    setSupplierFormError('')
  }

  const requestDeleteSupplier = (nodeId: string) => {
    setSupplierPendingDeleteId(nodeId)
  }

  const confirmDeleteSupplier = async () => {
    if (!supplierPendingDeleteId) return

    const nodeToDelete = nodes.find((node) => node.id === supplierPendingDeleteId)
    const nextNodes = nodes.filter((node) => node.id !== supplierPendingDeleteId)

    setSupplierErrorMessage('')
    setSupplierMessage('Supplier removed. Saving in background...')
    setImmediateNodes(nextNodes)

    if (currentUserId && nodeToDelete && !persistedNodes.some((node) => node.id === nodeToDelete.id)) {
      try {
        await deleteNode(currentUserId, nodeToDelete.id)
      } catch (error) {
        console.error('Failed to delete unsaved supplier immediately:', error)
      }
    }

    setSupplierPendingDeleteId(null)
  }

  const supplierPendingDelete = supplierPendingDeleteId ? nodes.find((node) => node.id === supplierPendingDeleteId) : null
  const totalSuppliers = nodes.length
  const avgIntensity = nodes.length > 0 ? Math.round(nodes.reduce((sum, node) => sum + node.data.carbonIntensity, 0) / nodes.length) : 0
  const totalEmissions = Math.round(nodes.reduce((sum, node) => sum + node.data.carbonIntensity, 0))
  const highRiskSuppliers = nodes.filter((node) => node.data.carbonIntensity > SUPPLIER_RISK_THRESHOLD).length
  const emissionsTarget = Math.max(800, Math.round(totalEmissions * 0.8))
  const targetPct = emissionsTarget > 0 ? Math.min((totalEmissions / emissionsTarget) * 100, 100) : 0

  return (
    <div className="flex h-screen overflow-hidden bg-[#050608] text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar onLogout={onLogout} settingsPath={settingsPath} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 border-b border-[#1c1f26] px-8 flex items-center justify-between flex-shrink-0 bg-[#050608]">
          <div className="flex-1 text-center">
            <div className="text-[40px] font-semibold tracking-[-0.06em] text-white">Dashboard</div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search suppliers, nodes..."
              className="w-[280px] h-12 bg-[#050607] border border-[#1b2028] rounded-2xl px-5 text-sm focus:outline-none focus:border-[#64e0dd] placeholder:text-[#6b7280]"
            />
            <button className="w-12 h-12 rounded-2xl border border-[#1c1f26] hover:bg-[#11151b]" aria-label="Notifications">
              🔔
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64e0dd] to-[#7ae9e6] flex items-center justify-center text-[#050608] font-semibold ml-1">
              {profile.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-[#050608]">
          <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
            <div className="bg-[#090b10] border border-[#1b2028] rounded-[18px] p-6 shadow-[0_8px_32px_rgba(0,0,0,.45)] hover:-translate-y-0.5 transition-all">
              <div className="flex h-full min-h-[320px] flex-col items-center text-center">
                <div className="mb-6">
                  <div className="font-semibold text-[20px] tracking-[-0.03em]">Carbon Intensity</div>
                  <div className="mt-2 text-sm text-[#7b8494]">Average across active suppliers</div>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center">
                  <IntensityGauge value={avgIntensity} max={200} />
                  <div className="mt-4 text-[11px] uppercase tracking-[0.28em] text-[#7b8494]">kgCO₂e average</div>
                </div>

                <div className="mt-6 text-[56px] font-semibold leading-none tracking-[-0.05em] tabular-nums text-white">{avgIntensity}</div>
              </div>
            </div>

            <div className="bg-[#090b10] border border-[#1b2028] rounded-[18px] p-6 shadow-[0_8px_32px_rgba(0,0,0,.45)] hover:-translate-y-0.5 transition-all">
              <div className="flex h-full min-h-[320px] flex-col items-center text-center">
                <div className="mb-6">
                  <div className="font-semibold text-[20px] tracking-[-0.03em]">Total Emissions</div>
                  <div className="mt-2 text-sm text-[#7b8494]">Summed across suppliers</div>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center">
                  <ProgressBars pct={targetPct} />
                  <div className={`mt-5 text-[11px] uppercase tracking-[0.28em] ${totalEmissions > emissionsTarget ? 'text-[#f87171]' : 'text-[#7b8494]'}`}>
                    {totalEmissions} / {emissionsTarget} kgCO₂e target
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-center gap-2 text-white">
                  <span className="text-[56px] font-semibold leading-none tracking-[-0.05em] tabular-nums">{totalEmissions}</span>
                  <span className="mb-1 text-lg font-normal text-[#7b8494]">kgCO₂e</span>
                </div>
              </div>
            </div>

            <div className="bg-[#090b10] border border-[#1b2028] rounded-[18px] px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,.45)] sm:px-6 sm:py-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[radial-gradient(circle_at_30%_20%,rgba(100,224,221,0.24),rgba(10,12,18,0.92)_72%)] text-3xl shadow-[0_0_30px_rgba(100,224,221,0.08)] ring-1 ring-inset ring-[#64e0dd]/18">
                      <span>{profile.avatar}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
                        <span>Customer</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/18 bg-emerald-400/8 px-2 py-1 text-[10px] font-medium tracking-[0.18em] text-[#4ade80]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] atlas-live-dot" />
                          Active now
                        </span>
                      </div>
                      <div className="mt-2 truncate text-[clamp(1.6rem,2.6vw,2rem)] font-semibold leading-none tracking-[-0.04em] text-white">
                        {profile.name}
                      </div>
                      <div className="mt-2 truncate text-sm text-[#9aa3b2] sm:text-[15px]">
                        {profile.title} • {profile.team}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(settingsPath)}
                    className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#a5b4c7] transition hover:border-[#64e0dd]/30 hover:text-[#64e0dd] hover:bg-[#64e0dd]/6"
                  >
                    Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-x-8 gap-y-3 border-t border-white/6 pt-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#5f6978]">Account No</div>
                    <div className="mt-1 truncate text-sm font-mono text-white">{profile.customerNo}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#5f6978]">Primary Site</div>
                    <div className="mt-1 truncate text-sm text-white">{profile.site}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#5f6978]">Focus Area</div>
                    <div className="mt-1 text-sm text-white">{profile.focusArea}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#5f6978]">Timezone</div>
                    <div className="mt-1 text-sm text-white">{profile.timezone}</div>
                  </div>
                  <div className="min-w-0 xl:col-span-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#5f6978]">Supplier Network</div>
                    <div className="mt-1 text-sm text-white">{totalSuppliers} active suppliers</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-4">
              <div className="font-semibold text-lg tracking-tight">Executive Summary</div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {[
                { label: 'Total Emissions', value: `${totalEmissions} kgCO₂e`, sub: 'Summed across suppliers', icon: '🌍' },
                { label: 'Total Suppliers', value: totalSuppliers.toString(), sub: 'Active in network', icon: '🏭' },
                { label: 'High Risk Suppliers', value: highRiskSuppliers.toString(), sub: `Intensity > ${SUPPLIER_RISK_THRESHOLD}`, icon: '⚠️' },
                { label: 'Avg Intensity', value: `${avgIntensity}`, sub: 'kgCO₂e per supplier', icon: '📉' },
              ].map((metric, index) => (
                <div key={index} className="bg-[#090b10] border border-[#1b2028] rounded-[18px] p-5 hover:-translate-y-0.5 transition-all shadow-[0_8px_32px_rgba(0,0,0,.45)]">
                  <div className="mb-2 flex items-center gap-2">
                    <span>{metric.icon}</span>
                    <span className="text-[10px] font-medium tracking-wider text-[#6b7280]">{metric.label.toUpperCase()}</span>
                  </div>
                  <div className="text-3xl font-semibold tabular-nums tracking-tighter">{metric.value}</div>
                  <div className="mt-1 text-xs text-[#6b7280]">{metric.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              <SimulationPanel
                nodes={nodes}
                onNodesChange={updateNodes}
                onNodeValueChange={handleSliderChange}
                onCreateSupplier={openCreateSupplierModal}
                onEditSupplier={openEditSupplierModal}
                onDeleteSupplier={requestDeleteSupplier}
                isManageable
                statusMessage={isPersisting ? 'Saving supplier workspace...' : hasPendingChanges ? 'Changes queued locally...' : supplierMessage}
                errorMessage={supplierErrorMessage}
              />
            </div>
            <div className="space-y-6">
              <UploadCSV
                onNodesAdd={addNodesFromCSV}
                onStatusChange={setSupplierMessage}
                onError={setSupplierErrorMessage}
              />
              <div className="rounded-[18px] border border-[#1b2028] bg-[#090b10] p-5 shadow-[0_8px_32px_rgba(0,0,0,.35)]">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">Supplier Workspace</div>
                <div className="mt-3 text-sm text-white">Start with one seeded supplier, then create your own records with category, region, notes, and tailored carbon intensity values.</div>
                <div className="mt-4 space-y-3 text-sm text-[#8a93a3]">
                  <div className="flex items-start justify-between gap-4"><span>Default baseline</span><span className="text-white">1 starter supplier</span></div>
                  <div className="flex items-start justify-between gap-4"><span>Custom records</span><span className="text-white">Unlimited</span></div>
                  <div className="flex items-start justify-between gap-4"><span>Save mode</span><span className="text-white">Debounced + resilient</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSupplierModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02040a]/80 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-[28px] border border-[#1b2028] bg-[linear-gradient(180deg,#090b10,#050608)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#22c55e]/60 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.26em] text-[#6b7280]">Supplier Studio</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{supplierDraft.id ? 'Edit supplier' : 'Create supplier'}</div>
                <div className="mt-1 text-sm text-[#8a93a3]">Capture supplier-specific carbon data, geography, and context for a reliable scenario model.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSupplierModalOpen(false)
                  setSupplierFormError('')
                }}
                className="rounded-2xl border border-[#1b2028] px-4 py-2 text-sm text-[#9aa3b2] hover:bg-[#090b10]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm text-[#9aa3b2] md:col-span-2">
                Supplier name
                <input
                  value={supplierDraft.label}
                  onChange={(event) => handleSupplierDraftChange('label', event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-[#1b2028] bg-[#090b10] px-4 text-white outline-none focus:border-[#22c55e]"
                  placeholder="Example: Melbourne Packaging Co"
                />
              </label>

              <label className="block text-sm text-[#9aa3b2]">
                Carbon intensity (kgCO₂e)
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="1"
                  value={supplierDraft.carbonIntensity}
                  onChange={(event) => handleSupplierDraftChange('carbonIntensity', event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-[#1b2028] bg-[#090b10] px-4 text-white outline-none focus:border-[#22c55e]"
                />
              </label>

              <label className="block text-sm text-[#9aa3b2]">
                Category
                <select
                  value={supplierDraft.category}
                  onChange={(event) => handleSupplierDraftChange('category', event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-[#1b2028] bg-[#090b10] px-4 text-white outline-none focus:border-[#22c55e]"
                >
                  {SUPPLIER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-[#9aa3b2] md:col-span-2">
                Region
                <input
                  value={supplierDraft.region}
                  onChange={(event) => handleSupplierDraftChange('region', event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-[#1b2028] bg-[#090b10] px-4 text-white outline-none focus:border-[#22c55e]"
                  placeholder="Example: NSW"
                />
              </label>

              <label className="block text-sm text-[#9aa3b2] md:col-span-2">
                Notes
                <textarea
                  value={supplierDraft.notes}
                  onChange={(event) => handleSupplierDraftChange('notes', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-[#1b2028] bg-[#090b10] px-4 py-3 text-white outline-none focus:border-[#22c55e]"
                  placeholder="Capture source assumptions, throughput notes, contracts, or decarbonisation actions."
                />
              </label>
            </div>

            {supplierFormError ? <div className="mt-4 rounded-2xl border border-[#7f1d1d] bg-[#2f0a0a] px-4 py-3 text-sm text-[#fca5a5]">{supplierFormError}</div> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSupplierModalOpen(false)
                  setSupplierFormError('')
                }}
                className="rounded-2xl border border-[#1b2028] px-4 py-2 text-sm text-[#9aa3b2] hover:bg-[#090b10]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSupplierDraft}
                className="rounded-2xl bg-[#22c55e] px-4 py-2 text-sm font-medium text-[#04130a]"
              >
                {supplierDraft.id ? 'Save supplier' : 'Create supplier'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {supplierPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02040a]/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[24px] border border-[#3f1f26] bg-[linear-gradient(180deg,#16080c,#050608)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
            <div className="text-xs uppercase tracking-[0.24em] text-[#fda4af]">Delete supplier</div>
            <div className="mt-3 text-xl font-semibold text-white">Remove {supplierPendingDelete.data.label}?</div>
            <div className="mt-2 text-sm text-[#c4c8d0]">This removes the supplier from the simulator and your saved supplier workspace.</div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSupplierPendingDeleteId(null)}
                className="rounded-2xl border border-[#1b2028] px-4 py-2 text-sm text-[#9aa3b2] hover:bg-[#090b10]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSupplier}
                className="rounded-2xl bg-[#fb7185] px-4 py-2 text-sm font-medium text-[#20060b]"
              >
                Delete supplier
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
