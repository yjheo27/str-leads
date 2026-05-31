import { useState } from 'react'
import { Lead, updateStatus } from '../lib/api'

interface Props {
  leads: Lead[]
  onStatusChange: (id: string, status: string) => void
}

const strategyBadge: Record<string, React.CSSProperties> = {
  'Rent Arbitrage': { background: '#dcfce7', color: '#15803d' },
  'STR Management': { background: '#dbeafe', color: '#1d4ed8' },
  'Unassigned':     { background: '#f3f4f6', color: '#6b7280' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function LeadsTable({ leads, onStatusChange }: Props) {
  const [updating, setUpdating] = useState<Set<string>>(new Set())

  async function handleChange(id: string, status: string) {
    setUpdating(prev => new Set(prev).add(id))
    try {
      await updateStatus(id, status)
      onStatusChange(id, status)
    } catch {
      // revert is automatic — the prop value didn't change
    } finally {
      setUpdating(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  if (leads.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#9ca3af', fontSize: '14px' }}>
        No leads yet. Submit a URL or paste some text to get started.
      </div>
    )
  }

  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
    fontSize: '13px', color: '#374151', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = { padding: '10px 14px', fontSize: '14px', color: '#111827' }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
            {['Name', 'Phone', 'Email', 'Address', 'Strategy', 'Status', 'Added'].map(col => (
              <th key={col} style={th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => {
            const badge = strategyBadge[lead.strategy] ?? strategyBadge['Unassigned']
            const isUpdating = updating.has(lead.id)
            return (
              <tr key={lead.id} style={{ borderBottom: '1px solid #e5e7eb', opacity: isUpdating ? 0.45 : 1, transition: 'opacity 0.15s' }}>
                <td style={td}>{lead.name ?? '—'}</td>
                <td style={td}>{lead.phone ?? '—'}</td>
                <td style={td}>{lead.email ?? '—'}</td>
                <td style={{ ...td, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.address ?? '—'}
                </td>
                <td style={td}>
                  <span style={{ ...badge, padding: '3px 9px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {lead.strategy}
                  </span>
                </td>
                <td style={td}>
                  <select
                    value={lead.status}
                    disabled={isUpdating}
                    onChange={e => handleChange(lead.id, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', cursor: 'pointer' }}
                  >
                    <option>New</option>
                    <option>Contacted</option>
                    <option>No Answer</option>
                  </select>
                </td>
                <td style={{ ...td, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(lead.created_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
