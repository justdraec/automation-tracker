import type { Opportunity } from './types'
import { getWeights } from './scoring'

const BUILD_HOURS: Record<string, number> = {
  'Less than 1 day': 6, '1-2 days': 12, '3-5 days': 30, '1-2 weeks': 60, 'More than 2 weeks': 120,
}

export function generateMarkdownPRD(e: Opportunity, rank: number): string {
  const w = getWeights()
  const hasAI = e.aiType && e.aiType !== 'none'
  const steps = e.processSteps || []
  const deps = e.dependencies || []
  const auths = e.authData || []
  const maps = e.mappings || []
  const ws = parseFloat(e.timesaved) || 0
  const bh = BUILD_HOURS[e.buildtime] || 0
  const payback = bh > 0 && ws > 0 ? `~${Math.ceil(bh / ws)} weeks` : 'N/A'
  const aiLabel: Record<string, string> = { content: 'Content generation', data: 'Data processing', decision: 'Decision making', multi: 'Multiple AI tasks' }

  let t = `# Workflow PRD: ${e.area}\n`
  t += `> Rank: #${rank} | Score: ${e.score}/10 | Priority: ${(e.priority || 'medium').toUpperCase()}${e.category ? ' | Category: ' + e.category : ''}\n\n---\n\n`
  t += `## Problem Statement\n${e.pain}\n\n`
  if (e.desired) t += `## Definition of Done\n${e.desired}\n\n`
  t += `## Workflow Details\n- **Owner:** ${e.owner || 'TBD'}\n- **Frequency:** ${e.frequency || 'TBD'}\n- **Tools:** ${e.tools || 'TBD'}\n- **Build tool:** ${e.tool}\n- **Build time:** ${e.buildtime || 'TBD'}\n`
  if (e.maintainer) t += `- **Maintainer:** ${e.maintainer}\n`
  if (e.reviewDate) t += `- **Review date:** ${e.reviewDate}\n`
  t += '\n---\n\n'

  if (deps.length || auths.length) {
    t += '## Prerequisites\n'
    auths.forEach(a => { t += `- [ ] ${a.tool}: ${a.auth} (${a.status === 'have' ? 'Ready' : 'Needs setup'})\n` })
    deps.forEach(d => { t += `- [${d.status === 'resolved' ? 'x' : ' '}] ${d.desc}${d.owner ? ' (' + d.owner + ')' : ''}\n` })
    t += '\n'
  }

  t += `## Technical Specification\n\n### Trigger\n**Type:** ${e.triggerType || 'TBD'}\n${e.trigger || e.clientTrigger || ''}\n\n`
  t += `### Input Data\n${e.input || e.clientInput || ''}\n\n### Process Steps\n`
  steps.forEach((s, i) => {
    t += `${i + 1}. ${s.desc}${s.tool ? ` **[${s.tool}]**` : ''}${s.operation ? ` (${s.operation})` : ''}${s.isAI ? ' *[AI]*' : ''}\n`
  })
  t += `\n### Output\n${e.output || e.clientOutput || ''}\n\n`

  if (steps.length) {
    t += '### Data Flow\n```\n'
    t += `Trigger (${e.triggerType || '?'})`
    steps.forEach(s => { t += ` -> ${(s.desc || '').slice(0, 30)}${s.tool ? ' [' + s.tool + ']' : ''}` })
    t += ' -> Output\n```\n\n'
  }

  if (e.conditions) t += `### Conditional Logic\n${e.conditions}\n\n`

  t += '### Error Handling\n'
  t += `- **Notify:** ${e.errorNotify || 'Team'} via ${e.errorChannel || 'Slack'}\n`
  t += `- **Retry:** ${e.errorRetry || 3} attempts\n`
  t += `- **Fallback:** ${e.errorFallback || 'Manual review'}\n\n`

  if (e.volume) t += `### Volume\nExpected: ${e.volume} per run${e.ratelimit ? ' | Rate limits: ' + e.ratelimit : ''}\n\n`

  if (hasAI) {
    t += '---\n\n## AI Components\n'
    t += `- **Type:** ${aiLabel[e.aiType] || ''}\n- **Model:** ${e.aiModel || 'TBD'}\n- **Creativity:** ${e.aiCreativity || 'Medium'}\n`
    if (e.aiTask) t += `- **Task:** ${e.aiTask}\n`
    t += '\n'
  }

  if (maps.length) {
    t += '## Data Mappings\n| Source | Destination | Transform |\n|---|---|---|\n'
    maps.forEach(m => { t += `| ${m.source} | ${m.dest} | ${m.transform} |\n` })
    t += '\n'
  }

  t += `---\n\n## Success Criteria\n**Type:** ${e.metricType || 'General'}\n${e.metric}\n\n`
  t += `## Testing Strategy\n**Approach:** ${e.testing || 'Manual test'}\n`
  if (e.rollback) t += `**Rollback:** ${e.rollback}\n`
  if (e.approval) t += `**Approval required:** Yes (${e.approver || 'TBD'})\n`
  t += '\n'

  if (ws > 0) {
    t += `## ROI Estimate\n- **Time saved:** ${ws} hrs/week (${Math.round(ws * 52)} hrs/year)\n- **Payback period:** ${payback}\n\n`
  }

  t += '## Scoring\n| Dimension | Weight | Score |\n|---|---|---|\n'
  t += `| Impact | ${Math.round(w.impact * 100)}% | ${e.impact}/5 |\n`
  t += `| Urgency | ${Math.round(w.urgency * 100)}% | ${e.urgency}/5 |\n`
  t += `| Feasibility | ${Math.round(w.feasibility * 100)}% | ${e.feasibility}/5 |\n`
  t += `| **Overall** | | **${e.score}/10** |\n\n`

  t += `---\n\n## Claude Code Instructions\n\nBuild in **${e.tool}**:\n\n`
  steps.forEach((s, i) => {
    t += `${i + 1}. ${s.desc}${s.tool ? ' using ' + s.tool : ''}${s.isAI ? ' (with AI)' : ''}\n`
  })
  t += '\n'
  if (hasAI) t += `AI: ${e.aiModel || 'Claude'} (${e.aiCreativity || 'medium'}) for: ${e.aiTask || aiLabel[e.aiType] || ''}.\n\n`
  t += `Error: Notify ${e.errorNotify || 'team'} via ${e.errorChannel || 'Slack'}. Retry ${e.errorRetry || 3}x.\n`
  t += `Success: ${e.metric}`
  return t
}

