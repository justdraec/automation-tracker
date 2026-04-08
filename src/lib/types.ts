export interface ProcessStep {
  id: string
  desc: string
  tool: string
  operation: string
  isAI: boolean
}

export interface AuthRequirement {
  tool: string
  auth: string
  status: string
}

export interface DataMapping {
  id: string
  source: string
  dest: string
  transform: string
}

export interface Dependency {
  id: string
  desc: string
  status: 'pending' | 'resolved' | 'blocked'
  owner: string
}

export type OpportunityStatus = 'pending-review' | 'not-started' | 'in-progress' | 'built' | 'on-hold'

export interface Opportunity {
  id: number
  _version: number
  status: OpportunityStatus
  category: string
  area: string
  owner: string
  pain: string
  minutes: string
  toolChips: string[]
  tools: string
  frequency: string
  freqValue: string
  desired: string
  clientTrigger: string
  clientInput: string
  clientSteps: string
  clientOutput: string
  metric: string
  timesaved: string
  triggerType: string
  trigger: string
  input: string
  output: string
  processSteps: ProcessStep[]
  steps: string
  errorNotify: string
  errorChannel: string
  errorRetry: string
  errorFallback: string
  error: string
  tool: string
  buildtime: string
  conditions: string
  volume: string
  ratelimit: string
  authData: AuthRequirement[]
  mappings: DataMapping[]
  impact: number
  urgency: number
  feasibility: number
  score: number
  aiType: string
  aiModel: string
  aiCreativity: string
  aiTask: string
  metricType: string
  priority: string
  dependencies: Dependency[]
  notes: string
  testing: string
  rollback: string
  approval: boolean
  approver: string
  maintainer: string
  reviewDate: string
  workflowId: string
  workflowUrl: string
  workflowPlatform: string
  deployedAt: string
  timestamp: string
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: Date
}

export interface ScoreWeights {
  impact: number
  urgency: number
  feasibility: number
}

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  'pending-review': 'Pending review',
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'built': 'Built',
  'on-hold': 'On hold',
}

export const STATUS_COLORS: Record<OpportunityStatus, string> = {
  'pending-review': 'bg-blue-50 text-blue-700 border-blue-300',
  'not-started': 'bg-gray-100 text-gray-600 border-gray-300',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-300',
  'built': 'bg-emerald-50 text-emerald-700 border-emerald-300',
  'on-hold': 'bg-red-50 text-red-700 border-red-300',
}

export function emptyOpportunity(): Opportunity {
  return {
    id: 0, // Supabase auto-generates the real ID on insert
    _version: 5,
    status: 'pending-review',
    category: '', area: '', owner: '', pain: '', minutes: '',
    toolChips: [], tools: '', frequency: '', freqValue: '',
    desired: '', clientTrigger: '', clientInput: '', clientSteps: '',
    clientOutput: '', metric: '', timesaved: '',
    triggerType: '', trigger: '', input: '', output: '',
    processSteps: [], steps: '',
    errorNotify: '', errorChannel: 'slack', errorRetry: '3', errorFallback: 'manual-queue',
    error: '', tool: 'n8n', buildtime: '',
    conditions: '', volume: '', ratelimit: '',
    authData: [], mappings: [],
    impact: 3, urgency: 3, feasibility: 3, score: 6.0,
    aiType: 'none', aiModel: '', aiCreativity: 'medium', aiTask: '',
    metricType: '', priority: 'medium',
    dependencies: [], notes: '',
    testing: 'manual', rollback: '', approval: false, approver: '',
    maintainer: '', reviewDate: '',
    workflowId: '', workflowUrl: '', workflowPlatform: '', deployedAt: '',
    timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }
}
