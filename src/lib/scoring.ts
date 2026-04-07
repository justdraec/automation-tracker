import type { ScoreWeights } from './types'

const DEFAULT_WEIGHTS: ScoreWeights = { impact: 0.4, urgency: 0.35, feasibility: 0.25 }

export function getWeights(): ScoreWeights {
  try {
    const saved = localStorage.getItem('yp-score-weights')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_WEIGHTS
}

export function calcScore(impact: number, urgency: number, feasibility: number, w?: ScoreWeights): number {
  const weights = w || getWeights()
  return parseFloat(((impact * weights.impact + urgency * weights.urgency + feasibility * weights.feasibility) / 5 * 10).toFixed(1))
}

export function getPriority(score: number): 'high' | 'medium' | 'low' {
  if (score >= 7.5) return 'high'
  if (score >= 5) return 'medium'
  return 'low'
}

export function getScoreColor(score: number): { bg: string; col: string } {
  if (score >= 7.5) return { bg: '#FCEBEB', col: '#A32D2D' }
  if (score >= 5) return { bg: '#FAEEDA', col: '#854F0B' }
  return { bg: '#EAF3DE', col: '#3B6D11' }
}

export function getScoreLabel(score: number): { label: string; desc: string } {
  if (score >= 7.5) return { label: 'High priority — build this first', desc: 'Strong impact, urgency, and feasibility.' }
  if (score >= 5) return { label: 'Medium priority — plan for this month', desc: 'Solid opportunity. Schedule after higher priorities.' }
  return { label: 'Low priority — revisit later', desc: 'Worth capturing but not urgent.' }
}

export const IMPACT_CAL = [
  '', 'Saves under 5 minutes per week', 'Saves 15-30 minutes per week',
  'Would save a noticeable amount of time each week', 'Saves several hours per week',
  'Game changer — saves 5+ hrs/week or eliminates critical errors'
]

export const URGENCY_CAL = [
  '', 'Nice to have, no deadline', 'Would help within 6 months',
  'Should do within a couple of months', 'Blocking work this month',
  'Causing daily pain — build now'
]

export const FEASIBILITY_CAL = [
  '', 'Research needed, unknown territory', 'Complex, multiple integrations needed',
  'Standard build, documented APIs available', 'Straightforward, just a few steps',
  'Simple, near-template solution'
]