export function generatePlainPRD(e: Opportunity, rank: number): string {
  const steps = e.processSteps || []
  const hasAI = e.aiType && e.aiType !== 'none'
  const ws = parseFloat(e.timesaved) || 0
  const bh = BUILD_HOURS[e.buildtime] || 0
  const payback = bh > 0 && ws > 0 ? `~${Math.ceil(bh / ws)} weeks` : 'N/A'

  let t = `PRD: ${(e.area || '').toUpperCase()}\nRank #${rank} | Score ${e.score}/10 | ${(e.priority || 'medium').toUpperCase()}\n\n`
  t += `PROBLEM\n${e.pain}\n\n`
  if (e.desired) t += `DONE WHEN\n${e.desired}\n\n`
  t += `DETAILS\n  Owner: ${e.owner || 'TBD'} | Freq: ${e.frequency || 'TBD'} | Tool: ${e.tool}\n  Build: ${e.buildtime || 'TBD'}\n\n`
  t += `TRIGGER: ${e.triggerType || 'TBD'}\n${e.trigger || e.clientTrigger || ''}\n\n`
  t += `INPUT\n${e.input || e.clientInput || ''}\n\nSTEPS\n`
  steps.forEach((s, i) => { t += `${i + 1}. ${s.desc}${s.tool ? ' [' + s.tool + ']' : ''}${s.isAI ? ' [AI]' : ''}\n` })
  t += `\nOUTPUT\n${e.output || e.clientOutput || ''}\n\n`
  t += `ERROR: Notify ${e.errorNotify || 'team'} via ${e.errorChannel || 'Slack'}. Retry ${e.errorRetry || 3}x.\n\n`
  if (hasAI) t += `AI: ${e.aiModel || 'TBD'} for ${e.aiTask || ''}\n\n`
  t += `SUCCESS: ${e.metric}\n`
  if (ws > 0) t += `ROI: ${ws} hrs/week | Payback: ${payback}\n`
  return t
}
