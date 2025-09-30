import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BatchAddUrlsDialog } from '@/components/urls/batch-add-urls-dialog'
import { useKb3Store } from '@/lib/store'

// Mock the store
jest.mock('@/lib/store')

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock Dialog components to simplify rendering
jest.mock('@/components/ui/dialog', () => {
  const React = require('react')
  return {
    Dialog: ({ children, open, onOpenChange }: any) => {
      const [isOpen, setIsOpen] = React.useState(open || false)
      React.useEffect(() => {
        if (open !== undefined) setIsOpen(open)
      }, [open])
      return (
        <div data-testid="dialog-wrapper">
          {React.Children.map(children, child =>
            React.isValidElement(child)
              ? React.cloneElement(child as any, { isOpen, setIsOpen: onOpenChange || setIsOpen })
              : child
          )}
        </div>
      )
    },
    DialogContent: ({ children, isOpen }: any) =>
      isOpen ? <div data-testid="dialog-content">{children}</div> : null,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
    DialogTrigger: ({ children, setIsOpen }: any) => {
      const childWithProps = React.isValidElement(children)
        ? React.cloneElement(children as any, {
            onClick: () => setIsOpen?.(true)
          })
        : children
      return <div>{childWithProps}</div>
    },
    DialogFooter: ({ children }: any) => <div>{children}</div>
  }
})

