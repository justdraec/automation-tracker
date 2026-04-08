import { useState, useRef, useEffect } from 'react'
import { callChatDiscovery } from '@/lib/supabase'
import type { ChatMessage, Opportunity } from '@/lib/types'
import { emptyOpportunity } from '@/lib/types'
import { calcScore, getPriority } from '@/lib/scoring'
import Icon from '@/components/Icon'

interface Props {
  onSubmit: (opp: Opportunity) => Promise<void>
  onNavigateToList?: () => void
}

interface WorkflowNode {
  id: string
  type: 'trigger' | 'filter' | 'input' | 'action' | 'output'
  label: string
  icon: string
  addedAt: number
}

const STEP_FIELDS = [
  { key: 'area', label: 'Task Name' },
  { key: 'owner', label: 'Owner' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'pain', label: 'Pain Point' },
  { key: 'minutes', label: 'Time per Task' },
  { key: 'tools', label: 'Tools Used' },
  { key: 'clientTrigger', label: 'Trigger' },
  { key: 'clientInput', label: 'Input Data' },
  { key: 'clientSteps', label: 'Process Steps' },
  { key: 'clientOutput', label: 'Output' },
  { key: 'desired', label: 'Desired State' },
  { key: 'metric', label: 'Success Metric' },
  { key: 'timesaved', label: 'Weekly Time' },
  { key: 'impact', label: 'Impact Score' },
  { key: 'urgency', label: 'Urgency Score' },
  { key: 'feasibility', label: 'Feasibility' },
]

function extractJSON(text: string): Record<string, string> | null {
  const fenced = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
  if (fenced) { try { return JSON.parse(fenced[1]) } catch { /* try next */ } }
  const bare = text.match(/\{[\s\S]*"complete"\s*:\s*true[\s\S]*\}/)
  if (bare) { try { return JSON.parse(bare[0]) } catch { /* give up */ } }
  return null
}

function parseSuggestions(reply: string): { cleanReply: string; chips: string[] } {
  const match = reply.match(/\nSUGGESTIONS:\s*(\[[\s\S]*?\])\s*$/)
  if (!match) return { cleanReply: reply, chips: [] }
  try {
    const parsed = JSON.parse(match[1])
    return {
      cleanReply: reply.replace(/\nSUGGESTIONS:[\s\S]*$/m, '').trim(),
      chips: Array.isArray(parsed) ? parsed.slice(0, 4) : [],
    }
  } catch { return { cleanReply: reply, chips: [] } }
}

function inferField(question: string): string | null {
  const q = question.toLowerCase()
  if (q.includes('trigger') || q.includes('kicks it off') || q.includes('starts the process')) return 'clientTrigger'
  if (q.includes('tool') || q.includes('software') || q.includes('platform') || q.includes('system') || q.includes('apps')) return 'tools'
  if (q.includes('step') || q.includes('how do you') || q.includes('walk me through')) return 'clientSteps'
  if (q.includes('output') || q.includes('result') || q.includes('what changes') || q.includes('end up with') || q.includes('created') || q.includes('sent')) return 'clientOutput'
  if (q.includes('metric') || q.includes('success') || q.includes('know it') || q.includes('working correctly')) return 'metric'
  if (q.includes('how often') || q.includes('frequency') || q.includes('how many times')) return 'frequency'
  if (q.includes('who') || q.includes('owner') || q.includes('team') || q.includes('department') || q.includes('handles')) return 'owner'
  if (q.includes('how long') || q.includes('how much time') || q.includes('minutes') || q.includes('hours per week')) return 'minutes'
  if (q.includes('urgent') || q.includes('priority') || q.includes('immediately') || q.includes('daily pain')) return 'urgency'
  if (q.includes('impact') || q.includes('difference') || q.includes('game-changer') || q.includes('how big')) return 'impact'
  if (q.includes('pain') || q.includes('frustrat') || q.includes('time-consuming')) return 'pain'
  if (q.includes('input') || q.includes('data you need') || q.includes('information') || q.includes('looking at') || q.includes('in front of you')) return 'clientInput'
  if (q.includes('ideal') || q.includes('automat') || q.includes('perfectly') || q.includes('desired')) return 'desired'
  if (q.includes('feasib') || q.includes('integrat') || q.includes('api') || q.includes('connection point') || q.includes('fully manual')) return 'feasibility'
  if (q.includes('name') || q.includes('short name') || q.includes('call this')) return 'area'
  if (q.includes('hours') || q.includes('week') || q.includes('time saved')) return 'timesaved'
  return null
}

