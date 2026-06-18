// AtlasFlow - Emissions calculator
// Basic maths only, easy to read

import { FlowNode } from '../types'

// --- Section: Main calculation function ---
// Adds up all the carbon from each supplier node
export function calculateTotalEmissions(nodes: FlowNode[]): number {
  let total = 0

  // Simple loop through each node
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    total += node.data.carbonIntensity
  }

  return Math.round(total * 100) / 100 // round to 2 decimals
}

// --- Section: Helper to update a single node ---
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