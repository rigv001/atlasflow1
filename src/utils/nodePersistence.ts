import { FlowNode } from '../types'
import { supabase } from '../supabase/client'

const buildBasePayload = (userId: string, node: FlowNode) => ({
  id: node.id,
  user_id: userId,
  label: node.data.label,
  carbon_intensity: node.data.carbonIntensity,
  position_x: node.position.x,
  position_y: node.position.y,
})

const buildExtendedPayload = (userId: string, node: FlowNode) => ({
  ...buildBasePayload(userId, node),
  category: node.data.category || 'General',
  region: node.data.region || 'AU',
  notes: node.data.notes || '',
})

const isMissingColumnError = (message: string) =>
  /column|schema cache|category|region|notes/i.test(message)

export async function saveNode(userId: string, node: FlowNode) {
  const extendedPayload = buildExtendedPayload(userId, node)
  let { error } = await supabase.from('supply_nodes').upsert(extendedPayload)

  if (!error) return

  if (!isMissingColumnError(error.message)) {
    throw error
  }

  const fallbackResult = await supabase.from('supply_nodes').upsert(buildBasePayload(userId, node))
  error = fallbackResult.error

  if (error) throw error
}

export async function deleteNode(userId: string, nodeId: string) {
  const { error } = await supabase.from('supply_nodes').delete().eq('id', nodeId).eq('user_id', userId)
  if (error) throw error
}

export async function saveNodeSet(userId: string, previousNodes: FlowNode[], nextNodes: FlowNode[]) {
  const previousIds = new Set(previousNodes.map((node) => node.id))
  const nextIds = new Set(nextNodes.map((node) => node.id))
  const removedIds = Array.from(previousIds).filter((id) => !nextIds.has(id))

  await Promise.all(nextNodes.map((node) => saveNode(userId, node)))
  await Promise.all(removedIds.map((nodeId) => deleteNode(userId, nodeId)))
}
