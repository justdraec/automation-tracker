import { useState, useRef, useEffect } from 'react'
import { callChatDiscovery } from '@/lib/supabase'
import type { ChatMessage, Opportunity } from '@/lib/types'
import { emptyOpportunity } from '@/lib/types'
import { calcScore, getPriority } from '@/lib/scoring'
import Icon from '@/components/Icon'

interface Props {
  onSubmit: (opp: Opportunity) => void
}

interface WorkflowNode {
  id: string
  type: 'trigger' | 'filter' | 'action' | 'output'
  label: string
  addedAt: number
}

// Discovery flow stages for the right panel
const DISCOVERY_STAGES = [
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

function inferField(question: string): string | null {
  const q = question.toLowerCase()
  if (q.includes('trigger') || q.includes('kicks it off') || q.includes('starts the process')) return 'clientTrigger'
  if (q.includes('tool') || q.includes('software') || q.includes('platform') || q.includes('system') || q.includes('apps')) return 'tools'
  if (q.includes('step') || q.includes('how do you') || q.includes('walk me through')) return 'clientSteps'
  if (q.includes('output') || q.includes('result') || q.includes('what changes') || q.includes('end up with') || q.includes('created') || q.includes('sent')) return 'output'
  if (q.includes('metric') || q.includes('success') || q.includes('know it') || q.includes('working correctly')) return 'metric'
  if (q.includes('how often') || q.includes('frequency') || q.includes('how many times')) return 'frequency'
  if (q.includes('who') || q.includes('owner') || q.includes('team') || q.includes('department') || q.includes('handles')) return 'owner'
  if (q.includes('how long') || q.includes('how much time') || q.includes('minutes') || q.includes('hours per week')) return 'minutes'
  if (q.includes('urgent') || q.includes('priority') || q.includes('immediately') || q.includes('daily pain')) return 'urgency'
  if (q.includes('impact') || q.includes('difference') || q.includes('game-changer') || q.includes('how big')) return 'impact'
  if (q.includes('pain') || q.includes('frustrat') || q.includes('time-consuming')) return 'pain'
  if (q.includes('input') || q.includes('data') || q.includes('information') || q.includes('looking at')) return 'clientInput'
  if (q.includes('ideal') || q.includes('automat') || q.includes('perfectly') || q.includes('desired')) return 'desired'
  if (q.includes('feasib') || q.includes('integrat') || q.includes('api') || q.includes('connection point')) return 'feasibility'
  if (q.includes('name') || q.includes('short name') || q.includes('call this')) return 'area'
  return null
}

function deriveNodes(data: Partial<Record<string, string>>): WorkflowNode[] {
  const nodes: WorkflowNode[] = []
  const now = Date.now()
  if (data.clientTrigger) nodes.push({ id: 'trigger', type: 'trigger', label: data.clientTrigger.slice(0, 30), addedAt: now })
  if (data.tools) {
    data.tools.split(',').slice(0, 2).forEach((tool, i) =>
      nodes.push({ id: `filter-${i}`, type: 'filter', label: tool.trim().slice(0, 20), addedAt: now + i })
    )
  }
  if (data.clientSteps) nodes.push({ id: 'action', type: 'action', label: data.area || 'Automation Action', addedAt: now + 10 })
  if (data.output || data.clientOutput) nodes.push({ id: 'output', type: 'output', label: (data.output || data.clientOutput || '').slice(0, 25), addedAt: now + 20 })
  return nodes
}

function generateSuggestions(aiMessage: string): string[] {
  const msg = aiMessage.toLowerCase()
  if (msg.includes('urgent') || msg.includes('priority') || msg.includes('immediately'))
    return ['Very urgent, needs fixing now', 'Medium priority, within the month', 'Low priority, nice to have']
  if (msg.includes('how often') || msg.includes('frequency') || msg.includes('how many times'))
    return ['Multiple times a day', 'Once a day', 'Weekly', 'Monthly']
  if (msg.includes('tool') || msg.includes('software') || msg.includes('platform') || msg.includes('apps'))
    return ['Google Workspace', 'Microsoft 365', 'HubSpot / CRM', 'Slack', 'Custom / Internal tool']
  if (msg.includes('how long') || msg.includes('how much time') || msg.includes('minutes'))
    return ['Less than 15 minutes', '15–30 minutes', '30–60 minutes', 'Over an hour']
  if (msg.includes('who') || msg.includes('team') || msg.includes('department'))
    return ['Just me', 'My whole team', 'Multiple departments', 'The whole company']
  if (msg.includes('trigger') || msg.includes('starts') || msg.includes('initiated') || msg.includes('kicks'))
    return ['New email arrives', 'Form submission', 'Calendar event', 'Manual trigger', 'New record in database']
  if (msg.includes('impact') || msg.includes('difference') || msg.includes('game-changer'))
    return ['Minor improvement', 'Moderate — saves noticeable time', 'Significant — frees up hours', 'Game changer for the team']
  if (msg.includes('automat') || msg.includes('ideal') || msg.includes('perfectly'))
    return ['Fully hands-off, no manual steps', 'Mostly automated with a quick review', 'Automated but I want approval before sending']
  if (msg.includes('output') || msg.includes('result') || msg.includes('done') || msg.includes('created'))
    return ['Record created in our system', 'Email/notification sent', 'Report generated', 'What happens when it fails?']
  if (msg.includes('step') || msg.includes('process') || msg.includes('walk me'))
    return ['I can list the steps', 'Are there edge cases to consider?', 'Someone needs to approve before it goes out']
  if (msg.includes('input') || msg.includes('data') || msg.includes('information'))
    return ['Spreadsheet or CSV', 'Email contents', 'Form submission data', 'Is any of this data sensitive?']
  if (msg.includes('pain') || msg.includes('frustrat') || msg.includes('time-consuming'))
    return ['It takes too long', 'Too many manual steps', 'Errors happen frequently', 'What do we do when it breaks?']
  if (msg.includes('success') || msg.includes('metric') || msg.includes('measure'))
    return ['Fewer errors', 'Faster turnaround', 'Hours saved per week', 'Does anyone need a log of what happened?']
  return []
}

export default function ChatDiscovery({ onSubmit }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null)
  const [completionData, setCompletionData] = useState<Record<string, string> | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [contextSuggestions, setContextSuggestions] = useState<string[]>([])
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API has no TS types
  const recognitionRef = useRef<any>(null)
  const manualStopRef = useRef(false)
  const collectedDataRef = useRef<Record<string, string>>({})

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setAttachedFile({ name: file.name, content: text.slice(0, 8000) })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [loading, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function toggleVoice(): void {
    if (listening) {
      manualStopRef.current = true
      recognitionRef.current?.stop()
      setListening(false)
      inputRef.current?.focus()
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API has no TS types
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return
    manualStopRef.current = false
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    let finalTranscript = ''
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) { finalTranscript += transcript + ' ' } else { interim = transcript }
      }
      setInput((finalTranscript + interim).trim())
    }
    recognition.onend = () => {
      if (!manualStopRef.current && listening) {
        try { recognition.start() } catch { /* browser may reject restart */ }
      } else { setListening(false) }
    }
    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') { setListening(false) }
    }
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function resetChat(): void {
    setMessages([])
    setInput('')
    setLoading(false)
    setListening(false)
    setWorkflowNodes([])
    setEditingId(null)
    setEditText('')
    setShowConfirm(false)
    setCompletionData(null)
    setContextSuggestions([])
    collectedDataRef.current = {}
    manualStopRef.current = true
    recognitionRef.current?.stop()
  }

  function updateWorkflowFromMessages(msgs: ChatMessage[]): void {
    const data: Record<string, string> = {}
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].role === 'user') {
        if (i === 0) {
          data.area = msgs[i].content.slice(0, 40)
          continue
        }
        const prevMsg = msgs[i - 1]
        if (prevMsg && prevMsg.role === 'assistant') {
          const field = inferField(prevMsg.content)
          if (field) data[field] = msgs[i].content.slice(0, 100)
        }
      }
    }
    collectedDataRef.current = data
    setWorkflowNodes(deriveNodes(data))
  }

  function handleAIResponse(reply: string, allMessages: ChatMessage[]): void {
    const data = extractJSON(reply)
    if (data && data.complete) {
      setCompletionData(data)
      setShowConfirm(true)
      setContextSuggestions([])
      setWorkflowNodes(deriveNodes(data))
    } else {
      setContextSuggestions(generateSuggestions(reply))
      updateWorkflowFromMessages(allMessages)
    }
  }

  async function doSend(messageContent: string): Promise<void> {
    if (!messageContent.trim() || loading) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: messageContent, timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setAttachedFile(null)
    setContextSuggestions([])
    setLoading(true)
    if (inputRef.current) inputRef.current.style.height = '28px'

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const reply = await callChatDiscovery(apiMessages)
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: new Date() }
      const withReply = [...newMessages, assistantMsg]
      setMessages(withReply)
      handleAIResponse(reply, withReply)
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: "Sorry, I had trouble processing that. Could you try again?", timestamp: new Date() }])
    }
    setLoading(false)
  }

  async function editMessage(msgId: string, newContent: string): Promise<void> {
    setEditingId(null)
    setEditText('')
    setShowConfirm(false)
    setCompletionData(null)
    setWorkflowNodes([])
    setContextSuggestions([])

    const idx = messages.findIndex(m => m.id === msgId)
    if (idx === -1) return

    const editedMsg: ChatMessage = { ...messages[idx], content: newContent }
    const truncated = [...messages.slice(0, idx), editedMsg]
    setMessages(truncated)
    setLoading(true)

    try {
      const apiMessages = truncated.map(m => ({ role: m.role, content: m.content }))
      const reply = await callChatDiscovery(apiMessages)
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: new Date() }
      const withReply = [...truncated, assistantMsg]
      setMessages(withReply)
      handleAIResponse(reply, withReply)
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: "Sorry, I had trouble processing that. Could you try again?", timestamp: new Date() }])
    }
    setLoading(false)
  }

  async function sendMessage(): Promise<void> {
    const text = input.trim()
    if (!text && !attachedFile) return
    let messageContent = text
    if (attachedFile) {
      messageContent = text
        ? `${text}\n\n---\n[Attached file: ${attachedFile.name}]\n${attachedFile.content}`
        : `[Attached file: ${attachedFile.name}]\nHere's a document about our workflow:\n\n${attachedFile.content}`
    }
    await doSend(messageContent)
  }

  function sendSuggestion(text: string): void { doSend(text) }

  function handleCompletion(data: Record<string, string>): void {
    const opp = emptyOpportunity()
    opp.area = data.area || ''
    opp.owner = data.owner || ''
    opp.pain = data.pain || ''
    opp.frequency = data.frequency || ''
    opp.freqValue = data.freqValue || ''
    opp.minutes = data.minutes || ''
    opp.tools = data.tools || ''
    opp.toolChips = (data.tools || '').split(',').map((t: string) => t.trim()).filter(Boolean)
    opp.clientTrigger = data.clientTrigger || ''
    opp.clientInput = data.clientInput || ''
    opp.clientSteps = data.clientSteps || ''
    opp.clientOutput = data.clientOutput || ''
    opp.desired = data.desired || ''
    opp.metric = data.metric || ''
    opp.timesaved = data.timesaved || ''
    opp.input = data.clientInput || ''
    opp.output = data.clientOutput || ''
    opp.steps = data.clientSteps || ''
    opp.impact = parseInt(String(data.impact)) || 3
    opp.urgency = parseInt(String(data.urgency)) || 3
    opp.feasibility = parseInt(String(data.feasibility)) || 3
    opp.score = calcScore(opp.impact, opp.urgency, opp.feasibility)
    opp.priority = getPriority(opp.score)
    onSubmit(opp)
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const currentStep = Math.min(Math.floor(messages.filter(m => m.role === 'user').length), DISCOVERY_STAGES.length - 1)
  const accuracy = completionData
    ? Math.round(Object.values(completionData).filter(v => v && v !== 'true').length / DISCOVERY_STAGES.length * 100)
    : Math.round(currentStep / DISCOVERY_STAGES.length * 100)

  const welcomeSuggestions = [
    'Automate invoice processing',
    'Set up a lead alert',
    'Build a weekly report',
    'Sync data between apps',
    'Automate client onboarding',
  ]

  // ── Welcome Screen ──
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
          <Icon name="forum" size={28} className="text-on-primary" />
        </div>
        <p className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2">Triggr Flow</p>
        <h2 className="text-2xl font-headline font-bold text-on-surface mb-8 tracking-tight">
          What would you like to automate?
        </h2>

        <div className="w-full max-w-[600px] relative bg-white border border-outline-variant/30 rounded-full flex items-center px-2 py-2 shadow-xl focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all mb-5">
          <input ref={fileInputRef} type="file" accept=".txt,.csv,.md,.doc,.docx,.pdf,.json,.xml,.html" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors rounded-full">
            <Icon name="attach_file" size={20} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a task that takes too much time..."
            rows={1}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-3 placeholder:text-on-surface-variant/40 resize-none outline-none leading-relaxed"
            style={{ minHeight: '28px', maxHeight: '60px' }}
            onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = '28px'; t.style.height = Math.min(t.scrollHeight, 60) + 'px' }}
          />
          {speechSupported && (
            <button onClick={toggleVoice} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${listening ? 'bg-error text-on-error animate-pulse' : 'text-on-surface-variant hover:text-primary'}`}>
              <Icon name={listening ? 'mic_off' : 'mic'} size={20} />
            </button>
          )}
          <button onClick={sendMessage} disabled={!input.trim() && !attachedFile}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${input.trim() || attachedFile ? 'bg-primary text-on-primary hover:bg-secondary' : 'bg-surface-container text-on-surface-variant/30'}`}>
            <Icon name="arrow_upward" size={20} />
          </button>
        </div>

        {attachedFile && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary-fixed border border-primary-fixed-dim rounded-xl text-xs w-full max-w-[600px]">
            <Icon name="description" size={16} className="text-primary flex-shrink-0" />
            <span className="text-on-primary-fixed font-medium truncate flex-1">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-on-surface-variant hover:text-error"><Icon name="close" size={16} /></button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center max-w-[600px]">
          {welcomeSuggestions.map(s => (
            <button key={s} onClick={() => sendSuggestion(s)}
              className="text-left p-3 px-4 rounded-2xl bg-white border border-outline-variant/20 hover:border-primary/40 hover:shadow-lg transition-all text-xs font-medium text-on-surface-variant">
              {s}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Chat Interface ──
  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
              <Icon name="smart_toy" size={16} className="text-on-primary" />
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">Discovery Assistant</span>
          </div>
          <button onClick={resetChat} className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/50 hover:text-on-surface-variant transition-colors px-2 py-1 rounded-lg hover:bg-surface-container">
            <Icon name="refresh" size={14} /> New conversation
          </button>
        </div>

        {/* Live Strategy Mapping panel */}
        {workflowNodes.length > 0 && (
          <div className="border-b border-outline-variant/10 bg-surface px-8 py-5 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block"></span>
              Live Strategy Mapping
            </p>
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {workflowNodes.map((node, i) => (
                <div key={node.id} className="flex items-center gap-0 node-enter">
                  <div className={`flex-shrink-0 px-4 py-3 rounded-xl border-t-2 bg-white shadow-sm min-w-[140px]
                    ${node.type === 'trigger' ? 'border-t-primary' : ''}
                    ${node.type === 'filter' ? 'border-t-secondary' : ''}
                    ${node.type === 'action' ? 'border-t-tertiary-fixed-dim' : ''}
                    ${node.type === 'output' ? 'border-t-green-500' : ''}
                    border border-outline-variant/10`}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-on-surface/30 mb-1">
                      {node.type}
                    </p>
                    <p className="text-xs font-bold text-on-surface leading-tight">{node.label}</p>
                  </div>
                  {i < workflowNodes.length - 1 && (
                    <div className="flex items-center px-2 shrink-0">
                      <div className="h-px w-6 bg-outline-variant/40"></div>
                      <span className="material-symbols-outlined text-[14px] text-outline-variant/60">arrow_forward</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
            {messages.map(msg => (
              <div key={msg.id} className="animate-fade-in">
                {msg.role === 'assistant' ? (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 mt-1 text-primary/30">
                      <Icon name="forum" size={24} />
                    </div>
                    <div className="flex-1 space-y-3 max-w-2xl text-[14px] leading-relaxed text-on-surface">
                      {msg.content.replace(/```json[\s\S]*?```/g, '').trim()}
                    </div>
                  </div>
                ) : editingId === msg.id ? (
                  /* Editing mode */
                  <div className="flex flex-row-reverse gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">U</div>
                    <div className="max-w-lg w-full">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editMessage(msg.id, editText) }
                          if (e.key === 'Escape') { setEditingId(null); setEditText('') }
                        }}
                        autoFocus
                        className="w-full p-4 rounded-2xl border-2 border-primary bg-white text-sm text-on-surface resize-none outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                        rows={3}
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => editMessage(msg.id, editText)}
                          className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-all">
                          Save & resend
                        </button>
                        <button onClick={() => { setEditingId(null); setEditText('') }}
                          className="px-4 py-1.5 rounded-full border border-outline-variant text-on-surface-variant text-xs font-medium hover:bg-surface-container-low transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Normal user message with edit-on-hover */
                  <div className="flex flex-row-reverse gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">U</div>
                    <div className="relative">
                      <div className="bg-primary text-on-primary p-4 rounded-3xl rounded-tr-none max-w-lg shadow-lg shadow-primary/15 text-[14px] leading-relaxed">
                        {msg.content.includes('[Attached file:') ? (
                          <>
                            {msg.content.split('\n---\n')[0] || 'Attached a document'}
                            <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-white/10 rounded-lg text-xs">
                              <Icon name="description" size={14} />
                              {msg.content.match(/\[Attached file: (.+?)\]/)?.[1] || 'file'}
                            </div>
                          </>
                        ) : msg.content}
                      </div>
                      <button
                        onClick={() => { setEditingId(msg.id); setEditText(msg.content.split('\n---\n')[0] || msg.content) }}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container"
                        title="Edit this message"
                      >
                        <Icon name="edit" size={12} className="text-on-surface-variant" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 animate-fade-in">
                <div className="flex-shrink-0 w-8 h-8 mt-1 text-primary/30">
                  <Icon name="forum" size={24} />
                </div>
                <div className="flex gap-1.5 pt-3">
                  <div className="w-2 h-2 rounded-full bg-on-surface-variant/30 typing-dot" />
                  <div className="w-2 h-2 rounded-full bg-on-surface-variant/30 typing-dot" />
                  <div className="w-2 h-2 rounded-full bg-on-surface-variant/30 typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Sticky confirmation bar */}
        {showConfirm && completionData && (
          <div className="sticky bottom-0 mx-6 mb-4 p-5 bg-white border-2 border-primary rounded-2xl shadow-xl shadow-primary/15 flex items-center justify-between gap-4 z-20 animate-fade-in">
            <div>
              <p className="font-headline font-bold text-on-surface">Ready to save</p>
              <p className="text-sm text-on-surface-variant mt-0.5">{completionData.area || 'New opportunity'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { handleCompletion(completionData); setShowConfirm(false); setCompletionData(null) }}
                className="px-6 py-2.5 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                Save Opportunity
              </button>
              <button onClick={() => { setShowConfirm(false); setCompletionData(null) }}
                className="px-4 py-2.5 rounded-full border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors text-sm">
                Keep editing
              </button>
            </div>
          </div>
        )}

        {/* Contextual suggestion chips */}
        {contextSuggestions.length > 0 && !loading && (
          <div className="flex flex-wrap gap-2 px-6 pb-3">
            {contextSuggestions.map(s => (
              <button key={s} onClick={() => sendSuggestion(s)}
                className="px-4 py-2 rounded-full bg-white border border-outline-variant/30 text-xs font-medium text-on-surface hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-outline-variant/10 bg-surface/80 backdrop-blur-sm shrink-0">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {attachedFile && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-primary-fixed border border-primary-fixed-dim rounded-xl text-xs animate-fade-in">
                <Icon name="description" size={16} className="text-primary flex-shrink-0" />
                <span className="text-on-primary-fixed font-medium truncate flex-1">{attachedFile.name}</span>
                <span className="text-on-surface-variant/40">{(attachedFile.content.length / 1000).toFixed(1)}k</span>
                <button onClick={() => setAttachedFile(null)} className="text-on-surface-variant/40 hover:text-error transition-colors"><Icon name="close" size={16} /></button>
              </div>
            )}
            <div className="relative bg-white border border-outline-variant/30 rounded-full flex items-center px-2 py-2 shadow-xl focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
              <input ref={fileInputRef} type="file" accept=".txt,.csv,.md,.doc,.docx,.pdf,.json,.xml,.html" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={loading} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30 rounded-full">
                <Icon name="attach_file" size={20} />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? 'Listening...' : 'Type your answer...'}
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-3 placeholder:text-on-surface-variant/40 resize-none outline-none disabled:opacity-50 leading-relaxed"
                style={{ minHeight: '28px', maxHeight: '80px' }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = '28px'; t.style.height = Math.min(t.scrollHeight, 80) + 'px' }}
              />
              {speechSupported && (
                <button onClick={toggleVoice} disabled={loading} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all disabled:opacity-30 ${listening ? 'bg-error text-on-error animate-pulse' : 'text-on-surface-variant hover:text-primary'}`}>
                  <Icon name={listening ? 'mic_off' : 'mic'} size={20} />
                </button>
              )}
              <button onClick={sendMessage} disabled={(!input.trim() && !attachedFile) || loading}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${(input.trim() || attachedFile) && !loading ? 'bg-primary text-on-primary hover:bg-secondary' : 'bg-surface-container text-on-surface-variant/30'}`}>
                {loading ? <Icon name="progress_activity" size={20} className="icon-spin" /> : <Icon name="arrow_upward" size={20} />}
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant/40 text-center mt-1.5">
              {listening ? 'Listening... click mic to stop' : 'Enter to send · Shift+Enter for new line'}
            </p>
          </div>
        </div>
      </div>

      {/* Right context panel */}
      <aside className="w-[300px] bg-white border-l border-outline-variant/10 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-outline-variant/10">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="explore" size={18} className="text-primary" />
            <h3 className="text-sm font-headline font-bold text-on-surface">Opportunity Discovery</h3>
          </div>
          <p className="text-xs text-on-surface-variant">{completionData?.area || 'Mapping your workflow...'}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] text-on-surface-variant/60">
              {showConfirm ? 'Discovery complete' : 'Capturing details...'}
            </span>
          </div>
        </div>

        <div className="p-5 border-b border-outline-variant/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3">Model Accuracy</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-headline font-extrabold text-on-surface">{accuracy}%</span>
            <span className="text-xs text-on-surface-variant pb-1">captured</span>
          </div>
          <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500" style={{ width: `${accuracy}%` }} />
          </div>
        </div>

        <div className="p-5 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3">Sequence Steps</p>
          <div className="space-y-1">
            {DISCOVERY_STAGES.map((stage, i) => {
              const isDone = i < currentStep
              const isCurrent = i === currentStep
              return (
                <div key={stage.key} className="flex items-center gap-2.5 py-1">
                  {isDone ? (
                    <Icon name="check_circle" size={16} className="text-[#008545]" filled />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary/10 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-outline-variant/30 flex-shrink-0" />
                  )}
                  <span className={`text-xs ${isDone ? 'text-on-surface-variant' : isCurrent ? 'text-primary font-semibold' : 'text-on-surface-variant/40'}`}>
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {showConfirm && completionData && (
          <div className="p-5 border-t border-outline-variant/10">
            <button onClick={() => { handleCompletion(completionData); setShowConfirm(false); setCompletionData(null) }}
              className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-sm">
              Execute Current Flow
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
