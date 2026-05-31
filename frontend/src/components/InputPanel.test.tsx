import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InputPanel from './InputPanel'

// Mock the api module so tests never hit the real backend.
vi.mock('../lib/api', () => ({
  scrapeLead: vi.fn().mockResolvedValue({ id: '1', strategy: 'Unassigned', status: 'New' }),
}))

describe('InputPanel', () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    onSuccess.mockClear()
  })

  it('shows URL input by default', () => {
    render(<InputPanel onSuccess={onSuccess} />)
    expect(screen.getByPlaceholderText('https://...')).toBeInTheDocument()
  })

  it('submit button is disabled when input is empty', () => {
    render(<InputPanel onSuccess={onSuccess} />)
    expect(screen.getByRole('button', { name: 'Extract Lead' })).toBeDisabled()
  })

  it('submit button enables once input has a value', () => {
    render(<InputPanel onSuccess={onSuccess} />)
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com' },
    })
    expect(screen.getByRole('button', { name: 'Extract Lead' })).not.toBeDisabled()
  })

  it('switches to textarea when Paste Text is clicked', () => {
    render(<InputPanel onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: 'Paste Text' }))
    expect(screen.getByPlaceholderText(/paste raw listing/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('https://...')).not.toBeInTheDocument()
  })

  it('switching mode clears the input value', () => {
    render(<InputPanel onSuccess={onSuccess} />)
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Paste Text' }))
    expect(screen.getByPlaceholderText(/paste raw listing/i)).toHaveValue('')
  })

  it('calls onSuccess and clears input after successful submission', async () => {
    render(<InputPanel onSuccess={onSuccess} />)
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Extract Lead' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(screen.getByPlaceholderText('https://...')).toHaveValue('')
  })

  it('shows error message when API call fails', async () => {
    const { scrapeLead } = await import('../lib/api')
    vi.mocked(scrapeLead).mockRejectedValueOnce(new Error('Server error'))

    render(<InputPanel onSuccess={onSuccess} />)
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Extract Lead' }))

    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument())
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
