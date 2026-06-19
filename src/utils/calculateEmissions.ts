import { FlowNode } from '../types'

export function calculateTotalEmissions(nodes: FlowNode[]): number {
  let total = 0

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    total += node.data.carbonIntensity
  }

  return Math.round(total * 100) / 100
}

export function updateNodeEmissions(nodes: FlowNode[], nodeId: string, newIntensity: number): FlowNode[] {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return {
        ...node,
        data: {
          ...node.data,
          carbonIntensity: newIntensity
        }
      }
    }
    return node
  })
}