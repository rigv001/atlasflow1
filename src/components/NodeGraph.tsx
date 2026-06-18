// AtlasFlow - Interactive node graph using React Flow
// Users can add supplier nodes and see the supply chain

import { memo, useCallback, useEffect, useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeProps,
  type OnConnect,
  type OnNodeDrag,
  Handle,
  Position,
} from '@xyflow/react'

import { FlowNode } from '../types'

export interface GraphEdge {
  id: string
  source: string
  target: string
}

export interface GraphTheme {
  canvasGlow: string
  panelTint: string
  grid: string
  accent: string
}

interface NodeGraphProps {
  nodes: FlowNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  showLabels: boolean
  showEdges: boolean
  connectionOpacity: number
  theme: GraphTheme
  onNodesChange: (nodes: FlowNode[]) => void
  onEdgesChange: (edges: GraphEdge[]) => void
  onSelectNode: (nodeId: string | null) => void
  onNodeDragStart?: (nodeId: string) => void
  onNodeDragStop?: (nodes: FlowNode[]) => void
}

const riskTone = (intensity: number) => {
  if (intensity < 60) return { ring: '#86efac', fill: 'rgba(74, 222, 128, 0.18)', glow: 'rgba(74, 222, 128, 0.24)', edge: 'rgba(134,239,172,0.74)', label: 'Low' }
  if (intensity <= 100) return { ring: '#fde68a', fill: 'rgba(251, 191, 36, 0.18)', glow: 'rgba(251, 191, 36, 0.24)', edge: 'rgba(253,230,138,0.74)', label: 'Medium' }
  return { ring: '#fda4af', fill: 'rgba(244, 114, 182, 0.18)', glow: 'rgba(244, 114, 182, 0.28)', edge: 'rgba(253,164,175,0.76)', label: 'High' }
}

