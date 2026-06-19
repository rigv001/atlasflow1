import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Grid3X3,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'

import Sidebar from '../components/Sidebar'
import NodeGraph, { type GraphEdge, type GraphTheme } from '../components/NodeGraph'
import { useBufferedNodePersistence } from '../hooks/useBufferedNodePersistence'
import { FlowNode } from '../types'
import { supabase } from '../supabase/client'
import { deleteNode, saveNodeSet } from '../utils/nodePersistence'
import { getNetworkInsightSnapshot } from '../utils/networkAnalytics'

interface PageProps {
  onLogout: () => void
  settingsPath: string
}

type ThemeKey = 'aurora' | 'amber' | 'reef'

const THEMES: Record<ThemeKey, GraphTheme> = {
  aurora: {
    canvasGlow: 'rgba(45, 212, 191, 0.20)',
    panelTint: 'linear-gradient(180deg, rgba(7, 22, 19, 0.92), rgba(5, 13, 17, 0.86))',
    grid: 'rgba(58, 142, 114, 0.24)',
    accent: '#34d399',
  },
  amber: {
    canvasGlow: 'rgba(163, 230, 53, 0.18)',
    panelTint: 'linear-gradient(180deg, rgba(16, 26, 14, 0.92), rgba(10, 16, 10, 0.86))',
    grid: 'rgba(123, 154, 64, 0.22)',
    accent: '#a3e635',
  },
  reef: {
    canvasGlow: 'rgba(16, 185, 129, 0.18)',
    panelTint: 'linear-gradient(180deg, rgba(5, 24, 20, 0.92), rgba(4, 14, 16, 0.86))',
    grid: 'rgba(68, 160, 120, 0.20)',
    accent: '#10b981',
  },
}

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

const deriveEdges = (nodes: FlowNode[], spacing: number): GraphEdge[] => {
  const categories = new Map<string, FlowNode[]>()

  nodes.forEach((node) => {
    const key = node.data.category || 'General'
    const existing = categories.get(key) || []
    existing.push(node)
    categories.set(key, existing)
  })

  const edges: GraphEdge[] = []
  const seen = new Set<string>()
  const maxDistance = Math.max(180, spacing * 1.25)

  const connect = (source: string, target: string) => {
    if (source === target) return
    const key = [source, target].sort().join('::')
    if (seen.has(key)) return
    seen.add(key)
    edges.push({ id: `edge-${source}-${target}`, source, target })
  }

  for (const [, groupNodes] of categories) {
    for (let index = 1; index < groupNodes.length; index += 1) {
      connect(groupNodes[index - 1].id, groupNodes[index].id)
    }
  }

  for (let index = 0; index < nodes.length; index += 1) {
    for (let compare = index + 1; compare < nodes.length; compare += 1) {
      const first = nodes[index]
      const second = nodes[compare]
      const dx = first.position.x - second.position.x
      const dy = first.position.y - second.position.y
      const distance = Math.hypot(dx, dy)
      if (distance <= maxDistance) connect(first.id, second.id)
    }
  }

  return edges
}

const defaultDraft = {
  label: '',
  carbonIntensity: 80,
  category: 'General',
  region: 'NSW',
  notes: '',
}

const riskBand = (intensity: number) => {
  if (intensity < 60) return { label: 'Optimized', tone: 'text-emerald-200', surface: 'bg-emerald-500/14', dot: 'bg-emerald-300' }
  if (intensity <= 100) return { label: 'Watchlist', tone: 'text-amber-200', surface: 'bg-amber-500/14', dot: 'bg-amber-300' }
  return { label: 'Critical', tone: 'text-rose-200', surface: 'bg-rose-500/14', dot: 'bg-rose-300' }
}

const buildNodeFingerprint = (nodes: FlowNode[]) =>
  nodes
    .map((node) => `${node.id}:${node.position.x}:${node.position.y}:${node.data.category || 'General'}`)
    .sort()
    .join('|')

const buildEdgeFingerprint = (edges: GraphEdge[]) =>
  edges
    .map((edge) => `${edge.source}:${edge.target}`)
    .sort()
    .join('|')

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

