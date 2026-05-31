import { useState } from 'react'
import { scrapeLead } from '../lib/api'

type Mode = 'url' | 'text'

interface Props {
  onSuccess: () => void
}

export default function InputPanel({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('url')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function switchMode(next: Mode) {
    setMode(next)
    setValue('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setLoading(true)
    setError(null)
    try {
      await scrapeLead(mode === 'url' ? { url: value } : { raw_text: value })
      setValue('')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const activeStyle: React.CSSProperties = {
    flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
    background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '14px',
  }
  const inactiveStyle: React.CSSProperties = {
    flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
    background: '#fff', color: '#374151', fontWeight: 400, fontSize: '14px',
  }

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
        Extract Lead
      </h2>

      <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
        <button type="button" onClick={() => switchMode('url')} style={mode === 'url' ? activeStyle : inactiveStyle}>
          Paste URL
        </button>
        <button type="button" onClick={() => switchMode('text')} style={{ ...(mode === 'text' ? activeStyle : inactiveStyle), borderLeft: '1px solid #d1d5db' }}>
          Paste Text
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'url' ? (
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%', padding: '10px', border: '1px solid #d1d5db',
              borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box',
              marginBottom: '12px', outline: 'none',
            }}
          />
        ) : (
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Paste raw listing text, email snippet, etc."
            rows={8}
            style={{
              width: '100%', padding: '10px', border: '1px solid #d1d5db',
              borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box',
              resize: 'vertical', marginBottom: '12px', outline: 'none',
            }}
          />
        )}

        <button
          type="submit"
          disabled={loading || !value.trim()}
          style={{
            width: '100%', padding: '10px', border: 'none', borderRadius: '6px',
            fontSize: '14px', fontWeight: 600, cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
            background: loading || !value.trim() ? '#93c5fd' : '#2563eb',
            color: '#fff',
          }}
        >
          {loading ? 'Extracting...' : 'Extract Lead'}
        </button>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '13px', margin: '10px 0 0' }}>{error}</p>
        )}
      </form>
    </div>
  )
}
