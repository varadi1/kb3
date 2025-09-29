import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UrlsTable } from '@/components/urls/urls-table'
import { useKb3Store } from '@/lib/store'

// Mock the store
jest.mock('@/lib/store')

// Mock Radix UI dropdown menu to render content immediately
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    disabled
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <div onClick={disabled ? undefined : onClick} aria-disabled={disabled}>
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />
}))

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

    // With our mock, all dropdowns render their content immediately
    // So we check that the expected menu items exist
    const processButtons = screen.getAllByText('Process')
    const editButtons = screen.getAllByText('Edit')
    const downloadCleanedButtons = screen.getAllByText('Download Cleaned')
    const downloadOriginalButtons = screen.getAllByText('Download Original')
    const deleteButtons = screen.getAllByText('Delete')

    expect(processButtons.length).toBeGreaterThan(0)
    expect(editButtons.length).toBeGreaterThan(0)
    expect(downloadCleanedButtons.length).toBeGreaterThan(0)
    expect(downloadOriginalButtons.length).toBeGreaterThan(0)
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it('triggers URL processing', async () => {
    render(<UrlsTable />)

    // Get the first Process button (for first URL)
    const processButtons = screen.getAllByText('Process')
    fireEvent.click(processButtons[0])

    await waitFor(() => {
      expect(mockStore.processUrl).toHaveBeenCalledWith('1')
    })
  })

  it('disables process button for URLs already processing', () => {
    render(<UrlsTable />)

    // Get all Process buttons
    const processButtons = screen.getAllByText('Process')
    // Second URL is processing, so second button should be disabled
    expect(processButtons[1].closest('div')).toHaveAttribute('aria-disabled', 'true')
  })

  it('triggers URL deletion', async () => {
    render(<UrlsTable />)

    // Get the first Delete button (for first URL)
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockStore.deleteUrl).toHaveBeenCalledWith('1')
    })
  })

  it('formats dates correctly', () => {
    render(<UrlsTable />)

    // First URL has processedAt date
    expect(screen.getByText(/Jan 28, 2025/)).toBeInTheDocument()

    // URLs without processedAt should show "Not processed"
    const notProcessedElements = screen.getAllByText('Not processed')
    expect(notProcessedElements.length).toBeGreaterThan(0)
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