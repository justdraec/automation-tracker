import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Mic, MicOff, RotateCcw, Paperclip, X, FileText } from 'lucide-react'
import { callChatDiscovery } from '@/lib/supabase'
import type { ChatMessage, Opportunity } from '@/lib/types'
import { emptyOpportunity } from '@/lib/types'
import { calcScore, getPriority } from '@/lib/scoring'

interface Props {
  onSubmit: (opp: Opportunity) => void
}

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

  // Auto-focus textarea when loading finishes
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [loading, messages.length])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Voice input with continuous listening
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
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interim = transcript
        }
      }
      setInput((finalTranscript + interim).trim())
    }

    recognition.onend = () => {
      if (!manualStopRef.current && listening) {
        try { recognition.start() } catch { /* browser may reject restart */ }
      } else {
        setListening(false)
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setListening(false)
      }
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

  // Core send logic — used by both sendMessage and sendSuggestion
  async function doSend(messageContent: string): Promise<void> {
    if (!messageContent.trim()) return
    if (loading) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setAttachedFile(null)
    setLoading(true)

    if (inputRef.current) inputRef.current.style.height = '28px'

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const reply = await callChatDiscovery(apiMessages)

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      const withReply = [...newMessages, assistantMsg]
      setMessages(withReply)

      // Check if AI returned the completion JSON
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1])
          if (data.complete) {
            setCompletionData(data)
            setShowConfirm(true)
          }
        } catch { /* malformed JSON — ignore */ }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I had trouble processing that. Could you try again?",
        timestamp: new Date(),
      }])
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

  function sendSuggestion(text: string): void {
    doSend(text)
  }

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
    // Map client workflow fields to technical fields as starting points
    opp.input = data.clientInput || ''
    opp.output = data.clientOutput || ''
    opp.steps = data.clientSteps || ''
    // Scores from AI assessment during discovery
    opp.impact = parseInt(String(data.impact)) || 3
    opp.urgency = parseInt(String(data.urgency)) || 3
    opp.feasibility = parseInt(String(data.feasibility)) || 3
    opp.score = calcScore(opp.impact, opp.urgency, opp.feasibility)
    opp.priority = getPriority(opp.score)
    onSubmit(opp)
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestions = [
    'Automate invoice processing',
    'Set up a lead alert',
    'Build a weekly report',
    'Sync data between apps',
    'Automate client onboarding',
  ]

  // ── Welcome Screen — input always visible ──────────────────
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-5">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <path d="M9 2L4 9h5l-2 5 7-8H9l2-5z" fill="white"/>
          </svg>
        </div>

        {/* Greeting */}
        <p className="text-xs font-medium text-text-hint uppercase tracking-widest mb-2">Triggr Flow</p>
        <h2 className="text-2xl font-medium text-text-primary mb-8 tracking-tight">
          What would you like to automate?
        </h2>

        {/* Input box */}
        <div className="w-full max-w-[600px] bg-app-surface border border-border rounded-2xl overflow-hidden mb-4">
          <div className="px-4 pt-4 pb-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a task that takes too much time..."
              rows={1}
              className="w-full resize-none bg-transparent text-sm text-text-primary placeholder:text-text-hint focus:outline-none leading-relaxed"
              style={{ minHeight: '28px', maxHeight: '120px' }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = '28px'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
          </div>
          <div className="flex items-center px-3 py-2 border-t border-border gap-2">
            <div className="flex gap-2 flex-1">
              <input ref={fileInputRef} type="file" accept=".txt,.csv,.md,.doc,.docx,.pdf,.json,.xml,.html" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:bg-app-bg transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Attach file
              </button>
              {speechSupported && (
                <button
                  onClick={toggleVoice}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors
                    ${listening
                      ? 'border-red-300 bg-red-50 text-red-600 animate-pulse'
                      : 'border-border text-text-muted hover:bg-app-bg'
                    }`}
                >
                  {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {listening ? 'Listening...' : 'Voice'}
                </button>
              )}
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() && !attachedFile}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                ${input.trim() || attachedFile
                  ? 'bg-accent hover:bg-accent-dark text-white'
                  : 'bg-app-bg text-text-hint'
                }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Attached file preview */}
        {attachedFile && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-step2-bg border border-step2-border rounded-xl text-xs w-full max-w-[600px]">
            <FileText className="w-3.5 h-3.5 text-step2 flex-shrink-0" />
            <span className="text-step2-text font-medium truncate flex-1">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-text-hint hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 justify-center max-w-[600px]">
          {suggestions.map(suggestion => (
            <button
              key={suggestion}
              onClick={() => sendSuggestion(suggestion)}
              className="px-4 py-2 rounded-full border border-border bg-app-surface text-xs font-medium text-text-muted hover:bg-step2-bg hover:border-step2-border hover:text-step2-text transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Chat Interface ──────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M9 2L4 9h5l-2 5 7-8H9l2-5z" fill="white"/>
            </svg>
          </div>
          <span className="text-xs font-medium text-text-muted">Discovery Assistant</span>
        </div>
        <button
          onClick={resetChat}
          className="flex items-center gap-1.5 text-[11px] text-text-hint hover:text-text-muted transition-colors px-2 py-1 rounded-lg hover:bg-app-bg"
        >
          <RotateCcw size={11} /> New conversation
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {messages.map(msg => (
            <div key={msg.id} className="animate-fade-in">
              {msg.role === 'assistant' ? (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M9 2L4 9h5l-2 5 7-8H9l2-5z" fill="white"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-[14px] leading-relaxed text-text-primary pt-0.5">
                    {msg.content.replace(/```json[\s\S]*?```/g, '').trim()}
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-[var(--user-bubble)] text-[var(--user-bubble-text)] rounded-2xl rounded-br-md px-4 py-3 text-[14px] leading-relaxed">
                    {msg.content.includes('[Attached file:') ? (
                      <>
                        {msg.content.split('\n---\n')[0] || 'Attached a document'}
                        <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-black/5 rounded-lg text-xs text-text-muted">
                          <FileText size={12} />
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
            <div className="flex gap-3 animate-fade-in">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M9 2L4 9h5l-2 5 7-8H9l2-5z" fill="white"/>
                </svg>
              </div>
              <div className="flex gap-1.5 pt-2.5">
                <div className="w-2 h-2 rounded-full bg-text-hint/60 typing-dot" />
                <div className="w-2 h-2 rounded-full bg-text-hint/60 typing-dot" />
                <div className="w-2 h-2 rounded-full bg-text-hint/60 typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Confirmation bar */}
      {showConfirm && completionData && (
        <div className="mx-4 mb-3 p-4 bg-step3-bg border border-step3-border rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
          <div>
            <p className="text-sm font-medium text-step3-text">Ready to save this opportunity</p>
            <p className="text-xs text-text-muted mt-0.5">{completionData.area}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { handleCompletion(completionData); setShowConfirm(false); setCompletionData(null) }}
              className="px-4 py-1.5 rounded-lg bg-step3 text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Save opportunity
            </button>
            <button
              onClick={() => { setShowConfirm(false); setCompletionData(null) }}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:bg-app-bg transition-colors"
            >
              Keep editing
            </button>
          </div>
        </div>
      )}

      {/* Input bar (chat mode) */}
      <div className="border-t border-border/50 bg-app-surface/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-step2-bg border border-step2-border rounded-xl text-xs animate-fade-in">
              <FileText size={14} className="text-step2 flex-shrink-0" />
              <span className="text-step2-text font-medium truncate flex-1">{attachedFile.name}</span>
              <span className="text-text-hint/60">{(attachedFile.content.length / 1000).toFixed(1)}k chars</span>
              <button onClick={() => setAttachedFile(null)} className="text-text-hint/60 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 bg-app-bg border border-border rounded-2xl px-3 py-2 focus-within:border-text-muted/40 transition-all">
            <input ref={fileInputRef} type="file" accept=".txt,.csv,.md,.doc,.docx,.pdf,.json,.xml,.html" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-hint hover:text-text-muted hover:bg-app-surface transition-all disabled:opacity-30 flex-shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={listening ? 'Listening...' : 'Type your answer...'}
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-[14px] text-text-primary placeholder:text-text-hint focus:outline-none disabled:opacity-50 py-1.5 leading-relaxed"
              style={{ minHeight: '28px', maxHeight: '120px' }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = '28px'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
            <div className="flex items-center gap-1 pb-0.5">
              {speechSupported && (
                <button
                  onClick={toggleVoice}
                  disabled={loading}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
                    ${listening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-text-hint hover:text-text-muted hover:bg-app-surface'
                    } disabled:opacity-30`}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={(!input.trim() && !attachedFile) || loading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
                  ${(input.trim() || attachedFile) && !loading
                    ? 'bg-accent hover:bg-accent-dark text-white'
                    : 'text-text-hint/40'
                  }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-text-hint" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-text-hint/60 text-center mt-1.5">
            {listening ? 'Listening... click mic to stop' : 'Enter to send · Shift+Enter for new line'}
          </p>
        </div>
      </div>
    </div>
  )
}
