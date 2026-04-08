import { useState, useRef, useEffect } from 'react'
import { callChatDiscovery } from '@/lib/supabase'
import type { ChatMessage, Opportunity } from '@/lib/types'
import { emptyOpportunity } from '@/lib/types'
import { calcScore, getPriority } from '@/lib/scoring'
import Icon from '@/components/Icon'

interface Props {
  onSubmit: (opp: Opportunity) => void
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

export default function ChatDiscovery({ onSubmit }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null)
  const [completionData, setCompletionData] = useState<Record<string, string> | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API has no TS types
  const recognitionRef = useRef<any>(null)
  const manualStopRef = useRef(false)

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
    setCompletionData(null)
    setShowConfirm(false)
    manualStopRef.current = true
    recognitionRef.current?.stop()
  }

  async function doSend(messageContent: string): Promise<void> {
    if (!messageContent.trim() || loading) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: messageContent, timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setAttachedFile(null)
    setLoading(true)
    if (inputRef.current) inputRef.current.style.height = '28px'

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const reply = await callChatDiscovery(apiMessages)
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: new Date() }
      setMessages([...newMessages, assistantMsg])
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1])
          if (data.complete) { setCompletionData(data); setShowConfirm(true) }
        } catch { /* malformed JSON */ }
      }
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

  // Derive current discovery step from message count
  const currentStep = Math.min(Math.floor(messages.filter(m => m.role === 'user').length), DISCOVERY_STAGES.length - 1)
  const accuracy = completionData
    ? Math.round(Object.values(completionData).filter(v => v && v !== 'true').length / DISCOVERY_STAGES.length * 100)
    : Math.round(currentStep / DISCOVERY_STAGES.length * 100)

  const suggestions = [
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

        {/* Input */}
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
          <button
            onClick={sendMessage}
            disabled={!input.trim() && !attachedFile}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${input.trim() || attachedFile ? 'bg-primary text-on-primary hover:bg-secondary' : 'bg-surface-container text-on-surface-variant/30'}`}
          >
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
          {suggestions.map(s => (
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
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/10">
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
                ) : (
                  <div className="flex flex-row-reverse gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">U</div>
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

        {/* Confirmation */}
        {showConfirm && completionData && (
          <div className="mx-4 mb-3 animate-fade-in">
            <div className="bg-surface-container-low border-2 border-primary/20 rounded-2xl p-6 text-center space-y-4">
              <Icon name="task_alt" size={40} className="text-primary" filled />
              <h3 className="font-headline font-bold text-xl text-on-surface">Discovery Complete</h3>
              <p className="text-on-surface-variant text-sm">{completionData.area}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => { handleCompletion(completionData); setShowConfirm(false); setCompletionData(null) }}
                  className="flex-1 max-w-xs py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  Save Opportunity
                </button>
                <button
                  onClick={() => { setShowConfirm(false); setCompletionData(null) }}
                  className="px-5 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors"
                >
                  Keep editing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-outline-variant/10 bg-surface/80 backdrop-blur-sm">
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
              <button
                onClick={sendMessage}
                disabled={(!input.trim() && !attachedFile) || loading}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${(input.trim() || attachedFile) && !loading ? 'bg-primary text-on-primary hover:bg-secondary' : 'bg-surface-container text-on-surface-variant/30'}`}
              >
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

        {/* Model accuracy */}
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

        {/* Sequence steps */}
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

        {/* Execute CTA */}
        {showConfirm && completionData && (
          <div className="p-5 border-t border-outline-variant/10">
            <button
              onClick={() => { handleCompletion(completionData); setShowConfirm(false); setCompletionData(null) }}
              className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-sm"
            >
              Execute Current Flow
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
