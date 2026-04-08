import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, Mic, MicOff, RotateCcw, Paperclip, X, FileText } from 'lucide-react'
import { callChatDiscovery } from '@/lib/supabase'
import type { ChatMessage, Opportunity } from '@/lib/types'
import { emptyOpportunity } from '@/lib/types'

interface Props {
  onSubmit: (opp: Opportunity) => void
}

export default function ChatDiscovery({ onSubmit }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [listening, setListening] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null)
  const [completionData, setCompletionData] = useState<Record<string, string> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const manualStopRef = useRef(false)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Support text files, docs, PDFs (text extract), CSV, etc.
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setAttachedFile({ name: file.name, content: text.slice(0, 8000) }) // Limit to 8K chars
    }
    reader.readAsText(file)
    // Reset file input so same file can be re-selected
    e.target.value = ''
  }

  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Auto-focus textarea when loading finishes
  useEffect(() => {
    if (!loading && started) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [loading, started])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Voice input with continuous listening
  function toggleVoice() {
    if (listening) {
      manualStopRef.current = true
      recognitionRef.current?.stop()
      setListening(false)
      inputRef.current?.focus()
      return
    }

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
        // Browser stopped due to silence — restart automatically
        try { recognition.start() } catch {}
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

  async function startChat() {
    setStarted(true)
    setLoading(true)
    try {
      const reply = await callChatDiscovery([])
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }])
    } catch {
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Hi! I'm here to help you capture an automation opportunity. What task or process would you like to automate? Just give it a short name to start.",
        timestamp: new Date(),
      }])
    }
    setLoading(false)
  }

  function resetChat() {
    setMessages([])
    setInput('')
    setStarted(false)
    setLoading(false)
    setListening(false)
    manualStopRef.current = true
    recognitionRef.current?.stop()
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text && !attachedFile) return
    if (loading) return

    // Build message content: include file if attached
    let messageContent = text
    if (attachedFile) {
      messageContent = text
        ? `${text}\n\n---\n[Attached file: ${attachedFile.name}]\n${attachedFile.content}`
        : `[Attached file: ${attachedFile.name}]\nHere's a document about our workflow:\n\n${attachedFile.content}`
    }

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

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = '52px'

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const reply = await callChatDiscovery(apiMessages)

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      setMessages([...newMessages, assistantMsg])

      // Check if AI returned the completion JSON
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1])
          if (data.complete) {
            setCompletionData(data)
          }
        } catch {}
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

  function handleCompletion(data: Record<string, string>) {
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
    onSubmit(opp)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Welcome Screen ──────────────────────────────────────
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-amber-300/30">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">
          What would you like to automate?
        </h2>
        <p className="text-text-muted text-sm mb-10 max-w-lg leading-relaxed">
          Tell me about a task that takes too much time or effort.
          I'll ask a few questions to understand it, then we'll capture it as an automation opportunity.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={startChat}
            className="px-10 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm
                       hover:shadow-lg hover:shadow-amber-300/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Start conversation
          </button>
          <span className="text-[11px] text-text-hint">Takes about 2-3 minutes</span>
        </div>
      </div>
    )
  }

  // ── Chat Interface ──────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold text-text-muted">Discovery Assistant</span>
        </div>
        <button
          onClick={resetChat}
          className="flex items-center gap-1.5 text-[11px] text-text-hint hover:text-text-muted transition-colors px-2 py-1 rounded-lg hover:bg-app-bg"
        >
          <RotateCcw size={11} /> New conversation
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {messages.map(msg => (
            <div key={msg.id} className="animate-fade-in">
              {msg.role === 'assistant' ? (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 text-[14px] leading-relaxed text-text-primary pt-0.5">
                    {msg.content.replace(/```json[\s\S]*?```/g, '').trim()}
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-[#1c1917] dark:bg-[#2a2d4a] text-white rounded-2xl rounded-br-md px-4 py-3 text-[14px] leading-relaxed">
                    {msg.content.includes('[Attached file:') ? (
                      <>
                        {msg.content.split('\n---\n')[0] || 'Attached a document'}
                        <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-white/10 rounded-lg text-xs text-white/70">
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex gap-1.5 pt-2.5">
                <div className="w-2 h-2 rounded-full bg-text-hint/60 typing-dot" />
                <div className="w-2 h-2 rounded-full bg-text-hint/60 typing-dot" />
                <div className="w-2 h-2 rounded-full bg-text-hint/60 typing-dot" />
              </div>
            </div>
          )}
          {/* Completion confirmation card */}
          {completionData && (
            <div className="animate-fade-in max-w-2xl mx-auto">
              <div className="bg-step3-bg border-2 border-step3-border rounded-2xl p-5 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-step3 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-step3-text">Ready to save!</p>
                    <p className="text-xs text-text-muted">Review and confirm this opportunity</p>
                  </div>
                </div>
                <div className="bg-app-surface rounded-xl p-3 mb-3 text-xs space-y-1.5">
                  <p><span className="font-bold text-text-muted">Task:</span> {completionData.area}</p>
                  {completionData.owner && <p><span className="font-bold text-text-muted">Owner:</span> {completionData.owner}</p>}
                  {completionData.tools && <p><span className="font-bold text-text-muted">Tools:</span> {completionData.tools}</p>}
                  {completionData.frequency && <p><span className="font-bold text-text-muted">Frequency:</span> {completionData.frequency}</p>}
                  {completionData.timesaved && <p><span className="font-bold text-text-muted">Time saved:</span> {completionData.timesaved} hrs/week</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { handleCompletion(completionData); setCompletionData(null) }}
                    className="flex-1 py-2.5 rounded-xl bg-step3 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Save this opportunity
                  </button>
                  <button
                    onClick={() => setCompletionData(null)}
                    className="px-4 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:bg-app-bg transition-colors"
                  >
                    Continue chatting
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area — fixed bottom bar like ChatGPT */}
      <div className="border-t border-border/50 bg-app-surface/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Attached file preview */}
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-step2-bg border border-step2-border rounded-xl text-xs animate-fade-in">
              <FileText size={14} className="text-step2 flex-shrink-0" />
              <span className="text-step2-text font-medium truncate flex-1">{attachedFile.name}</span>
              <span className="text-step2-text/60">{(attachedFile.content.length / 1000).toFixed(1)}k chars</span>
              <button onClick={() => setAttachedFile(null)} className="text-step2-text/60 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 bg-app-bg border border-border rounded-2xl px-3 py-2 focus-within:border-text-muted/40 focus-within:shadow-sm transition-all">
            {/* File upload button */}
            <input ref={fileInputRef} type="file" accept=".txt,.csv,.md,.doc,.docx,.pdf,.json,.xml,.html" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-hint hover:text-text-muted hover:bg-app-surface transition-all disabled:opacity-30 flex-shrink-0"
              title="Attach a file (process doc, SOP, etc.)"
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
              className="flex-1 resize-none bg-transparent text-[14px] text-text-primary placeholder:text-text-hint
                         focus:outline-none disabled:opacity-50 py-1.5 leading-relaxed"
              style={{ minHeight: '28px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = '28px'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <div className="flex items-center gap-1 pb-0.5">
              {speechSupported && (
                <button
                  onClick={toggleVoice}
                  disabled={loading}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
                    ${listening
                      ? 'bg-red-500 text-white shadow-md shadow-red-300/40 animate-pulse'
                      : 'text-text-hint hover:text-text-muted hover:bg-app-surface'
                    } disabled:opacity-30`}
                  title={listening ? 'Stop listening' : 'Voice input'}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
                  ${input.trim() && !loading
                    ? 'bg-[#1c1917] dark:bg-white text-white dark:text-[#1c1917] shadow-sm hover:opacity-90'
                    : 'text-text-hint/40'
                  }`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-text-hint" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-text-hint/60 text-center mt-1.5">
            {listening ? 'Listening... click mic to stop' : 'Enter to send \u00b7 Shift+Enter for new line'}
          </p>
        </div>
      </div>
    </div>
  )
}
