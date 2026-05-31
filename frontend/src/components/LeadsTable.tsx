import { useState } from 'react'
import { Lead, updateStatus, updateNotes, deleteLead } from '../lib/api'

interface Props {
  leads: Lead[]
  onStatusChange: (id: string, status: string) => void
  onNotesChange: (id: string, notes: string | null) => void
  onDelete: (id: string) => void
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

function NotesCell({ lead, onSave }: { lead: Lead; onSave: (notes: string | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(lead.notes ?? '')

  function handleBlur() {
    setEditing(false)
    const trimmed = draft.trim()
    const next = trimmed === '' ? null : trimmed
    if (next !== lead.notes) onSave(next)
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        rows={2}
        style={{
          width: '100%', padding: '4px 6px', fontSize: '13px',
          borderRadius: '4px', border: '1px solid #6366f1',
          resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
    )
  }

  return (
    <div
      onClick={() => { setDraft(lead.notes ?? ''); setEditing(true) }}
      title="Click to edit"
      style={{
        minWidth: '120px', minHeight: '32px', padding: '4px 6px',
        fontSize: '13px', color: lead.notes ? '#111827' : '#9ca3af',
        cursor: 'text', borderRadius: '4px', border: '1px solid transparent',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#d1d5db')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
    >
      {lead.notes ?? 'Add note…'}
    </div>
  )
}

export default function LeadsTable({ leads, onStatusChange, onNotesChange, onDelete }: Props) {
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  async function handleStatusChange(id: string, status: string) {
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

  async function handleNotesSave(id: string, notes: string | null) {
    setUpdating(prev => new Set(prev).add(id))
    try {
      await updateNotes(id, notes ?? '')
      onNotesChange(id, notes)
    } catch {
      // silently ignore; local state unchanged
    } finally {
      setUpdating(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function handleDelete(id: string) {
    setDeleting(prev => new Set(prev).add(id))
    try {
      await deleteLead(id)
      onDelete(id)
    } catch {
      setDeleting(prev => { const s = new Set(prev); s.delete(id); return s })
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
            {['Name', 'Phone', 'Email', 'Address', 'Strategy', 'Status', 'Notes', 'Added', ''].map((col, i) => (
              <th key={i} style={th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => {
            const badge = strategyBadge[lead.strategy] ?? strategyBadge['Unassigned']
            const isBusy = updating.has(lead.id) || deleting.has(lead.id)
            const isDeleting = deleting.has(lead.id)
            return (
              <tr key={lead.id} style={{ borderBottom: '1px solid #e5e7eb', opacity: isBusy ? 0.45 : 1, transition: 'opacity 0.15s' }}>
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
                    disabled={isBusy}
                    onChange={e => handleStatusChange(lead.id, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', cursor: 'pointer' }}
                  >
                    <option>New</option>
                    <option>Contacted</option>
                    <option>No Answer</option>
                  </select>
                </td>
                <td style={{ ...td, minWidth: '160px' }}>
                  <NotesCell lead={lead} onSave={notes => handleNotesSave(lead.id, notes)} />
                </td>
                <td style={{ ...td, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(lead.created_at)}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <button
                    onClick={() => handleDelete(lead.id)}
                    disabled={isBusy}
                    title="Delete lead"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: isDeleting ? '#9ca3af' : '#ef4444',
                      fontSize: '16px', padding: '2px 6px', borderRadius: '4px',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