export default function NetworkMapPage({ onLogout, settingsPath }: PageProps) {
  const [seedNodes, setSeedNodes] = useState<FlowNode[]>([])
  const [persistedNodes, setPersistedNodes] = useState<FlowNode[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [spacing, setSpacing] = useState(220)
  const [connectionOpacity, setConnectionOpacity] = useState(0.55)
  const [showLabels, setShowLabels] = useState(true)
  const [showEdges, setShowEdges] = useState(true)
  const [physicsEnabled, setPhysicsEnabled] = useState(false)
  const [themeKey, setThemeKey] = useState<ThemeKey>('aurora')
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const [isInspectorOpen, setIsInspectorOpen] = useState(true)
  const [isInspectorEditing, setIsInspectorEditing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState(defaultDraft)

  const {
    nodes: allNodes,
    setImmediateNodes,
    flushNow,
    isPersisting,
    hasPendingChanges,
  } = useBufferedNodePersistence({
    initialNodes: seedNodes,
    debounceMs: 280,
    onPersist: async (nextNodes) => {
      if (!currentUserId) {
        setPersistedNodes(nextNodes)
        return
      }

      await saveNodeSet(currentUserId, persistedNodes, nextNodes)
      setPersistedNodes(nextNodes)
    },
  })

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)
      setLoadError('')

      const { data, error } = await supabase
        .from('supply_nodes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to load map nodes', error)
        setLoadError('Unable to load your saved suppliers right now.')
        setSeedNodes([DEFAULT_SUPPLIER])
        setPersistedNodes([DEFAULT_SUPPLIER])
        setSelectedNodeId(DEFAULT_SUPPLIER.id)
        return
      }

      const loaded = (data || []).map((row: any) => ({
        id: row.id,
        type: 'supplier',
        position: { x: Number(row.position_x) || 0, y: Number(row.position_y) || 0 },
        data: {
          label: row.label,
          carbonIntensity: Number(row.carbon_intensity) || 0,
          category: row.category || 'General',
          region: row.region || 'AU',
          notes: row.notes || '',
        },
      }))

      const nextNodes = loaded.length > 0 ? loaded : [DEFAULT_SUPPLIER]
      setSeedNodes(nextNodes)
      setPersistedNodes(nextNodes)
      setSelectedNodeId(nextNodes[0]?.id ?? null)
    }

    void load()
  }, [])

  useEffect(() => {
    return () => {
      void flushNow()
    }
  }, [flushNow])

  const filteredNodes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return allNodes
    return allNodes.filter((node) => {
      const haystack = `${node.data.label} ${node.data.category || ''} ${node.data.region || ''} ${node.data.notes || ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [allNodes, searchTerm])

  const derivedEdges = useMemo(() => deriveEdges(filteredNodes, spacing), [filteredNodes, spacing])
  const nodeFingerprint = useMemo(() => buildNodeFingerprint(filteredNodes), [filteredNodes])
  const derivedEdgeFingerprint = useMemo(() => buildEdgeFingerprint(derivedEdges), [derivedEdges])

  useEffect(() => {
    setEdges((current) => {
      const currentVisibleEdges = current.filter((edge) =>
        filteredNodes.some((node) => node.id === edge.source) && filteredNodes.some((node) => node.id === edge.target),
      )

      if (buildEdgeFingerprint(currentVisibleEdges) === derivedEdgeFingerprint) {
        return currentVisibleEdges
      }

      return derivedEdges
    })
  }, [derivedEdgeFingerprint, derivedEdges, filteredNodes])

  useEffect(() => {
    if (!physicsEnabled || filteredNodes.length < 2 || isDraggingNode) return

    const visibleNodeIds = new Set(filteredNodes.map((node) => node.id))
    const intervalId = window.setInterval(() => {
      const nextNodes = allNodes.map((node, index, currentNodes) => {
        if (!visibleNodeIds.has(node.id)) return node

        let offsetX = 0
        let offsetY = 0

        currentNodes.forEach((otherNode, otherIndex) => {
          if (index === otherIndex || !visibleNodeIds.has(otherNode.id)) return

          const dx = node.position.x - otherNode.position.x
          const dy = node.position.y - otherNode.position.y
          const distance = Math.max(Math.hypot(dx, dy), 1)

          if (distance < spacing * 0.65) {
            offsetX += (dx / distance) * 6
            offsetY += (dy / distance) * 6
          } else if (distance > spacing * 1.1) {
            offsetX -= (dx / distance) * 1.4
            offsetY -= (dy / distance) * 1.4
          }
        })

        return {
          ...node,
          position: {
            x: Math.round((node.position.x + offsetX) * 10) / 10,
            y: Math.round((node.position.y + offsetY) * 10) / 10,
          },
        }
      })

      if (buildNodeFingerprint(nextNodes.filter((node) => visibleNodeIds.has(node.id))) !== nodeFingerprint) {
        setImmediateNodes(nextNodes)
      }
    }, 180)

    return () => window.clearInterval(intervalId)
  }, [allNodes, filteredNodes, isDraggingNode, nodeFingerprint, physicsEnabled, setImmediateNodes, spacing])

  useEffect(() => {
    if (!selectedNodeId && filteredNodes[0]) {
      setSelectedNodeId(filteredNodes[0].id)
    }
  }, [filteredNodes, selectedNodeId])

  const selectedNode = useMemo(
    () => allNodes.find((node) => node.id === selectedNodeId) ?? null,
    [allNodes, selectedNodeId],
  )

  useEffect(() => {
    if (selectedNode) {
      setDraft({
        label: selectedNode.data.label,
        carbonIntensity: selectedNode.data.carbonIntensity,
        category: selectedNode.data.category || 'General',
        region: selectedNode.data.region || 'AU',
        notes: selectedNode.data.notes || '',
      })
    } else {
      setDraft(defaultDraft)
      setIsInspectorEditing(false)
    }
  }, [selectedNode])

  useEffect(() => {
    if (selectedNode) setIsInspectorOpen(true)
  }, [selectedNode])

  const handleNodesChange = (nextNodes: FlowNode[]) => {
    setImmediateNodes(nextNodes)
  }

  const handleAutoLayout = () => {
    const categories = Array.from(new Set(allNodes.map((node) => node.data.category || 'General')))
    const nextNodes = allNodes.map((node, index) => {
      const categoryIndex = Math.max(categories.indexOf(node.data.category || 'General'), 0)
      const row = Math.floor(index / 3)
      const column = index % 3
      return {
        ...node,
        position: {
          x: column * spacing + categoryIndex * 42 - spacing,
          y: row * (spacing * 0.72) + categoryIndex * 56 - 120,
        },
      }
    })
    setImmediateNodes(nextNodes)
  }

  const handleAddNode = () => {
    const nextNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: 'supplier',
      position: { x: Math.random() * 240 - 100, y: Math.random() * 220 + 40 },
      data: {
        label: `Supplier ${allNodes.length + 1}`,
        carbonIntensity: 80,
        category: 'General',
        region: 'AU',
        notes: 'New supplier node',
      },
    }

    const nextNodes = [...allNodes, nextNode]
    setImmediateNodes(nextNodes)
    setSelectedNodeId(nextNode.id)
  }

  const handleDeleteNode = async () => {
    if (!selectedNode) return

    if (currentUserId) {
      try {
        await deleteNode(currentUserId, selectedNode.id)
      } catch (error) {
        console.error('Failed to delete node', error)
      }
    }

    const nextNodes = allNodes.filter((node) => node.id !== selectedNode.id)
    setImmediateNodes(nextNodes)
    setPersistedNodes((current) => current.filter((node) => node.id !== selectedNode.id))
    setSelectedNodeId(nextNodes[0]?.id ?? null)
  }

  const handleDraftSave = () => {
    if (!selectedNode) return
    const nextNodes = allNodes.map((node) =>
      node.id === selectedNode.id
        ? {
          ...node,
          data: {
            ...node.data,
            label: draft.label.trim() || 'Untitled supplier',
            carbonIntensity: Number(draft.carbonIntensity) || 0,
            category: draft.category.trim() || 'General',
            region: draft.region.trim() || 'AU',
            notes: draft.notes,
          },
        }
        : node,
    )
    setImmediateNodes(nextNodes)
    setIsInspectorEditing(false)
  }

  const averageIntensity = filteredNodes.length
    ? Math.round(filteredNodes.reduce((sum, node) => sum + node.data.carbonIntensity, 0) / filteredNodes.length)
    : 0
  const highRiskCount = filteredNodes.filter((node) => node.data.carbonIntensity > 100).length
  const mediumRiskCount = filteredNodes.filter((node) => node.data.carbonIntensity >= 60 && node.data.carbonIntensity <= 100).length
  const insightSnapshot = useMemo(() => getNetworkInsightSnapshot(filteredNodes, spacing), [filteredNodes, spacing])
  const theme = THEMES[themeKey]
  const statusFilter = searchTerm.trim() ? `Search: ${searchTerm}` : 'All suppliers'
  const selectedRisk = selectedNode ? riskBand(selectedNode.data.carbonIntensity) : null
  const selectedConnections = selectedNode ? edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).length : 0

  return (
    <div className="flex h-screen overflow-hidden bg-[#020605] text-white" style={{ fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif' }}>
      <Sidebar onLogout={onLogout} settingsPath={settingsPath} />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#010604]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(52,211,153,0.16),transparent_20%),radial-gradient(circle_at_78%_14%,rgba(16,185,129,0.12),transparent_18%),radial-gradient(circle_at_54%_100%,rgba(110,231,183,0.08),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,18,17,0.82),rgba(3,9,8,0.42)_24%,rgba(2,6,5,0.96))]" />

        <header className="relative z-10 border-b border-emerald-400/18 px-6 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-4">
              <div>
                <div className="text-[13px] font-medium uppercase tracking-[0.26em] text-emerald-100/40">Graph Intelligence Workspace</div>
                <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.06em] text-white sm:text-[40px]">AtlasFlow Network Map</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">
                  Explore supplier topology, carbon intensity risk, and adjacency patterns in a focused graph workspace designed for rapid analysis.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="group flex h-12 min-w-[320px] flex-1 items-center gap-3 rounded-2xl border border-emerald-500/55 bg-white/[0.035] px-4 shadow-[0_12px_36px_rgba(0,0,0,0.24)] transition-colors focus-within:border-emerald-300/75 focus-within:bg-white/[0.05] xl:max-w-md">
                  <Search size={16} className="text-white/28" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search suppliers, category, region or notes"
                    className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/24"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/55 bg-white/[0.035] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
                  <button
                    type="button"
                    onClick={handleAutoLayout}
                    title="Auto-layout graph"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/58 transition-all hover:bg-white/6 hover:text-white"
                  >
                    <Wand2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLabels((current) => !current)}
                    title="Toggle labels"
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                      showLabels ? 'bg-emerald-400/14 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'text-white/58 hover:bg-white/6 hover:text-white',
                    )}
                  >
                    <CircleDot size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEdges((current) => !current)}
                    title="Toggle edge visibility"
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                      showEdges ? 'bg-emerald-400/14 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'text-white/58 hover:bg-white/6 hover:text-white',
                    )}
                  >
                    <Grid3X3 size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 xl:items-end">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([
                  { label: 'Suppliers', value: filteredNodes.length, detail: statusFilter },
                  { label: 'Connections', value: showEdges ? edges.length : 0, detail: showEdges ? 'Visible topology' : 'Edges hidden' },
                  { label: 'Avg intensity', value: averageIntensity, detail: `${highRiskCount} critical nodes` },
                  { label: 'Sync state', value: isPersisting ? 'Live' : hasPendingChanges ? 'Pending' : 'Saved', detail: loadError || 'Workspace in sync' },
                ]).map((item) => (
                  <div key={item.label} className="min-w-[132px] rounded-2xl border border-emerald-500/55 bg-white/[0.035] px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.18)]">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/32">{item.label}</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{item.value}</div>
                    <div className="mt-1 truncate text-xs text-white/38">{item.detail}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => void flushNow()}
                disabled={!hasPendingChanges || isPersisting}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#d8ff72] px-5 text-sm font-medium text-[#08110d] shadow-[0_16px_42px_rgba(216,255,114,0.24)] transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {isPersisting ? 'Saving changes' : 'Save network'}
              </button>
            </div>
          </div>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 gap-6 overflow-hidden px-6 py-6 sm:px-8">
          <aside className="hidden h-full w-[248px] shrink-0 overflow-y-auto pr-1 xl:flex xl:flex-col xl:gap-4">
            <div className="rounded-[24px] border border-emerald-500/55 bg-white/[0.035] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/38">
                <SlidersHorizontal size={14} />
                Graph controls
              </div>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <div className="flex items-center justify-between text-sm text-white/74">
                    <span>Spacing</span>
                    <span className="text-xs text-white/34">{spacing}px</span>
                  </div>
                  <input type="range" min="160" max="360" step="10" value={spacing} onChange={(event) => setSpacing(Number(event.target.value))} className="mt-3 w-full accent-emerald-300" />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between text-sm text-white/74">
                    <span>Edge emphasis</span>
                    <span className="text-xs text-white/34">{Math.round(connectionOpacity * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={connectionOpacity} onChange={(event) => setConnectionOpacity(Number(event.target.value))} className="mt-3 w-full accent-emerald-300" />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPhysicsEnabled((current) => !current)} className={cn('rounded-2xl px-3 py-2.5 text-sm transition-all', physicsEnabled ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'bg-white/[0.03] text-white/52 hover:bg-white/[0.05] hover:text-white')}>
                    Physics
                  </button>
                  <button onClick={() => setShowEdges((current) => !current)} className={cn('rounded-2xl px-3 py-2.5 text-sm transition-all', showEdges ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'bg-white/[0.03] text-white/52 hover:bg-white/[0.05] hover:text-white')}>
                    Edges
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-emerald-500/55 bg-white/[0.035] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/38">
                <Sparkles size={14} />
                Theme tones
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2">
                {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setThemeKey(key)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all',
                      themeKey === key ? 'bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'bg-white/[0.03] text-white/58 hover:bg-white/[0.05] hover:text-white',
                    )}
                  >
                    <div className="h-9 w-9 rounded-xl" style={{ background: `linear-gradient(135deg, ${THEMES[key].accent}, rgba(255,255,255,0.02))` }} />
                    <div>
                      <div className="text-sm font-medium capitalize">{key}</div>
                      <div className="text-xs text-white/34">Canvas atmosphere</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-emerald-500/55 bg-white/[0.035] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
              <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/38">Workspace state</div>
              <div className="mt-3 text-sm text-white/62">Suppliers, graph positions, and metadata share a single persisted workspace model.</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/26">Critical</div>
                  <div className="mt-1 text-xl font-semibold text-white">{highRiskCount}</div>
                </div>
                <div className="rounded-2xl bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/26">Watchlist</div>
                  <div className="mt-1 text-xl font-semibold text-white">{mediumRiskCount}</div>
                </div>
              </div>
              {loadError ? <div className="mt-4 rounded-2xl bg-rose-500/12 px-3 py-3 text-sm text-rose-100">{loadError}</div> : null}
            </div>

            <div className="rounded-[24px] border border-emerald-500/55 bg-white/[0.035] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
              <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/38">Network intelligence</div>
              <div className="mt-3 space-y-4">
                <div className="rounded-2xl bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/26">Highest-risk suppliers</div>
                  <div className="mt-3 space-y-2">
                    {insightSnapshot.highestRiskSuppliers.slice(0, 3).map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedNodeId(node.id)}
                        className="flex w-full items-center justify-between rounded-2xl bg-white/[0.03] px-3 py-2 text-left transition-all hover:bg-white/[0.06]"
                      >
                        <span className="text-sm text-white/82">{node.data.label}</span>
                        <span className="text-xs text-rose-200">{node.data.carbonIntensity} kgCO2e</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/26">Isolated suppliers</div>
                  <div className="mt-2 text-sm text-white/68">{insightSnapshot.isolatedSuppliers.length} suppliers currently sit outside the main dependency clusters.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {insightSnapshot.isolatedSuppliers.slice(0, 4).map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedNodeId(node.id)}
                        className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-white/72 transition-all hover:bg-white/[0.09]"
                      >
                        {node.data.label}
                      </button>
                    ))}
                    {insightSnapshot.isolatedSuppliers.length === 0 ? <span className="text-xs text-emerald-200/80">No isolated suppliers detected.</span> : null}
                  </div>
                </div>

                <div className="rounded-2xl bg-black/20 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/26">Top decarbonisation opportunities</div>
                  <div className="mt-3 space-y-3">
                    {insightSnapshot.topOpportunities.map((opportunity, index) => (
                      <div key={opportunity.nodeId} className="rounded-2xl bg-white/[0.03] px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-white">{index + 1}. {opportunity.label}</div>
                          <div className="text-xs text-[#d8ff72]">Save ${opportunity.annualSavings.toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-xs leading-5 text-white/54">{opportunity.rationale}</div>
                        <div className="mt-2 text-xs text-white/38">{opportunity.currentIntensity} to {opportunity.suggestedIntensity} kgCO2e • {opportunity.reduction} kgCO2e reduction</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="mb-4 flex items-center justify-between gap-4 rounded-[24px] border border-emerald-500/55 bg-white/[0.035] px-5 py-4 text-sm text-white/56 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="max-w-3xl leading-6">
                Drag nodes to reshape topology, connect suppliers directly on the canvas, and use the contextual inspector only when deeper metadata review is needed.
              </div>
              <div className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/36">
                {physicsEnabled ? 'Simulation active' : isDraggingNode ? 'Dragging node' : hasPendingChanges ? 'Pending save' : 'Saved'}
              </div>
            </div>

            <div className="relative min-h-0 flex-1 pb-24">
              <NodeGraph
                nodes={filteredNodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                showLabels={showLabels}
                showEdges={showEdges}
                connectionOpacity={connectionOpacity}
                theme={theme}
                onNodesChange={(nextFilteredNodes) => {
                  const nextMap = new Map(nextFilteredNodes.map((node) => [node.id, node]))
                  const nextNodes = allNodes.map((node) => nextMap.get(node.id) || node)
                  handleNodesChange(nextNodes)
                }}
                onEdgesChange={setEdges}
                onSelectNode={setSelectedNodeId}
                onNodeDragStart={(nodeId) => {
                  setIsDraggingNode(true)
                  setSelectedNodeId(nodeId)
                }}
                onNodeDragStop={(nextFilteredNodes) => {
                  setIsDraggingNode(false)
                  const nextMap = new Map(nextFilteredNodes.map((node) => [node.id, node]))
                  const nextNodes = allNodes.map((node) => nextMap.get(node.id) || node)
                  handleNodesChange(nextNodes)
                }}
              />

              <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
                <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-emerald-500/55 bg-[#07110f]/82 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <button type="button" onClick={handleAddNode} title="Add supplier" className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#d8ff72] text-[#08110d] transition-all hover:translate-y-[-1px]">
                    <Plus size={16} />
                  </button>
                  <button type="button" onClick={handleAutoLayout} title="Auto arrange" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/62 transition-all hover:bg-white/6 hover:text-white">
                    <Wand2 size={16} />
                  </button>
                  <button type="button" onClick={() => setPhysicsEnabled((current) => !current)} title="Toggle physics" className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all', physicsEnabled ? 'bg-white/[0.08] text-white' : 'text-white/62 hover:bg-white/6 hover:text-white')}>
                    <Sparkles size={16} />
                  </button>
                  <button type="button" onClick={() => void handleDeleteNode()} disabled={!selectedNode} title="Delete selected supplier" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/62 transition-all hover:bg-rose-500/12 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-5 bottom-5 z-20 flex flex-wrap items-end justify-between gap-4">
                <div className="pointer-events-auto max-w-full rounded-2xl border border-emerald-500/55 bg-[#07110f]/74 px-4 py-3 text-sm text-white/58 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/30">Exploration state</div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <span>{showEdges ? `${edges.length} active links` : 'Links hidden'}</span>
                    <span>{filteredNodes.length} visible suppliers</span>
                    <span>{themeKey} tone set</span>
                  </div>
                </div>

                <div className="pointer-events-none flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen((current) => !current)}
                    className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-2xl border border-emerald-500/55 bg-[#07110f]/82 px-4 text-sm text-white/70 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all hover:text-white"
                  >
                    {isInspectorOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    {isInspectorOpen ? 'Hide inspector' : 'Show inspector'}
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  'absolute right-5 top-5 z-30 h-[calc(100%-112px)] min-h-[420px] w-full max-w-[360px] overflow-hidden rounded-[28px] border border-emerald-500/55 bg-[linear-gradient(180deg,rgba(7,16,15,0.92),rgba(5,10,10,0.9))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition-all duration-300',
                  isInspectorOpen ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+32px)] opacity-0',
                )}
              >
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-white/30">Contextual inspector</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{selectedNode?.data.label || 'No node selected'}</div>
                      <div className="mt-2 text-sm text-white/46">
                        {selectedNode ? 'Read-only properties by default. Activate edit mode only when a data change is needed.' : 'Select any supplier node to inspect topology, metadata, and emissions context.'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedNode ? (
                        <button
                          type="button"
                          onClick={() => setIsInspectorEditing((current) => !current)}
                          className="inline-flex h-10 items-center rounded-xl bg-white/[0.06] px-3 text-sm text-white/72 transition-all hover:bg-white/[0.09] hover:text-white"
                        >
                          {isInspectorEditing ? 'Cancel edit' : 'Edit'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setIsInspectorOpen(false)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-all hover:bg-white/[0.06] hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {selectedNode ? (
                    <>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/28">Risk band</div>
                          <div className={cn('mt-2 flex items-center gap-2 text-sm font-medium', selectedRisk?.tone)}>
                            <span className={cn('h-2.5 w-2.5 rounded-full', selectedRisk?.dot)} />
                            {selectedRisk?.label}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/28">Connections</div>
                          <div className="mt-2 text-sm font-medium text-white">{selectedConnections}</div>
                        </div>
                        <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/28">Position</div>
                          <div className="mt-2 text-sm font-medium text-white">{`${Math.round(selectedNode.position.x)}, ${Math.round(selectedNode.position.y)}`}</div>
                        </div>
                        <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/28">Theme</div>
                          <div className="mt-2 text-sm font-medium capitalize text-white">{themeKey}</div>
                        </div>
                      </div>

                      {!isInspectorEditing ? (
                        <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                          {([
                            { label: 'Supplier name', value: selectedNode.data.label },
                            { label: 'Carbon intensity', value: `${selectedNode.data.carbonIntensity} kgCO2e` },
                            { label: 'Category', value: selectedNode.data.category || 'General' },
                            { label: 'Region', value: selectedNode.data.region || 'AU' },
                            { label: 'Notes', value: selectedNode.data.notes || 'No notes captured for this supplier yet.' },
                          ]).map((item) => (
                            <div key={item.label} className="rounded-2xl bg-white/[0.04] px-4 py-3.5">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-white/28">{item.label}</div>
                              <div className="mt-2 text-sm leading-6 text-white/78">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                          <label className="block">
                            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/28">Supplier name</div>
                            <input value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} className="h-10 w-full rounded-2xl bg-white/[0.05] px-4 text-sm text-white outline-none ring-1 ring-inset ring-emerald-400/24 transition-all focus:ring-emerald-300/40" />
                          </label>
                          <label className="block">
                            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/28">Carbon intensity</div>
                            <input type="number" value={draft.carbonIntensity} onChange={(event) => setDraft((current) => ({ ...current, carbonIntensity: Number(event.target.value) }))} className="h-10 w-full rounded-2xl bg-white/[0.05] px-4 text-sm text-white outline-none ring-1 ring-inset ring-emerald-400/24 transition-all focus:ring-emerald-300/40" />
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/28">Category</div>
                              <input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="h-10 w-full rounded-2xl bg-white/[0.05] px-4 text-sm text-white outline-none ring-1 ring-inset ring-emerald-400/24 transition-all focus:ring-emerald-300/40" />
                            </label>
                            <label className="block">
                              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/28">Region</div>
                              <input value={draft.region} onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))} className="h-10 w-full rounded-2xl bg-white/[0.05] px-4 text-sm text-white outline-none ring-1 ring-inset ring-emerald-400/24 transition-all focus:ring-emerald-300/40" />
                            </label>
                          </div>
                          <label className="block">
                            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/28">Notes</div>
                            <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={5} className="w-full rounded-[20px] bg-white/[0.05] px-4 py-3 text-sm leading-6 text-white outline-none ring-1 ring-inset ring-emerald-400/24 transition-all focus:ring-emerald-300/40" />
                          </label>
                          <button onClick={handleDraftSave} className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#d8ff72] px-4 text-sm font-medium text-[#08110d] shadow-[0_16px_42px_rgba(216,255,114,0.22)] transition-all hover:translate-y-[-1px]">
                            Save supplier details
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-6 flex flex-1 items-center justify-center">
                      <div className="w-full rounded-[24px] border border-dashed border-emerald-400/24 bg-white/[0.03] px-5 py-8 text-center">
                        <div className="text-base font-medium text-white">No supplier in focus</div>
                        <div className="mt-2 text-sm leading-6 text-white/44">
                          Click a node on the graph to inspect its metadata, position, risk profile, and relationship context.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
