import type { Opportunity } from './types'

interface N8NNodeDef { type: string; name: string }

export function mapTriggerToN8NNode(triggerType: string): N8NNodeDef {
  const map: Record<string, N8NNodeDef> = {
    'webhook': { type: 'n8n-nodes-base.webhook', name: 'Webhook Trigger' },
    'schedule': { type: 'n8n-nodes-base.scheduleTrigger', name: 'Schedule Trigger' },
    'form': { type: 'n8n-nodes-base.formTrigger', name: 'Form Trigger' },
    'new-record': { type: 'n8n-nodes-base.webhook', name: 'Record Webhook' },
    'email': { type: 'n8n-nodes-base.emailReadImap', name: 'Email Trigger' },
    'manual': { type: 'n8n-nodes-base.manualTrigger', name: 'Manual Trigger' },
    'api-event': { type: 'n8n-nodes-base.webhook', name: 'API Webhook' },
    'file-upload': { type: 'n8n-nodes-base.webhook', name: 'File Upload Webhook' },
  }
  return map[triggerType] || map['webhook']
}

export function mapToolToN8NNode(toolName: string): N8NNodeDef {
  const name = (toolName || '').toLowerCase()
  const map: Record<string, N8NNodeDef> = {
    'gmail': { type: 'n8n-nodes-base.gmail', name: 'Gmail' },
    'google sheets': { type: 'n8n-nodes-base.googleSheets', name: 'Google Sheets' },
    'sheets': { type: 'n8n-nodes-base.googleSheets', name: 'Google Sheets' },
    'slack': { type: 'n8n-nodes-base.slack', name: 'Slack' },
    'notion': { type: 'n8n-nodes-base.notion', name: 'Notion' },
    'airtable': { type: 'n8n-nodes-base.airtable', name: 'Airtable' },
    'stripe': { type: 'n8n-nodes-base.stripe', name: 'Stripe' },
    'hubspot': { type: 'n8n-nodes-base.hubspot', name: 'HubSpot' },
    'trello': { type: 'n8n-nodes-base.trello', name: 'Trello' },
    'asana': { type: 'n8n-nodes-base.asana', name: 'Asana' },
    'http': { type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request' },
    'ai': { type: '@n8n/n8n-nodes-langchain.openAi', name: 'AI (OpenAI)' },
    'claude': { type: '@n8n/n8n-nodes-langchain.anthropic', name: 'Claude AI' },
    'openai': { type: '@n8n/n8n-nodes-langchain.openAi', name: 'OpenAI' },
    'manual': { type: 'n8n-nodes-base.set', name: 'Set Data' },
    'custom code': { type: 'n8n-nodes-base.code', name: 'Code' },
  }
  return map[name] || { type: 'n8n-nodes-base.httpRequest', name: toolName || 'HTTP Request' }
}

export function buildN8NWorkflow(e: Opportunity) {
  const nodes: any[] = []
  const connections: Record<string, any> = {}
  let xPos = 250
  const yPos = 300
  const xStep = 250

  const triggerDef = mapTriggerToN8NNode(e.triggerType)
  nodes.push({
    id: String(Date.now()),
    name: triggerDef.name,
    type: triggerDef.type,
    typeVersion: 1,
    position: [xPos, yPos],
    parameters: {},
    notesInFlow: true,
    notes: 'Trigger: ' + (e.trigger || e.clientTrigger || ''),
  })
  xPos += xStep

  const steps = e.processSteps || []
  steps.forEach((s, i) => {
    let nodeDef: N8NNodeDef
    if (s.isAI) {
      const aiModel = (e.aiModel || '').toLowerCase()
      nodeDef = aiModel.includes('claude')
        ? { type: '@n8n/n8n-nodes-langchain.anthropic', name: 'Claude: ' + (s.desc || '').slice(0, 30) }
        : { type: '@n8n/n8n-nodes-langchain.openAi', name: 'AI: ' + (s.desc || '').slice(0, 30) }
    } else if (s.tool) {
      nodeDef = mapToolToN8NNode(s.tool)
      nodeDef = { ...nodeDef, name: nodeDef.name + ': ' + (s.operation || s.desc || '').slice(0, 25) }
    } else {
      nodeDef = { type: 'n8n-nodes-base.set', name: `Step ${i + 1}: ${(s.desc || '').slice(0, 25)}` }
    }
    nodes.push({
      id: String(Date.now() + i + 1),
      name: nodeDef.name,
      type: nodeDef.type,
      typeVersion: 1,
      position: [xPos, yPos],
      parameters: {},
      notesInFlow: true,
      notes: s.desc || '',
    })
    xPos += xStep
  })

  if (e.errorNotify && e.errorChannel) {
    const errType = e.errorChannel === 'slack' ? 'n8n-nodes-base.slack'
      : e.errorChannel === 'email' ? 'n8n-nodes-base.gmail'
      : 'n8n-nodes-base.httpRequest'
    nodes.push({
      id: String(Date.now() + 999),
      name: 'Error: Notify ' + e.errorNotify,
      type: errType,
      typeVersion: 1,
      position: [xPos, yPos + 200],
      parameters: {},
      notesInFlow: true,
      notes: 'Error handler: ' + (e.error || ''),
    })
  }

  for (let i = 0; i < nodes.length - 1; i++) {
    if (e.errorNotify && e.errorChannel && i === nodes.length - 2) break
    connections[nodes[i].name] = {
      main: [[{ node: nodes[i + 1].name, type: 'main', index: 0 }]],
    }
  }

  return {
    name: e.area + ' (Auto-generated)',
    nodes,
    connections,
    active: false,
    settings: { saveManualExecutions: true, executionOrder: 'v1' },
    tags: [{ name: 'automation-tracker' }],
  }
}

export function mapToolToMakeModule(toolName: string): string {
  const name = (toolName || '').toLowerCase()
  const map: Record<string, string> = {
    'gmail': 'google-email', 'google sheets': 'google-sheets', 'sheets': 'google-sheets',
    'slack': 'slack', 'notion': 'notion', 'airtable': 'airtable', 'stripe': 'stripe',
    'hubspot': 'hubspot', 'trello': 'trello', 'asana': 'asana',
    'ai': 'openai-gpt', 'claude': 'anthropic-claude', 'openai': 'openai-gpt',
  }
  return map[name] || 'http'
}

export function buildMakeBlueprint(e: Opportunity) {
  const modules: any[] = []
  const steps = e.processSteps || []

  const triggerModule: any = {
    id: 1,
    module: e.triggerType === 'schedule' ? 'builtin:BasicScheduler' : 'gateway:CustomWebHook',
    version: 1,
    metadata: { designer: { x: 0, y: 0 } },
    parameters: {},
    label: 'Trigger: ' + (e.trigger || e.clientTrigger || e.area),
  }
  modules.push(triggerModule)

  steps.forEach((s, i) => {
    let moduleName = s.tool ? mapToolToMakeModule(s.tool) : 'http'
    if (s.isAI) {
      const aiModel = (e.aiModel || '').toLowerCase()
      moduleName = aiModel.includes('claude') ? 'anthropic-claude' : 'openai-gpt'
    }
    modules.push({
      id: i + 2,
      module: moduleName + ':ActionModule',
      version: 1,
      metadata: { designer: { x: (i + 1) * 300, y: 0 } },
      parameters: {},
      label: s.desc || `Step ${i + 1}`,
    })
  })

  if (e.errorNotify) {
    modules.push({
      id: modules.length + 1,
      module: 'builtin:ErrorHandler',
      version: 1,
      metadata: { designer: { x: modules.length * 300, y: 150 } },
      parameters: {},
      label: 'Error: Notify ' + e.errorNotify,
    })
  }

  const routes: any[] = []
  for (let i = 0; i < modules.length - 1; i++) {
    if (e.errorNotify && i === modules.length - 2) break
    routes.push({ from: modules[i].id, to: modules[i + 1].id })
  }

  return {
    name: e.area + ' (Auto-generated)',
    blueprint: { version: 1, name: e.area, modules, routes, metadata: { version: 1, scenario: { roundtrips: 1, maxErrors: parseInt(e.errorRetry) || 3 } } },
    scheduling: { type: e.triggerType === 'schedule' ? 'interval' : 'immediately' },
    description: (e.pain || e.area).slice(0, 200),
  }
}

export function buildClaudePrompt(e: Opportunity): string {
  const steps = e.processSteps || []
  const hasAI = e.aiType && e.aiType !== 'none'
  let p = `Build a workflow in ${e.tool} for: "${e.area}"\n\n`
  p += `Trigger: ${e.triggerType || 'TBD'} - ${e.trigger || e.clientTrigger || ''}\n`
  p += `Input: ${e.input || e.clientInput || ''}\n\nSteps:\n`
  steps.forEach((s, i) => {
    p += `${i + 1}. ${s.desc}`
    if (s.tool) p += ` [${s.tool}]`
    if (s.operation) p += ` (${s.operation})`
    if (s.isAI) p += ' [AI]'
    p += '\n'
  })
  p += `\nOutput: ${e.output || e.clientOutput || ''}\n`
  p += `Error: Notify ${e.errorNotify || 'team'} via ${e.errorChannel || 'slack'}. Retry ${e.errorRetry || 3}x.\n`
  if (hasAI) p += `AI: ${e.aiModel || 'Claude'} for ${e.aiTask || 'see AI steps'}\n`
  p += `Success: ${e.metric}\n`
  return p
}
