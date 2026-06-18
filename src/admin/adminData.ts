import { FlowNode } from '../types'
import { calculateScenarioCostImpact } from '../utils/networkAnalytics'
import { calculateNodeMetrics, loadSystemNodeSnapshots } from '../services/supplyNodes'

export interface AdminSummary {
  clients: number
  suppliers: number
  totalEmissions: number
  averageIntensity: number
  highRiskCount: number
  criticalShare: number
  coverageScore: number
  flaggedRegions: string[]
}

export interface AdminClientInsight {
  userId: string
  email: string
  nodes: FlowNode[]
  totalEmissions: number
  averageIntensity: number
  highRiskCount: number
  complianceScore: number
  momentumLabel: string
  topCategory: string
  riskShare: number
  scenarioSavings: number
}

export interface AdminDataSnapshot {
  clients: AdminClientInsight[]
  summary: AdminSummary
}

const getMomentumLabel = (averageIntensity: number) => {
  if (averageIntensity <= 55) return 'Ahead of target'
  if (averageIntensity <= 90) return 'Needs intervention'
  return 'Escalate now'
}

const getComplianceScore = (nodes: FlowNode[]) => {
  if (nodes.length === 0) return 0
  const completeNodes = nodes.filter((node) => Boolean(node.data.category && node.data.region && node.data.notes !== undefined)).length
  return Math.round((completeNodes / nodes.length) * 100)
}

const getTopCategory = (nodes: FlowNode[]) => {
  const totals = new Map<string, number>()
  for (const node of nodes) {
    const category = node.data.category || 'General'
    totals.set(category, (totals.get(category) || 0) + node.data.carbonIntensity)
  }

  return Array.from(totals.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || 'General'
}

const getScenarioSavings = (nodes: FlowNode[]) => {
  const proposedNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      carbonIntensity: Math.max(0, Math.round(node.data.carbonIntensity * 0.84)),
    },
  }))

  return Math.abs(calculateScenarioCostImpact(nodes, proposedNodes).costDelta)
}

export async function loadAdminDataSnapshot(): Promise<AdminDataSnapshot> {
  const snapshots = await loadSystemNodeSnapshots()
  const clients: AdminClientInsight[] = snapshots.map((snapshot) => {
    const complianceScore = getComplianceScore(snapshot.nodes)
    const riskShare = snapshot.nodes.length === 0 ? 0 : Math.round((snapshot.highRiskCount / snapshot.nodes.length) * 100)

    return {
      ...snapshot,
      complianceScore,
      momentumLabel: getMomentumLabel(snapshot.averageIntensity),
      topCategory: getTopCategory(snapshot.nodes),
      riskShare,
      scenarioSavings: getScenarioSavings(snapshot.nodes),
    }
  })

  const allNodes = snapshots.flatMap((snapshot) => snapshot.nodes)
  const metrics = calculateNodeMetrics(allNodes)
  const regions = Array.from(new Set(allNodes.map((node) => node.data.region || 'AU')))
  const coverageScore = clients.length === 0 ? 0 : Math.round(clients.reduce((sum, client) => sum + client.complianceScore, 0) / clients.length)

  return {
    clients,
    summary: {
      clients: clients.length,
      suppliers: allNodes.length,
      totalEmissions: metrics.totalEmissions,
      averageIntensity: metrics.averageIntensity,
      highRiskCount: metrics.highRiskCount,
      criticalShare: allNodes.length === 0 ? 0 : Math.round((metrics.highRiskCount / allNodes.length) * 100),
      coverageScore,
      flaggedRegions: regions.slice(0, 5),
    },
  }
}

export const buildAdminEdges = (nodes: FlowNode[]) =>
  nodes.slice(1).map((node, index) => ({
    id: `admin-edge-${nodes[index].id}-${node.id}`,
    source: nodes[index].id,
    target: node.id,
  }))

export const buildClientNarrative = (client: AdminClientInsight | null) => {
  if (!client) return 'Select a client workspace to review operating risk, compliance coverage, and live simulation impact.'

  return `${client.email} is currently ${client.momentumLabel.toLowerCase()} with ${client.highRiskCount} critical suppliers and ${client.complianceScore}% data coverage.`
}