function deriveNodes(data: Partial<Record<string, string>>): WorkflowNode[] {
  const nodes: WorkflowNode[] = []
  const now = Date.now()
  if (data.clientTrigger) nodes.push({ id: 'trigger', type: 'trigger', icon: 'play_circle', label: data.clientTrigger.slice(0, 28), addedAt: now })
  if (data.tools) {
    const combined = data.tools.split(',').map(t => t.trim()).filter(Boolean).join(' / ')
    nodes.push({ id: 'filter', type: 'filter', icon: 'account_tree', label: combined.length > 25 ? combined.slice(0, 22) + '...' : combined, addedAt: now + 2 })
  }
  if (data.clientInput) nodes.push({ id: 'input', type: 'input', icon: 'database', label: data.clientInput.slice(0, 25), addedAt: now + 5 })
  if (data.clientSteps) {
    const areaClean = (data.area || '').replace(/^automate\s+/i, '').slice(0, 20)
    nodes.push({ id: 'action', type: 'action', icon: 'hub', label: areaClean ? `Automate ${areaClean}` : 'Automation Action', addedAt: now + 10 })
  }
  if (data.clientOutput) nodes.push({ id: 'output', type: 'output', icon: 'output', label: data.clientOutput.slice(0, 25), addedAt: now + 20 })
  return nodes
}

const NODE_BORDER: Record<string, string> = { trigger: 'border-t-primary', filter: 'border-t-secondary', input: 'border-t-tertiary', action: 'border-t-tertiary-fixed-dim', output: 'border-t-green-500' }
const NODE_ICON_COLOR: Record<string, string> = { trigger: 'text-primary', filter: 'text-secondary', input: 'text-tertiary', action: 'text-on-tertiary-fixed-variant', output: 'text-[#008545]' }

