import { createClient } from '@supabase/supabase-js'
import type { Opportunity, ChatMessage } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TABLE = 'opportunities'

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('id', { ascending: false })
  if (error) throw error
  return (data || []) as Opportunity[]
}

export async function createOpportunity(entry: Opportunity): Promise<void> {
  const { id, ...payload } = entry // omit id — let Supabase auto-generate
  const { error } = await supabase.from(TABLE).insert(payload)
  if (error) throw error
}

export async function updateOpportunity(entry: Partial<Opportunity> & { id: number }): Promise<void> {
  const { error } = await supabase.from(TABLE).update(entry).eq('id', entry.id)
  if (error) throw error
}

export async function deleteOpportunity(id: number): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

export async function updateStatus(id: number, status: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id)
  if (error) throw error
}

export async function callChatDiscovery(
  messages: { role: string; content: string }[]
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('chat-discovery', {
    body: { messages },
  })
  if (error) throw error
  return data?.reply || 'Sorry, something went wrong.'
}
