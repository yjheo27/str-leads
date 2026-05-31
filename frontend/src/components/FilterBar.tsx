import type { Lead } from '../lib/api'

interface Props {
  search: string
  strategy: string
  status: string
  count: number
  total: number
  onSearch: (v: string) => void
  onStrategy: (v: string) => void
  onStatus: (v: string) => void
  onExport: () => void
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '13px',
  outline: 'none',
  background: '#fff',
}

export default function FilterBar({ search, strategy, status, count, total, onSearch, onStrategy, onStatus, onExport }: Props) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Search name, phone, email, address..."
        value={search}
        onChange={e => onSearch(e.target.value)}
        style={{ ...inputStyle, flex: '1', minWidth: '180px' }}
      />

      <select value={strategy} onChange={e => onStrategy(e.target.value)} style={inputStyle}>
        <option value="">All strategies</option>
        <option>Rent Arbitrage</option>
        <option>STR Management</option>
        <option>Unassigned</option>
      </select>

      <select value={status} onChange={e => onStatus(e.target.value)} style={inputStyle}>
        <option value="">All statuses</option>
        <option>New</option>
        <option>Contacted</option>
        <option>No Answer</option>
      </select>

      <button
        onClick={onExport}
        disabled={count === 0}
        style={{
          ...inputStyle,
          cursor: count === 0 ? 'not-allowed' : 'pointer',
          background: count === 0 ? '#f3f4f6' : '#fff',
          color: count === 0 ? '#9ca3af' : '#374151',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        Export CSV
      </button>

      <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
        {count === total ? `${total} lead${total !== 1 ? 's' : ''}` : `${count} of ${total}`}
      </span>
    </div>
  )
}

export function exportCSV(leads: Lead[]) {
  const headers = ['Name', 'Phone', 'Email', 'Address', 'Strategy', 'Status', 'Added']
  const rows = leads.map(l => [
    l.name ?? '',
    l.phone ?? '',
    l.email ?? '',
    l.address ?? '',
    l.strategy,
    l.status,
    new Date(l.created_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }),
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'str-leads.csv'
  a.click()
  URL.revokeObjectURL(url)
}
