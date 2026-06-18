import { FlowNode } from '../types'

export interface NodeMetrics {
  totalEmissions: number
  averageIntensity: number
  highRiskCount: number
}

export interface CategoryInsight {
  category: string
  supplierCount: number
  totalEmissions: number
  averageIntensity: number
}

export interface SupplierOpportunity {
  nodeId: string
  label: string
  category: string
  region: string
  currentIntensity: number
  suggestedIntensity: number
  reduction: number
  annualSavings: number
  rationale: string
}

export interface NetworkInsightSnapshot {
  metrics: NodeMetrics
  highestRiskSuppliers: FlowNode[]
  isolatedSuppliers: FlowNode[]
  clusters: Array<{ category: string; suppliers: FlowNode[]; totalEmissions: number }>
  categoryBreakdown: CategoryInsight[]
  topOpportunities: SupplierOpportunity[]
}

const HIGH_RISK_THRESHOLD = 100
const WATCHLIST_THRESHOLD = 60
const CARBON_COST_PER_UNIT = 42

export const calculateNodeMetrics = (nodes: FlowNode[]): NodeMetrics => {
  const totalEmissions = Math.round(nodes.reduce((sum, node) => sum + (Number(node.data.carbonIntensity) || 0), 0))
  const averageIntensity = nodes.length > 0 ? Math.round(totalEmissions / nodes.length) : 0
  const highRiskCount = nodes.filter((node) => (Number(node.data.carbonIntensity) || 0) > HIGH_RISK_THRESHOLD).length

  return {
    totalEmissions,
    averageIntensity,
    highRiskCount,
  }
}

export const buildSupplierConnections = (nodes: FlowNode[], spacing = 220) => {
  const links = new Map<string, Set<string>>()
  const categories = new Map<string, FlowNode[]>()
  const maxDistance = Math.max(180, spacing * 1.25)

  const connect = (source: string, target: string) => {
    if (source === target) return
    if (!links.has(source)) links.set(source, new Set())
    if (!links.has(target)) links.set(target, new Set())
    links.get(source)?.add(target)
    links.get(target)?.add(source)
  }

  nodes.forEach((node) => {
    links.set(node.id, links.get(node.id) || new Set())
    const key = node.data.category || 'General'
    const existing = categories.get(key) || []
    existing.push(node)
    categories.set(key, existing)
  })

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

  return links
}

export const getNetworkInsightSnapshot = (nodes: FlowNode[], spacing = 220): NetworkInsightSnapshot => {
  const metrics = calculateNodeMetrics(nodes)
  const connections = buildSupplierConnections(nodes, spacing)
  const highestRiskSuppliers = [...nodes]
    .sort((left, right) => right.data.carbonIntensity - left.data.carbonIntensity)
    .slice(0, 3)

  const isolatedSuppliers = nodes.filter((node) => (connections.get(node.id)?.size || 0) === 0)

  const categoryMap = new Map<string, FlowNode[]>()
  nodes.forEach((node) => {
    const category = node.data.category || 'General'
    const existing = categoryMap.get(category) || []
    existing.push(node)
    categoryMap.set(category, existing)
  })

  const clusters = Array.from(categoryMap.entries())
    .map(([category, suppliers]) => ({
      category,
      suppliers,
      totalEmissions: suppliers.reduce((sum, node) => sum + (Number(node.data.carbonIntensity) || 0), 0),
    }))
    .sort((left, right) => right.totalEmissions - left.totalEmissions)

  const categoryBreakdown = clusters.map((cluster) => ({
    category: cluster.category,
    supplierCount: cluster.suppliers.length,
    totalEmissions: Math.round(cluster.totalEmissions),
    averageIntensity: cluster.suppliers.length > 0 ? Math.round(cluster.totalEmissions / cluster.suppliers.length) : 0,
  }))

  const topOpportunities = [...nodes]
    .map((node) => {
      const currentIntensity = Number(node.data.carbonIntensity) || 0
      const suggestedIntensity = currentIntensity > HIGH_RISK_THRESHOLD
        ? Math.round(currentIntensity * 0.72)
        : currentIntensity > WATCHLIST_THRESHOLD
          ? Math.round(currentIntensity * 0.84)
          : Math.round(currentIntensity * 0.92)
      const reduction = Math.max(0, currentIntensity - suggestedIntensity)

      return {
        nodeId: node.id,
        label: node.data.label,
        category: node.data.category || 'General',
        region: node.data.region || 'AU',
        currentIntensity,
        suggestedIntensity,
        reduction,
        annualSavings: Math.round(reduction * CARBON_COST_PER_UNIT),
        rationale:
          currentIntensity > HIGH_RISK_THRESHOLD
            ? 'High-intensity supplier with enough reduction headroom to justify intervention this quarter.'
            : currentIntensity > WATCHLIST_THRESHOLD
              ? 'Moderate intensity with a realistic process-efficiency improvement path.'
              : 'Already efficient, but logistics and energy contracts could still unlock smaller gains.',
      }
    })
    .sort((left, right) => right.reduction - left.reduction)
    .slice(0, 3)

  return {
    metrics,
    highestRiskSuppliers,
    isolatedSuppliers,
    clusters,
    categoryBreakdown,
    topOpportunities,
  }
}

export const calculateScenarioCostImpact = (baseline: FlowNode[], simulated: FlowNode[]) => {
  const baselineMetrics = calculateNodeMetrics(baseline)
  const simulatedMetrics = calculateNodeMetrics(simulated)
  const emissionsDelta = simulatedMetrics.totalEmissions - baselineMetrics.totalEmissions
  const costDelta = Math.round(emissionsDelta * CARBON_COST_PER_UNIT)

  return {
    baselineMetrics,
    simulatedMetrics,
    emissionsDelta,
    costDelta,
  }
}