const SupplierNode = memo(({ data, selected }: NodeProps) => {
  const tone = riskTone(Number(data.carbonIntensity) || 0)
  const showLabels = Boolean(data.showLabels)

  return (
    <div className="group relative flex flex-col items-center">
      {showLabels ? (
        <div className="mb-3 text-center transition-transform duration-200 group-hover:-translate-y-0.5">
          <div className="max-w-[160px] truncate text-[12px] font-semibold tracking-[0.01em] text-white/96">{String(data.label)}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/40">
            {tone.label} risk{data.region ? ` • ${String(data.region)}` : ''}
          </div>
        </div>
      ) : null}

      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 12, height: 12 }} />
      <div
        className="relative h-[96px] w-[96px] rounded-[28px] transition-all duration-200"
        style={{
          background: `radial-gradient(circle at 24% 22%, rgba(255,255,255,0.20), transparent 28%), linear-gradient(180deg, rgba(8,17,18,0.94), rgba(5,10,12,0.92))`,
          boxShadow: selected
            ? `0 0 0 2px rgba(34,197,94,0.72), 0 24px 60px rgba(0,0,0,0.38), 0 0 42px ${tone.glow}`
            : `0 18px 42px rgba(0,0,0,0.32), 0 0 24px ${tone.glow}`,
          transform: selected ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
        }}
      >
        <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-emerald-500/55" />
        <div className="absolute inset-[10px] rounded-[22px]" style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.06), ${tone.fill})` }} />
        <div className="absolute inset-[20px] rounded-[18px] bg-[#071010]/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
        <div className="absolute left-4 top-4 h-2.5 w-2.5 rounded-full" style={{ background: tone.ring, boxShadow: `0 0 16px ${tone.glow}` }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[22px] font-semibold tracking-[-0.04em] tabular-nums text-white">{Math.round(Number(data.carbonIntensity) || 0)}</div>
            <div className="text-[9px] uppercase tracking-[0.26em] text-white/34">kgCO2e</div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 12, height: 12 }} />
    </div>
  )
})

SupplierNode.displayName = 'SupplierNode'

const buildFlowNodes = (nodes: FlowNode[], showLabels: boolean): Node[] =>
  nodes.map((node) => ({
    id: node.id,
    type: 'supplier',
    position: node.position,
    draggable: true,
    selected: false,
    data: {
      ...node.data,
      showLabels,
    },
  }))

const buildFlowEdges = (edges: GraphEdge[], nodes: FlowNode[], opacity: number): Edge[] => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))

  return edges
    .filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target) && edge.source !== edge.target)
    .map((edge) => {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      const avgIntensity = ((source?.data.carbonIntensity || 0) + (target?.data.carbonIntensity || 0)) / 2
      const tone = riskTone(avgIntensity)

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: tone.edge,
          strokeWidth: 1.8,
          opacity,
          filter: `drop-shadow(0 0 8px ${tone.glow})`,
        },
      }
    })
}

export default function NodeGraph({
  nodes,
  edges,
  selectedNodeId,
  showLabels,
  showEdges,
  connectionOpacity,
  theme,
  onNodesChange,
  onEdgesChange,
  onSelectNode,
  onNodeDragStart,
  onNodeDragStop,
}: NodeGraphProps) {
  const nodeTypes = useMemo(() => ({ supplier: SupplierNode }), [])

  const flowNodes = useMemo(
    () => buildFlowNodes(nodes, showLabels).map((node) => ({ ...node, selected: node.id === selectedNodeId })),
    [nodes, selectedNodeId, showLabels],
  )
  const flowEdges = useMemo(
    () => (showEdges ? buildFlowEdges(edges, nodes, connectionOpacity) : []),
    [showEdges, edges, nodes, connectionOpacity],
  )

  const handleNodeChanges = useCallback(
    (changes: NodeChange[]) => {
      const positionChanges = changes.filter((change) => change.type === 'position')
      if (positionChanges.length === 0) return

      const positionMap = new Map(
        positionChanges
          .filter((change) => change.position)
          .map((change) => [change.id, change.position!] as const),
      )

      if (positionMap.size === 0) return

      const next = nodes.map((node) => {
        const nextPosition = positionMap.get(node.id)
        return nextPosition ? { ...node, position: nextPosition } : node
      })

      onNodesChange(next)
    },
    [nodes, onNodesChange],
  )

  const handleEdgeChanges = useCallback(
    (changes: EdgeChange[]) => {
      const updated = applyEdgeChanges(changes, flowEdges)
      onEdgesChange(updated.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })))
    },
    [flowEdges, onEdgesChange],
  )

  const handleConnect = useCallback<OnConnect>(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const nextEdges = addEdge(
        {
          id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
        },
        edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
      )
      onEdgesChange(nextEdges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })))
    },
    [edges, onEdgesChange],
  )

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      onSelectNode(node.id)
    },
    [onSelectNode],
  )

  const handleNodeDragStart = useCallback<OnNodeDrag<Node>>(
    (_event, node) => {
      onNodeDragStart?.(node.id)
    },
    [onNodeDragStart],
  )

  const handleNodeDragStop = useCallback<OnNodeDrag<Node>>(
    (_event, draggedNode) => {
      const nextNodes = nodes.map((node) =>
        node.id === draggedNode.id
          ? {
              ...node,
              position: draggedNode.position,
            }
          : node,
      )
      onNodeDragStop?.(nextNodes)
    },
    [nodes, onNodeDragStop],
  )

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      onSelectNode(null)
    }
  }, [nodes, onSelectNode, selectedNodeId])

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-[32px] border border-emerald-500/55 bg-[#04100e] shadow-[0_40px_120px_rgba(0,0,0,0.48)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 18%, ${theme.canvasGlow}, transparent 28%), radial-gradient(circle at 76% 20%, rgba(16,185,129,0.08), transparent 24%), radial-gradient(circle at 52% 78%, rgba(236,253,245,0.04), transparent 28%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(52,211,153,0.05),transparent_18%,transparent_80%,rgba(16,185,129,0.04))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(52,211,153,0.02)_1px,transparent_1px),linear-gradient(180deg,rgba(52,211,153,0.02)_1px,transparent_1px)] bg-[size:80px_80px] opacity-60" />

      {nodes.length === 0 ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
          <div className="max-w-md rounded-[28px] border border-emerald-400/24 bg-black/20 px-8 py-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/34">Graph canvas</div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">No suppliers in view</div>
            <div className="mt-3 text-sm leading-6 text-white/46">
              Create a supplier node or clear the current search to start exploring the network topology.
            </div>
          </div>
        </div>
      ) : null}

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodeChanges}
        onEdgesChange={handleEdgeChanges}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={() => onSelectNode(null)}
        fitView
        fitViewOptions={{ padding: 0.26 }}
        minZoom={0.35}
        maxZoom={1.8}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        onlyRenderVisibleElements
        elevateEdgesOnSelect={false}
        selectNodesOnDrag={false}
        panOnDrag={[1, 2]}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color={theme.grid} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => riskTone(Number(node.data?.carbonIntensity) || 0).ring}
          style={{
            background: 'rgba(5, 13, 12, 0.82)',
            border: '1px solid rgba(52,211,153,0.24)',
            borderRadius: 18,
            boxShadow: '0 18px 42px rgba(0,0,0,0.26)',
          }}
          maskColor="rgba(2, 8, 8, 0.58)"
          position="bottom-left"
          offsetScale={24}
        />
        <Controls
          showInteractive={false}
          position="top-right"
          style={{
            background: 'rgba(5, 13, 12, 0.82)',
            border: '1px solid rgba(52,211,153,0.24)',
            borderRadius: 18,
            boxShadow: '0 18px 42px rgba(0,0,0,0.26)',
          }}
        />
      </ReactFlow>
    </div>
  )
}