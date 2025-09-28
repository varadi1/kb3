import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UrlsTable } from '@/components/urls/urls-table'
import { useKb3Store } from '@/lib/store'

// Mock the store
jest.mock('@/lib/store')

const mockUseKb3Store = useKb3Store as jest.MockedFunction<typeof useKb3Store>

describe('UrlsTable Component', () => {
  const mockUrls = [
    {
      id: '1',
      url: 'https://example.com',
      status: 'completed' as const,
      tags: ['test', 'documentation'],
      scraperType: 'http',
      processedAt: '2025-01-28T10:00:00Z',
      metadata: {}
    },
    {
      id: '2',
      url: 'https://example.org',
      status: 'processing' as const,
      tags: ['api'],
      scraperType: 'playwright',
      processedAt: undefined,
      metadata: {}
    },
    {
      id: '3',
      url: 'https://example.net',
      status: 'failed' as const,
      tags: [],
      scraperType: undefined,
      processedAt: undefined,
      metadata: {}
    }
  ]

  const mockStore = {
    urls: mockUrls,
    selectedUrls: new Set<string>(),
    urlsLoading: false,
    fetchUrls: jest.fn(),
    selectUrl: jest.fn(),
    deselectUrl: jest.fn(),
    selectAllUrls: jest.fn(),
    deselectAllUrls: jest.fn(),
    processUrl: jest.fn(),
    deleteUrl: jest.fn()
  }

  beforeEach(() => {
    mockUseKb3Store.mockReturnValue(mockStore)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the table with URLs', () => {
    render(<UrlsTable />)

    expect(screen.getByText('https://example.com')).toBeInTheDocument()
    expect(screen.getByText('https://example.org')).toBeInTheDocument()
    expect(screen.getByText('https://example.net')).toBeInTheDocument()
  })

  it('displays loading state', () => {
    mockUseKb3Store.mockReturnValue({
      ...mockStore,
      urlsLoading: true,
      urls: []
    })

    render(<UrlsTable />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays empty state when no URLs', () => {
    mockUseKb3Store.mockReturnValue({
      ...mockStore,
      urls: []
    })

    render(<UrlsTable />)
    expect(screen.getByText(/No URLs found/)).toBeInTheDocument()
    expect(screen.getByText(/Add some URLs to get started/)).toBeInTheDocument()
  })

  it('shows status badges with correct colors', () => {
    render(<UrlsTable />)

    const completedBadge = screen.getByText('completed')
    const processingBadge = screen.getByText('processing')
    const failedBadge = screen.getByText('failed')

    expect(completedBadge).toHaveClass('bg-green-100')
    expect(processingBadge).toHaveClass('bg-blue-100')
    expect(failedBadge).toHaveClass('bg-red-100')
  })

  it('displays tags with truncation for many tags', () => {
    const urlWithManyTags = {
      ...mockUrls[0],
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
    }

    mockUseKb3Store.mockReturnValue({
      ...mockStore,
      urls: [urlWithManyTags]
    })

    render(<UrlsTable />)

    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('tag3')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument() // Shows count of remaining tags
  })

  it('handles URL selection', () => {
    mockUseKb3Store.mockReturnValue({
      ...mockStore,
      selectedUrls: new Set(['1'])
    })

    render(<UrlsTable />)

    const checkbox = screen.getAllByRole('checkbox')[1] // First URL checkbox
    fireEvent.click(checkbox)

    expect(mockStore.deselectUrl).toHaveBeenCalledWith('1')
  })

  it('handles select all functionality', () => {
    render(<UrlsTable />)

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(selectAllCheckbox)

    expect(mockStore.selectAllUrls).toHaveBeenCalled()
  })

  it('opens dropdown menu with actions', () => {
    render(<UrlsTable />)

    const menuButtons = screen.getAllByRole('button', { name: /Open menu/i })
    fireEvent.click(menuButtons[0])

    expect(screen.getByText('Process')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Download Content')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('triggers URL processing', async () => {
    render(<UrlsTable />)

    const menuButtons = screen.getAllByRole('button', { name: /Open menu/i })
    fireEvent.click(menuButtons[0])

    const processButton = screen.getByText('Process')
    fireEvent.click(processButton)

    await waitFor(() => {
      expect(mockStore.processUrl).toHaveBeenCalledWith('1')
    })
  })

  it('disables process button for URLs already processing', () => {
    render(<UrlsTable />)

    // Second URL is processing
    const menuButtons = screen.getAllByRole('button', { name: /Open menu/i })
    fireEvent.click(menuButtons[1])

    const processButton = screen.getByText('Process')
    expect(processButton.closest('div')).toHaveAttribute('aria-disabled', 'true')
  })

  it('triggers URL deletion', async () => {
    render(<UrlsTable />)

    const menuButtons = screen.getAllByRole('button', { name: /Open menu/i })
    fireEvent.click(menuButtons[0])

    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockStore.deleteUrl).toHaveBeenCalledWith('1')
    })
  })

  it('formats dates correctly', () => {
    render(<UrlsTable />)

    // First URL has processedAt date
    expect(screen.getByText(/Jan 28, 2025/)).toBeInTheDocument()

    // Third URL has no processedAt
    expect(screen.getByText('Not processed')).toBeInTheDocument()
  })

  it('truncates long URLs', () => {
    const longUrl = {
      ...mockUrls[0],
      url: 'https://very-long-domain-name.example.com/very/long/path/that/should/be/truncated/in/the/display'
    }

    mockUseKb3Store.mockReturnValue({
      ...mockStore,
      urls: [longUrl]
    })

    render(<UrlsTable />)

    const urlText = screen.getByText(/very-long-domain-name/)
    expect(urlText.textContent).toContain('...')
  })

  it('fetches URLs on mount', () => {
    render(<UrlsTable />)
    expect(mockStore.fetchUrls).toHaveBeenCalled()
  })
})