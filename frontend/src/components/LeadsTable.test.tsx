import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LeadsTable from './LeadsTable'
import type { Lead } from '../lib/api'

vi.mock('../lib/api', () => ({
  updateStatus: vi.fn().mockResolvedValue({}),
}))

const makeLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'abc-123',
  name: 'Jane Smith',
  phone: '305-555-0192',
  email: 'jane@example.com',
  address: '1234 Ocean Dr, Miami Beach, FL',
  strategy: 'STR Management',
  status: 'New',
  created_at: '2026-05-31T00:00:00Z',
  ...overrides,
})

describe('LeadsTable', () => {
  it('shows empty state message when leads array is empty', () => {
    render(<LeadsTable leads={[]} onStatusChange={vi.fn()} />)
    expect(screen.getByText(/no leads yet/i)).toBeInTheDocument()
  })

  it('renders all column headers', () => {
    render(<LeadsTable leads={[makeLead()]} onStatusChange={vi.fn()} />)
    for (const col of ['Name', 'Phone', 'Email', 'Address', 'Strategy', 'Status', 'Added']) {
      expect(screen.getByText(col)).toBeInTheDocument()
    }
  })

  it('renders lead contact fields correctly', () => {
    render(<LeadsTable leads={[makeLead()]} onStatusChange={vi.fn()} />)
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('305-555-0192')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('STR Management')).toBeInTheDocument()
  })

  it('shows dash for null fields', () => {
    render(<LeadsTable leads={[makeLead({ name: null, phone: null, email: null, address: null })]} onStatusChange={vi.fn()} />)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4)
  })

  it('status dropdown reflects current lead status', () => {
    render(<LeadsTable leads={[makeLead({ status: 'Contacted' })]} onStatusChange={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('Contacted')
  })

  it('calls onStatusChange when dropdown value changes', async () => {
    const onStatusChange = vi.fn()
    render(<LeadsTable leads={[makeLead()]} onStatusChange={onStatusChange} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'No Answer' } })

    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith('abc-123', 'No Answer'))
  })

  it('renders multiple leads as separate rows', () => {
    const leads = [
      makeLead({ id: '1', name: 'Alice', strategy: 'Rent Arbitrage' }),
      makeLead({ id: '2', name: 'Bob', strategy: 'STR Management' }),
      makeLead({ id: '3', name: 'Carol', strategy: 'Unassigned' }),
    ]
    render(<LeadsTable leads={leads} onStatusChange={vi.fn()} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })
})
