import { createClient } from '@supabase/supabase-js'
import type { Opportunity, ChatMessage } from './types'

const SUPABASE_URL = 'https://kfllhxifhuxzikhjudtr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbGxoeGlmaHV4emlraGp1ZHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MzY2ODYsImV4cCI6MjA5MTAxMjY4Nn0.CiKJlBBKs3zIsiIihy7Hj1fL0G22flWCl0267m6HVjk'

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
  const { error } = await supabase.from(TABLE).insert(entry)
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
