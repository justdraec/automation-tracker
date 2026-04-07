import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User } from 'lucide-react'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    } catch (err) {
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Hi! I'm here to help you capture an automation opportunity. What task or process would you like to automate? Just give it a short name to start.",
        timestamp: new Date(),
      }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const reply = await callChatDiscovery(apiMessages)

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      const updatedMessages = [...newMessages, assistantMsg]
      setMessages(updatedMessages)

      // Check if AI returned the completion JSON
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1])
          if (data.complete) {
            setTimeout(() => handleCompletion(data), 1500)
          }
        } catch {}
      }
    } catch (err) {
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

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-step1-bg border-2 border-step1-border flex items-center justify-center mb-6">
          <Bot className="w-8 h-8 text-step1" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Tell us about a task you want automated
        </h2>
        <p className="text-text-muted text-sm mb-8 max-w-md">
          Have a quick conversation with our assistant. It'll ask you simple questions
          one at a time — no forms to fill out, just chat naturally.
        </p>
        <button
          onClick={startChat}
          className="px-8 py-3 rounded-xl bg-step1 text-white font-semibold text-sm
                     hover:opacity-90 transition-opacity shadow-lg shadow-amber-200/50"
        >
          Start conversation
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-step1-bg border border-step1-border flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-step1" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'chat-bubble-user text-step1-text'
                  : 'chat-bubble-assistant text-text-primary'
              }`}
            >
              {msg.content.replace(/```json[\s\S]*?```/g, '').trim()}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-step2-bg border border-step2-border flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-step2" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-step1-bg border border-step1-border flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-step1" />
            </div>
            <div className="chat-bubble-assistant px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-text-hint typing-dot" />
                <div className="w-2 h-2 rounded-full bg-text-hint typing-dot" />
                <div className="w-2 h-2 rounded-full bg-text-hint typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-3 bg-app-surface">
        <div className="flex gap-3 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-border bg-app-bg px-4 py-3
                       text-sm text-text-primary placeholder:text-text-hint
                       focus:border-step1 focus:ring-2 focus:ring-step1/20 focus:outline-none
                       disabled:opacity-50 transition-all"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = '44px'
              target.style.height = target.scrollHeight + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-step1 text-white flex items-center justify-center
                       hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[11px] text-text-hint text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
