import { supabase } from '../supabase/client'
import { ClientProfileRecord, FlowNode } from '../types'
import { calculateNodeMetrics } from '../utils/networkAnalytics'

export { calculateNodeMetrics } from '../utils/networkAnalytics'

export interface SupplyNodeRecord {
  id: string
  user_id: string
  label: string
  carbon_intensity: number
  position_x: number
  position_y: number
  category?: string | null
  region?: string | null
  notes?: string | null
  created_at?: string
}

export interface UserNodeSnapshot {
  userId: string
  email: string
  nodes: FlowNode[]
  totalEmissions: number
  averageIntensity: number
  highRiskCount: number
}

interface ClientIdentityRecord extends Pick<ClientProfileRecord, 'user_id' | 'email' | 'full_name' | 'customer_no'> { }

const DEFAULT_SAMPLE_NODES: FlowNode[] = [
  { id: 'node-1', type: 'supplier', position: { x: 40, y: 80 }, data: { label: 'Local Farm', carbonIntensity: 45, category: 'Agriculture', region: 'NSW', notes: 'Primary produce supplier with seasonal variance.' } },
  { id: 'node-2', type: 'supplier', position: { x: 320, y: 80 }, data: { label: 'Processing Plant', carbonIntensity: 120, category: 'Manufacturing', region: 'VIC', notes: 'Energy-intensive processing line under review.' } },
  { id: 'node-3', type: 'supplier', position: { x: 600, y: 80 }, data: { label: 'Distribution Hub', carbonIntensity: 65, category: 'Logistics', region: 'QLD', notes: 'Regional distribution and cold-chain transfer point.' } },
]

const resolveIdentityLabel = (
  userId: string,
  nodes: FlowNode[],
  currentUser: Awaited<ReturnType<typeof getCurrentUser>>,
  profile: ClientIdentityRecord | null,
) => {
  if (profile?.full_name?.trim()) {
    const displayName = profile.full_name.trim()
    const email = profile.email?.trim()
    return email ? `${displayName} (${email})` : `${displayName} (${profile.customer_no})`
  }

  if (currentUser?.id === userId && currentUser.email) return currentUser.email

  const metadataHints = nodes
    .flatMap((node) => [node.data.notes, node.data.label, node.data.category])
    .map((value) => value?.trim())
    .filter(Boolean) as string[]

  const explicitEmail = metadataHints.find((value) => value.includes('@'))
  if (explicitEmail) return explicitEmail

  const bestLabel = metadataHints.find((value) => value.length >= 4 && value.toLowerCase() !== 'general')
  if (bestLabel) return `${bestLabel} workspace`

  return `Client workspace ${userId.slice(0, 8)}`
}

async function loadClientIdentities(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, ClientIdentityRecord>()

  const { data, error } = await supabase
    .from('client_profiles')
    .select('user_id, email, full_name, customer_no')
    .in('user_id', userIds)

  if (error) {
    console.warn('Unable to load client identity records', error)
    return new Map<string, ClientIdentityRecord>()
  }

  return new Map((data || []).map((profile) => [profile.user_id, profile as ClientIdentityRecord]))
}

export const mapRowToFlowNode = (row: Partial<SupplyNodeRecord>): FlowNode => ({
  id: String(row.id || `node-${Date.now()}`),
  type: 'supplier',
  position: {
    x: Number(row.position_x) || 0,
    y: Number(row.position_y) || 0,
  },
  data: {
    label: row.label || 'Untitled supplier',
    carbonIntensity: Number(row.carbon_intensity) || 0,
    category: row.category || 'General',
    region: row.region || 'AU',
    notes: row.notes || '',
  },
})

export const mapNodeToRow = (node: FlowNode, userId: string): SupplyNodeRecord => ({
  id: node.id,
  user_id: userId,
  label: node.data.label,
  carbon_intensity: Number(node.data.carbonIntensity) || 0,
  position_x: Number(node.position.x) || 0,
  position_y: Number(node.position.y) || 0,
  category: node.data.category || 'General',
  region: node.data.region || 'AU',
  notes: node.data.notes || '',
})

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.warn('Unable to resolve current Supabase user', error)
    return null
  }

  return user
}

export async function loadCurrentUserNodes() {
  const user = await getCurrentUser()
  if (!user) return { user: null, nodes: [] as FlowNode[] }

  const { data, error } = await supabase
    .from('supply_nodes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) throw error

  return {
    user,
    nodes: (data || []).map((row) => mapRowToFlowNode(row as SupplyNodeRecord)),
  }
}

export async function saveNodesForUser(userId: string, nodes: FlowNode[]) {
  const payload = nodes.map((node) => mapNodeToRow(node, userId))
  const { error } = await supabase.from('supply_nodes').upsert(payload)
  if (error) throw error
}

export async function seedNodesForUser(userId: string, nodes: FlowNode[] = DEFAULT_SAMPLE_NODES) {
  await saveNodesForUser(userId, nodes)
  return nodes
}

export async function loadSystemNodeSnapshots() {
  const { data, error } = await supabase
    .from('supply_nodes')
    .select('id, user_id, label, carbon_intensity, position_x, position_y, category, region, notes, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  const grouped = new Map<string, FlowNode[]>()

  for (const row of (data || []) as SupplyNodeRecord[]) {
    const existing = grouped.get(row.user_id) || []
    existing.push(mapRowToFlowNode(row))
    grouped.set(row.user_id, existing)
  }

  if (grouped.size === 0) {
    return []
  }

  const authUser = await getCurrentUser()
  const identities = await loadClientIdentities(Array.from(grouped.keys()))

  return Array.from(grouped.entries()).map(([userId, nodes]) => {
    const metrics = calculateNodeMetrics(nodes)
    const email = resolveIdentityLabel(userId, nodes, authUser, identities.get(userId) || null)

    return {
      userId,
      email,
      nodes,
      ...metrics,
    } satisfies UserNodeSnapshot
  })
}
