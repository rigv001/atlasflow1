// AtlasFlow - Type definitions
// Keep it simple so it's easy to follow

// --- Section: User and role types ---
export interface User {
  id: string
  email: string
  role: 'client' | 'admin'
}

// --- Section: Node for the flow graph ---
export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    carbonIntensity: number // kg CO2 per unit
    region?: string
    category?: string
    notes?: string
  }
}

// --- Section: Edge connecting nodes ---
export interface FlowEdge {
  id: string
  source: string
  target: string
}

// --- Section: Simulation result ---
export interface SimulationResult {
  totalEmissions: number
  nodes: FlowNode[]
}

export interface SavedScenario {
  id: string
  name: string
  createdAt: string
  notes: string
  nodes: FlowNode[]
}

export interface ProfileState {
  name: string
  customerNo: string
  site: string
  title: string
  team: string
  focusArea: string
  timezone: string
  avatar: string
}

export interface ClientProfileRecord {
  user_id: string
  email: string | null
  full_name: string
  customer_no: string
  site: string
  job_title: string
  team_name: string
  focus_area: string
  timezone: string
  avatar_emoji: string
  role: 'client' | 'admin'
  created_at?: string
  updated_at?: string
}