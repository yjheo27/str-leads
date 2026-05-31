const BASE = 'http://localhost:8080'

export type Lead = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  address: string | null
  strategy: 'Rent Arbitrage' | 'STR Management' | 'Unassigned'
  status: 'New' | 'Contacted' | 'No Answer'
  notes: string | null
  created_at: string
}

export async function scrapeLead(payload: { url?: string; raw_text?: string }): Promise<Lead> {
  const res = await fetch(`${BASE}/api/leads/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to scrape lead')
  }
  return res.json()
}

export async function getLeads(): Promise<Lead[]> {
  const res = await fetch(`${BASE}/api/leads`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to fetch leads')
  }
  return res.json()
}

export async function updateStatus(id: string, status: string): Promise<Lead> {
  const res = await fetch(`${BASE}/api/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update status')
  }
  return res.json()
}

export async function updateNotes(id: string, notes: string): Promise<Lead> {
  const res = await fetch(`${BASE}/api/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update notes')
  }
  return res.json()
}

export async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/leads/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete lead')
  }
}