export default function ChatDiscovery({ onSubmit, onNavigateToList }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null)
  const [completionData, setCompletionData] = useState<Record<string, string> | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [inputError, setInputError] = useState('')
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API has no TS types
  const recognitionRef = useRef<any>(null)
  const manualStopRef = useRef(false)
  const partialDataRef = useRef<Record<string, string>>({})

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { const text = ev.target?.result as string; setAttachedFile({ name: file.name, content: text.slice(0, 8000) }) }
    reader.readAsText(file)
    e.target.value = ''
  }

  const speechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => { if (!loading && messages.length > 0) setTimeout(() => inputRef.current?.focus(), 50) }, [loading, messages.length])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { return () => { manualStopRef.current = true; recognitionRef.current?.stop() } }, [])

  function toggleVoice(): void {
    if (listening) { manualStopRef.current = true; recognitionRef.current?.stop(); setListening(false); inputRef.current?.focus(); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API has no TS types
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return
    manualStopRef.current = false
    const recognition = new SpeechRecognition()
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US'
    let finalTranscript = ''
    recognition.onresult = (event: any) => { let interim = ''; for (let i = event.resultIndex; i < event.results.length; i++) { const t = event.results[i][0].transcript; if (event.results[i].isFinal) { finalTranscript += t + ' ' } else { interim = t } }; setInput((finalTranscript + interim).trim()) }
    recognition.onend = () => { if (!manualStopRef.current) { try { recognition.start() } catch { /* */ } } else { setListening(false) } }
    recognition.onerror = (event: any) => { if (event.error !== 'no-speech' && event.error !== 'aborted') setListening(false) }
    recognitionRef.current = recognition; recognition.start(); setListening(true)
  }

  function resetChat(): void {
    setMessages([]); setInput(''); setLoading(false); setListening(false); setWorkflowNodes([]); setEditingId(null); setEditText('')
    setShowConfirm(false); setCompletionData(null); setSuggestions([]); setSelectedChips([]); setIsMultiSelectMode(false); setInputError('')
    partialDataRef.current = {}; manualStopRef.current = true; recognitionRef.current?.stop()
  }

  // Derive step progress from actual field data
  const partialData = partialDataRef.current
  const stepProgress = STEP_FIELDS.map(s => ({ ...s, done: !!partialData[s.key] && partialData[s.key] !== '0' }))
  const completedSteps = stepProgress.filter(s => s.done)
  const currentActiveStep = stepProgress.find(s => !s.done)
  const accuracy = Math.min(Math.round((completedSteps.length / STEP_FIELDS.length) * 100), 100)

  const userMessageCount = messages.filter(m => m.role === 'user').length
  const sessionLimitReached = userMessageCount >= 40

  function handleAIResponse(reply: string, allMessages: ChatMessage[]): void {
    const json = extractJSON(reply)
    if (json && json.complete) {
      setCompletionData(json); setShowConfirm(true); setSuggestions([])
      // Update partialData from authoritative completion
      Object.assign(partialDataRef.current, json)
      setWorkflowNodes(deriveNodes(json))
    } else {
      const { chips } = parseSuggestions(reply)
      setSuggestions(chips)
      // Check if this is a tools question for multi-select mode
      const lastField = inferField(reply)
      setIsMultiSelectMode(lastField === 'tools' && chips.length > 0)
      setSelectedChips([])
      // Update workflow from conversation
      const firstUser = allMessages.find(m => m.role === 'user')
      if (firstUser) partialDataRef.current.area = firstUser.content.replace(/\[Attached file:[\s\S]*?\]/g, '').trim().slice(0, 40)
      setWorkflowNodes(deriveNodes(partialDataRef.current))
    }
  }

  async function doSend(overrideText?: string): Promise<void> {
    const text = (overrideText ?? input).trim()
    if (!text && !attachedFile) return
    if (loading) return
    setInputError('')
    if (text.length > 2000) { setInputError('Message too long — keep responses under 2000 characters.'); return }
    if (sessionLimitReached) return
    setSuggestions([]); setSelectedChips([]); setIsMultiSelectMode(false)

    let messageContent = text
    if (!overrideText && attachedFile) {
      messageContent = text
        ? `${text}\n\n---\n[Attached file: ${attachedFile.name}]\n${attachedFile.content}`
        : `[Attached file: ${attachedFile.name}]\nHere's a document about our workflow:\n\n${attachedFile.content}`
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: messageContent, timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages); setInput(''); setAttachedFile(null); setLoading(true)
    if (inputRef.current) inputRef.current.style.height = '28px'

    // Immediately map user answer to the field the AI last asked about
    const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAiMsg) {
      const field = inferField(lastAiMsg.content)
      if (field) { partialDataRef.current[field] = messageContent.slice(0, 100); setWorkflowNodes(deriveNodes(partialDataRef.current)) }
    }

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const reply = await callChatDiscovery(apiMessages)
      const { cleanReply } = parseSuggestions(reply)
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: cleanReply, timestamp: new Date() }
      const withReply = [...newMessages, assistantMsg]
      setMessages(withReply)
      handleAIResponse(reply, withReply)
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: "Sorry, I had trouble processing that. Could you try again?", timestamp: new Date() }])
    }
    setLoading(false)
  }

  async function editMessage(msgId: string, newContent: string): Promise<void> {
    setEditingId(null); setEditText(''); setShowConfirm(false); setCompletionData(null); setWorkflowNodes([]); setSuggestions([]); setSelectedChips([]); setIsMultiSelectMode(false)
    partialDataRef.current = {}
    const idx = messages.findIndex(m => m.id === msgId)
    if (idx === -1) return
    const editedMsg: ChatMessage = { ...messages[idx], content: newContent }
    const truncated = [...messages.slice(0, idx), editedMsg]
    setMessages(truncated); setLoading(true)
    try {
      const apiMessages = truncated.map(m => ({ role: m.role, content: m.content }))
      const reply = await callChatDiscovery(apiMessages)
      const { cleanReply } = parseSuggestions(reply)
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: cleanReply, timestamp: new Date() }
      const withReply = [...truncated, assistantMsg]
      setMessages(withReply); handleAIResponse(reply, withReply)
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: "Sorry, I had trouble processing that. Could you try again?", timestamp: new Date() }])
    }
    setLoading(false)
  }

  async function sendMessage(): Promise<void> { await doSend() }

  // Pre-fill input on chip click (not auto-send)
  function selectSuggestion(text: string): void {
    setInput(text); setSuggestions([])
    setTimeout(() => { inputRef.current?.focus(); const len = text.length; inputRef.current?.setSelectionRange(len, len) }, 0)
  }

  function toggleChip(chip: string): void {
    setSelectedChips(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip])
  }

  function confirmToolSelection(): void {
    const combined = selectedChips.join(', ')
    setSelectedChips([]); setIsMultiSelectMode(false)
    doSend(combined)
  }

  async function handleCompletion(data: Record<string, string>): Promise<void> {
    try {
      const opp = emptyOpportunity()
      opp.area = data.area || ''; opp.owner = data.owner || ''; opp.pain = data.pain || ''; opp.frequency = data.frequency || ''
      opp.freqValue = data.freqValue || ''; opp.minutes = data.minutes || ''; opp.tools = data.tools || ''
      opp.toolChips = (data.tools || '').split(',').map((t: string) => t.trim()).filter(Boolean)
      opp.clientTrigger = data.clientTrigger || ''; opp.clientInput = data.clientInput || ''; opp.clientSteps = data.clientSteps || ''
      opp.clientOutput = data.clientOutput || ''; opp.desired = data.desired || ''; opp.metric = data.metric || ''; opp.timesaved = data.timesaved || ''
      opp.input = data.clientInput || ''; opp.output = data.clientOutput || ''; opp.steps = data.clientSteps || ''
      const clamp = (v: number) => isNaN(v) || v < 1 || v > 5 ? 3 : v
      opp.impact = clamp(parseInt(String(data.impact))); opp.urgency = clamp(parseInt(String(data.urgency))); opp.feasibility = clamp(parseInt(String(data.feasibility)))
      opp.score = calcScore(opp.impact, opp.urgency, opp.feasibility); opp.priority = getPriority(opp.score)
      await onSubmit(opp)
      setTimeout(() => onNavigateToList?.(), 800)
    } catch (err) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Failed to save opportunity: ${String(err)}. Please try again.`, timestamp: new Date() }])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  const welcomeSuggestions = ['Automate invoice processing', 'Set up a lead alert', 'Build a weekly report', 'Sync data between apps', 'Automate client onboarding']

  // ── Welcome Screen ──
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
          <Icon name="forum" size={28} className="text-on-primary" />
        </div>
        <p className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2">Triggr Flow</p>
        <h2 className="text-2xl font-headline font-bold text-on-surface mb-8 tracking-tight">What would you like to automate?</h2>
        <div className="w-full max-w-[600px] relative bg-surface-container-lowestborder border-outline-variant/30 rounded-full flex items-center px-2 py-2 shadow-xl focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all mb-5">
          <input ref={fileInputRef} type="file" accept=".txt,.csv,.md,.json" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors rounded-full"><Icon name="attach_file" size={20} /></button>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Describe a task that takes too much time..." rows={1}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-3 placeholder:text-on-surface-variant/40 resize-none outline-none leading-relaxed" style={{ minHeight: '28px', maxHeight: '60px' }}
            onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = '28px'; t.style.height = Math.min(t.scrollHeight, 60) + 'px' }} />
          {speechSupported && (<button onClick={toggleVoice} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${listening ? 'bg-error text-on-error animate-pulse' : 'text-on-surface-variant hover:text-primary'}`}><Icon name={listening ? 'mic_off' : 'mic'} size={20} /></button>)}
          <button onClick={sendMessage} disabled={!input.trim() && !attachedFile} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${input.trim() || attachedFile ? 'bg-primary text-on-primary hover:bg-secondary' : 'bg-surface-container text-on-surface-variant/30'}`}><Icon name="arrow_upward" size={20} /></button>
        </div>
        {attachedFile && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary-fixed border border-primary-fixed-dim rounded-xl text-xs w-full max-w-[600px]">
            <Icon name="description" size={16} className="text-primary flex-shrink-0" /><span className="text-on-primary-fixed font-medium truncate flex-1">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-on-surface-variant hover:text-error"><Icon name="close" size={16} /></button>
          </div>
        )}
        <div className="flex flex-wrap gap-2 justify-center max-w-[600px]">
          {welcomeSuggestions.map(s => (<button key={s} onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 0) }}
            className="text-left p-3 px-4 rounded-2xl bg-surface-container-lowestborder border-outline-variant/20 hover:border-primary/40 hover:shadow-lg transition-all text-xs font-medium text-on-surface-variant">{s}</button>))}
        </div>
      </div>
    )
  }

  // ── Chat Interface ──
  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center"><Icon name="smart_toy" size={16} className="text-on-primary" /></div>
            <span className="text-xs font-semibold text-on-surface-variant">Discovery Assistant</span>
          </div>
          <button onClick={resetChat} className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/50 hover:text-on-surface-variant transition-colors px-2 py-1 rounded-lg hover:bg-surface-container">
            <Icon name="refresh" size={14} /> New conversation
          </button>
        </div>

        {/* Live Strategy Mapping */}
        <section className={`border-b border-outline-variant/10 workflow-dot bg-surface-container-low/30 relative overflow-x-auto overflow-y-hidden flex items-center px-12 shrink-0 transition-all ${workflowNodes.length > 0 ? 'h-[35%]' : 'h-[100px]'}`}>
          <div className="absolute top-4 left-6 flex items-center gap-3">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Live Strategy Mapping</span>
            {partialDataRef.current.area && <span className="text-xs font-headline font-bold text-on-surface ml-2">Mapping: {partialDataRef.current.area}</span>}
          </div>
          {workflowNodes.length > 0 ? (
            <div className="flex items-center gap-4 shrink-0 pt-6">
              {workflowNodes.map((node, i) => (
                <div key={node.id} className="flex items-center gap-4 node-enter">
                  <div className={`bg-surface-container-lowestp-3 rounded-xl shadow-sm border border-outline-variant/10 border-t-2 w-44 ${NODE_BORDER[node.type]}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name={node.icon} size={14} className={NODE_ICON_COLOR[node.type]} />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface/40">{node.type}</span>
                    </div>
                    <p className="text-xs font-semibold text-on-surface">{node.label}</p>
                  </div>
                  {i < workflowNodes.length - 1 && <span className="material-symbols-outlined text-outline-variant shrink-0">trending_flat</span>}
                </div>
              ))}
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-outline-variant shrink-0">trending_flat</span>
                <div className="bg-white/50 p-3 rounded-xl border border-dashed border-outline-variant/40 w-44">
                  <p className="text-[10px] text-center text-on-surface/30 italic py-2">Next step...</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant/40 italic pt-6">Workflow nodes will appear as the conversation progresses...</p>
          )}
        </section>

        {/* Chat messages */}
        <section className="flex-1 flex flex-col bg-surface overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
            <div className="max-w-4xl mx-auto space-y-10">
              {messages.map(msg => (
                <div key={msg.id} className="animate-fade-in">
                  {msg.role === 'assistant' ? (
                    <div className="flex gap-6">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary shadow-md">
                        <Icon name="smart_toy" size={20} />
                      </div>
                      <div className="space-y-4 max-w-2xl">
                        <div className="bg-surface-container-lowestborder border-outline-variant/10 rounded-2xl p-6 shadow-sm">
                          <p className="text-on-surface text-[15px] leading-relaxed">{msg.content.replace(/```json[\s\S]*?```/g, '').trim()}</p>
                        </div>
                      </div>
                    </div>
                  ) : editingId === msg.id ? (
                    <div className="flex flex-row-reverse gap-6">
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container text-xs font-bold flex items-center justify-center flex-shrink-0">U</div>
                      <div className="max-w-xl w-full">
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editMessage(msg.id, editText) }; if (e.key === 'Escape') { setEditingId(null); setEditText('') } }}
                          className="w-full p-4 rounded-2xl border-2 border-primary bg-surface-container-lowesttext-sm text-on-surface resize-none outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed" rows={3} />
                        <div className="flex gap-2 mt-2 justify-end">
                          <button onClick={() => editMessage(msg.id, editText)} className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-all">Save & resend</button>
                          <button onClick={() => { setEditingId(null); setEditText('') }} className="px-4 py-1.5 rounded-full border border-outline-variant text-on-surface-variant text-xs font-medium hover:bg-surface-container-low transition-colors">Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-row-reverse gap-6 group">
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container text-xs font-bold flex items-center justify-center flex-shrink-0">U</div>
                      <div className="relative">
                        <div className="bg-primary-container/10 border border-primary/10 p-5 rounded-2xl rounded-tr-none max-w-xl">
                          <p className="text-on-surface leading-relaxed">
                            {msg.content.includes('[Attached file:') ? (
                              <>{msg.content.split('\n---\n')[0] || 'Attached a document'}
                                <span className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-surface-container rounded-lg text-xs text-on-surface-variant">
                                  <Icon name="description" size={14} />{msg.content.match(/\[Attached file: (.+?)\]/)?.[1] || 'file'}
                                </span></>
                            ) : msg.content}
                          </p>
                        </div>
                        <button onClick={() => { setEditingId(msg.id); setEditText(msg.content.split('\n---\n')[0] || msg.content) }}
                          className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container" title="Edit this message">
                          <Icon name="edit" size={12} className="text-on-surface-variant" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-6 animate-fade-in">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary"><Icon name="psychology" size={20} /></div>
                  <div className="bg-surface-container-lowestborder border-outline-variant/10 rounded-2xl p-4 shadow-sm">
                    <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-on-surface-variant/30 typing-dot" /><div className="w-2 h-2 rounded-full bg-on-surface-variant/30 typing-dot" /><div className="w-2 h-2 rounded-full bg-on-surface-variant/30 typing-dot" /></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bottom section */}
          <div className="flex-shrink-0 border-t border-outline-variant/10">
            {/* Confirmation bar */}
            {showConfirm && completionData && (
              <div className="px-8 py-3 border-b border-outline-variant/10 animate-fade-in">
                <div className="max-w-4xl mx-auto p-4 bg-surface-container-lowestborder-2 border-primary rounded-2xl shadow-xl shadow-primary/15 flex items-center justify-between gap-4">
                  <div><p className="font-headline font-bold text-on-surface">Ready to save</p><p className="text-sm text-on-surface-variant mt-0.5">{completionData.area || 'New opportunity'}</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => { handleCompletion(completionData); setShowConfirm(false); setCompletionData(null) }} className="px-6 py-2.5 bg-primary text-on-primary rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">Save Opportunity</button>
                    <button onClick={() => { setShowConfirm(false); setCompletionData(null) }} className="px-4 py-2.5 rounded-full border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors text-sm">Keep editing</button>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestion chips */}
            {suggestions.length > 0 && !loading && (
              <div className="px-8 pt-3 pb-1">
                <div className="max-w-4xl mx-auto">
                  {isMultiSelectMode ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {suggestions.map(s => (
                          <button key={s} onClick={() => toggleChip(s)}
                            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${selectedChips.includes(s) ? 'bg-primary text-on-primary' : 'bg-surface-container-lowestborder border-outline-variant/30 text-on-surface hover:border-primary/40'}`}>{s}</button>
                        ))}
                      </div>
                      {selectedChips.length > 0 && (
                        <button onClick={confirmToolSelection} className="px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                          Confirm {selectedChips.length} tool{selectedChips.length > 1 ? 's' : ''}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {suggestions.map(s => (
                        <button key={s} onClick={() => selectSuggestion(s)}
                          className="text-left p-4 rounded-xl bg-surface-container-lowestborder border-outline-variant/30 hover:border-primary hover:shadow-md transition-all group">
                          <p className="font-bold text-on-surface text-sm group-hover:text-primary">{s}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="px-8 pb-6 pt-4">
              <div className="max-w-4xl mx-auto">
                {sessionLimitReached && (
                  <div className="flex items-center gap-2 mb-3 px-4 py-3 bg-tertiary-fixed border border-tertiary-fixed-dim rounded-xl text-sm text-on-tertiary-fixed font-medium animate-fade-in">
                    <Icon name="warning" size={18} className="text-tertiary flex-shrink-0" />Session limit reached. Save this opportunity or start a new conversation.
                  </div>
                )}
                {inputError && <p className="text-xs text-error font-medium mb-2 px-2">{inputError}</p>}
                {attachedFile && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-primary-fixed border border-primary-fixed-dim rounded-xl text-xs animate-fade-in">
                    <Icon name="description" size={16} className="text-primary flex-shrink-0" /><span className="text-on-primary-fixed font-medium truncate flex-1">{attachedFile.name}</span>
                    <span className="text-on-surface-variant/40">{(attachedFile.content.length / 1000).toFixed(1)}k</span>
                    <button onClick={() => setAttachedFile(null)} className="text-on-surface-variant/40 hover:text-error transition-colors"><Icon name="close" size={16} /></button>
                  </div>
                )}
                <div className={`relative bg-surface-container-lowestborder rounded-full flex items-center px-2 py-2 shadow-lg transition-all ${sessionLimitReached ? 'opacity-50 pointer-events-none border-outline-variant/20' : 'border-outline-variant/30 focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5'}`}>
                  <input ref={fileInputRef} type="file" accept=".txt,.csv,.md,.json" onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={loading || sessionLimitReached} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30 rounded-full"><Icon name="attach_file" size={20} /></button>
                  <textarea ref={inputRef} value={input} onChange={e => { setInput(e.target.value); setInputError('') }} onKeyDown={handleKeyDown}
                    placeholder={sessionLimitReached ? 'Session limit reached' : listening ? 'Listening...' : 'Ask a question or refine the logic...'} rows={1} disabled={loading || sessionLimitReached}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4 placeholder:text-on-surface-variant/40 resize-none outline-none disabled:opacity-50 leading-relaxed"
                    style={{ minHeight: '28px', maxHeight: '80px' }}
                    onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = '28px'; t.style.height = Math.min(t.scrollHeight, 80) + 'px' }} />
                  {speechSupported && (
                    <button onClick={toggleVoice} disabled={loading || sessionLimitReached} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all disabled:opacity-30 ${listening ? 'bg-error text-on-error animate-pulse' : 'text-on-surface-variant hover:text-primary'}`}>
                      <Icon name={listening ? 'mic_off' : 'mic'} size={20} />
                    </button>
                  )}
                  <button onClick={sendMessage} disabled={(!input.trim() && !attachedFile) || loading || sessionLimitReached}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md shadow-primary/20 ${(input.trim() || attachedFile) && !loading && !sessionLimitReached ? 'bg-primary text-on-primary hover:bg-secondary' : 'bg-surface-container text-on-surface-variant/30'}`}>
                    {loading ? <Icon name="progress_activity" size={20} className="icon-spin" /> : <Icon name="arrow_upward" size={20} />}
                  </button>
                </div>
                <div className="flex justify-center mt-3 opacity-50">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant flex items-center gap-1"><Icon name="keyboard" size={12} /> Press / for commands</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Right panel */}
      <aside className="w-[320px] bg-surface-container-lowestborder-l border-outline-variant/10 flex flex-col shrink-0">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-tight mb-1">Opportunity Discovery</h3>
          <p className="text-xs text-on-surface-variant">{partialDataRef.current.area || 'Mapping your workflow...'}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-surface-container-low rounded-xl p-4">
            <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mb-3">Model Accuracy</p>
            <span className="text-3xl font-black text-primary">{accuracy}%</span>
            <div className="mt-3 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${accuracy}%` }} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mb-3">Sequence Steps</p>
            <div className="space-y-1.5">
              {completedSteps.map(s => (
                <div key={s.label} className="flex items-center gap-2 node-enter">
                  <Icon name="check_circle" size={16} className="text-[#008545]" filled />
                  <span className="text-xs text-on-surface">{s.label}</span>
                </div>
              ))}
              {currentActiveStep && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-primary animate-pulse flex-shrink-0" />
                  <span className="text-xs font-semibold text-primary">{currentActiveStep.label}</span>
                </div>
              )}
            </div>
          </div>
          {showConfirm && completionData && (
            <div className="pt-6 border-t border-outline-variant/10">
              <button onClick={() => { handleCompletion(completionData); setShowConfirm(false); setCompletionData(null) }}
                className="w-full py-2.5 px-4 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <Icon name="bolt" size={16} /> Execute Current Flow
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
