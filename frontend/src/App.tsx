import { useEffect, useState } from 'react'
import { getLeads, Lead } from './lib/api'
import InputPanel from './components/InputPanel'
import LeadsTable from './components/LeadsTable'

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchLeads() {
    try {
      setLeads(await getLeads())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeads() }, [])

  function onSuccess() {
    fetchLeads()
  }

  function onStatusChange(id: string, status: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: status as Lead['status'] } : l))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        height: '56px', padding: '0 24px',
        display: 'flex', alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>STR Lead Engine</h1>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        <div style={{ width: '380px', flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb', overflowY: 'auto' }}>
          <InputPanel onSuccess={onSuccess} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading
            ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>Loading leads...</p>
            : <LeadsTable leads={leads} onStatusChange={onStatusChange} />
          }
        </div>
      </div>
    </div>
  )
}