describe('BatchAddUrlsDialog', () => {
  const mockAddUrls = jest.fn()
  const mockFetchUrls = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useKb3Store as any).mockReturnValue({
      addUrls: mockAddUrls,
      fetchUrls: mockFetchUrls,
    })
  })

  it('renders the batch add button', () => {
    render(<BatchAddUrlsDialog />)
    expect(screen.getByText('Batch Add URLs')).toBeInTheDocument()
  })

  it('opens the dialog when button is clicked', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    expect(screen.getByText('Batch Add URLs', { selector: 'h2' })).toBeInTheDocument()
    expect(screen.getByText(/Add multiple URLs at once/)).toBeInTheDocument()
  })

  it('parses URLs correctly with tags', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    const textarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'https://example.com [tag1, tag2]' } })
    })

    // Wait for parsing to complete
    await waitFor(() => {
      expect(screen.getByText('1 valid URL(s)')).toBeInTheDocument()
    })
  })

  it.skip('handles invalid URLs correctly', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await userEvent.click(button)

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Batch Add URLs', { selector: 'h2' })).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    await userEvent.type(textarea, 'not-a-valid-url')

    await waitFor(() => {
      expect(screen.getByText(/1 invalid URL\(s\):/)).toBeInTheDocument()
    })
  })

  it('auto-adds https:// to URLs without protocol', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    const textarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    await act(async () => {
      await userEvent.type(textarea, 'example.com')
    })

    await waitFor(() => {
      expect(screen.getByText('1 valid URL(s)')).toBeInTheDocument()
    })
  })

  it('applies global tags to all URLs', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    const globalTagsInput = screen.getByPlaceholderText('tag1, tag2, tag3')
    await act(async () => {
      await userEvent.type(globalTagsInput, 'global1, global2')
    })

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    await act(async () => {
      await userEvent.type(urlsTextarea, 'https://example.com\nhttps://example2.com')
    })

    const submitButton = screen.getByText(/Add 2 URL/)
    await act(async () => {
      await userEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockAddUrls).toHaveBeenCalledWith([
        { url: 'https://example.com', tags: ['global1', 'global2'] },
        { url: 'https://example2.com', tags: ['global1', 'global2'] },
      ])
    })
  })

  it('combines global and line-specific tags', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    const globalTagsInput = screen.getByPlaceholderText('tag1, tag2, tag3')
    await act(async () => {
      await userEvent.type(globalTagsInput, 'global')
    })

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    await act(async () => {
      fireEvent.change(urlsTextarea, { target: { value: 'https://example.com [specific]' } })
    })

    const submitButton = screen.getByText(/Add 1 URL/)
    await act(async () => {
      await userEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockAddUrls).toHaveBeenCalledWith([
        { url: 'https://example.com', tags: ['global', 'specific'] },
      ])
    })
  })

  it('removes duplicate tags', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    const globalTagsInput = screen.getByPlaceholderText('tag1, tag2, tag3')
    await act(async () => {
      await userEvent.type(globalTagsInput, 'tag1, tag1')
    })

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    await act(async () => {
      fireEvent.change(urlsTextarea, { target: { value: 'https://example.com [tag1, tag2]' } })
    })

    const submitButton = screen.getByText(/Add 1 URL/)
    await act(async () => {
      await userEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockAddUrls).toHaveBeenCalledWith([
        { url: 'https://example.com', tags: ['tag1', 'tag2'] },
      ])
    })
  })

  it.skip('shows confirmation dialog for mixed valid/invalid URLs', async () => {
    window.confirm = jest.fn(() => true)

    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await userEvent.click(button)

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Batch Add URLs', { selector: 'h2' })).toBeInTheDocument()
    })

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    await userEvent.type(urlsTextarea, 'https://example.com\ninvalid-url')

    await waitFor(() => {
      expect(screen.getByText(/1 valid URL\(s\)/)).toBeInTheDocument()
      expect(screen.getByText(/1 invalid URL\(s\):/)).toBeInTheDocument()
    })

    const submitButton = screen.getByText(/Add 1 URL/)
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        'Found 1 invalid URL(s). Do you want to proceed with adding 1 valid URL(s)?'
      )
    })
  })

  it.skip('disables submit button when no valid URLs', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await userEvent.click(button)

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Batch Add URLs', { selector: 'h2' })).toBeInTheDocument()
    })

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    await userEvent.type(urlsTextarea, 'not-valid')

    await waitFor(() => {
      const submitButton = screen.getByText(/Add.*URL/)
      expect(submitButton.textContent).toContain('Add 0 URL(s)')
      expect(submitButton).toBeDisabled()
    }, { timeout: 3000 })
  })

  it('resets form after successful submission', async () => {
    mockAddUrls.mockResolvedValue(undefined)
    mockFetchUrls.mockResolvedValue(undefined)

    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    await act(async () => {
      await userEvent.type(urlsTextarea, 'https://example.com')
    })

    const submitButton = screen.getByText(/Add 1 URL/)
    await act(async () => {
      await userEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockAddUrls).toHaveBeenCalled()
      expect(mockFetchUrls).toHaveBeenCalled()
    })

    // Check that dialog closes (button should be visible again)
    await waitFor(() => {
      expect(screen.getByText('Batch Add URLs')).toBeInTheDocument()
    })
  })

  it('handles multiple URLs on separate lines', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    const urlsToType = `https://example1.com\nhttps://example2.com [tag1]\nhttps://example3.com [tag2, tag3]`
    await act(async () => {
      fireEvent.change(urlsTextarea, { target: { value: urlsToType } })
    })

    await waitFor(() => {
      expect(screen.getByText('3 valid URL(s)')).toBeInTheDocument()
    })

    const submitButton = screen.getByText(/Add 3 URL/)
    await act(async () => {
      await userEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockAddUrls).toHaveBeenCalledWith([
        { url: 'https://example1.com', tags: [] },
        { url: 'https://example2.com', tags: ['tag1'] },
        { url: 'https://example3.com', tags: ['tag2', 'tag3'] },
      ])
    })
  })

  it('ignores empty lines', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    const urlsWithEmptyLines = `https://example1.com\n\n\nhttps://example2.com`
    await act(async () => {
      await userEvent.type(urlsTextarea, urlsWithEmptyLines)
    })

    await waitFor(() => {
      expect(screen.getByText('2 valid URL(s)')).toBeInTheDocument()
    })
  })

  it('shows preview of unique tags', async () => {
    render(<BatchAddUrlsDialog />)

    const button = screen.getByText('Batch Add URLs')
    await act(async () => {
      await userEvent.click(button)
    })

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example.com\/page1/)
    const urlsToType = `https://example1.com [tag1, tag2]\nhttps://example2.com [tag2, tag3]`
    await act(async () => {
      fireEvent.change(urlsTextarea, { target: { value: urlsToType } })
    })

    await waitFor(() => {
      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tag2')).toBeInTheDocument()
      expect(screen.getByText('tag3')).toBeInTheDocument()
    })
  })
})