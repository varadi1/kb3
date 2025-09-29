import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditUrlDialog } from '@/components/urls/edit-url-dialog'
import { useKb3Store } from '@/lib/store'
import { useToast } from '@/components/ui/use-toast'
import '@testing-library/jest-dom'

// Mock the store
jest.mock('@/lib/store', () => ({
  useKb3Store: jest.fn()
}))

// Mock the toast
jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn()
}))

describe('EditUrlDialog', () => {
  const mockUpdateUrl = jest.fn()
  const mockFetchConfig = jest.fn()
  const mockToast = jest.fn()

  const mockUrl = {
    id: 'test-123',
    url: 'https://example.com',
    status: 'pending' as const,
    tags: ['test', 'example'],
    authority: 2,
    scraperType: 'http',
    metadata: { notes: 'Test notes' },
    processedAt: '2024-01-01'
  }

  beforeEach(() => {
    (useKb3Store as unknown as jest.Mock).mockReturnValue({
      updateUrl: mockUpdateUrl,
      fetchConfig: mockFetchConfig,
      configData: {
        scrapers: [
          { type: 'http', enabled: true, priority: 1, parameters: {} }
        ],
        cleaners: []
      }
    });

    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast
    })

    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      expect(screen.getByText('Edit URL')).toBeInTheDocument()
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={false}
          onOpenChange={() => {}}
        />
      )

      expect(screen.queryByText('Edit URL')).not.toBeInTheDocument()
    })

    it('should display URL as read-only', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const urlInput = screen.getByDisplayValue('https://example.com')
      expect(urlInput).toBeDisabled()
    })
  })

  describe('Status Management', () => {
    it('should allow status selection', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const statusSelect = screen.getByRole('combobox', { name: /status/i })
      expect(statusSelect).toBeInTheDocument()
    })

    it('should display current status', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      expect(screen.getByText('Pending')).toBeInTheDocument()
    })
  })

  describe('Authority Management', () => {
    it('should display authority levels', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const authoritySelect = screen.getByRole('combobox', { name: /authority/i })
      expect(authoritySelect).toBeInTheDocument()
    })

    it('should show correct authority level', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      expect(screen.getByText('Medium (2)')).toBeInTheDocument()
    })
  })

  describe('Tag Management', () => {
    it('should display existing tags as badges', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      expect(screen.getByText('test')).toBeInTheDocument()
      expect(screen.getByText('example')).toBeInTheDocument()
    })

    it('should allow adding new tags', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const tagInput = screen.getByPlaceholderText('Add new tag')
      const addButton = screen.getByText('Add')

      fireEvent.change(tagInput, { target: { value: 'newtag' } })
      fireEvent.click(addButton)

      expect(screen.getByText('newtag')).toBeInTheDocument()
    })

    it('should allow removing tags', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const removeButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg')
      )

      // Click remove on first tag
      fireEvent.click(removeButtons[0])

      // Tag should be removed from display
      expect(screen.queryByText('test')).not.toBeInTheDocument()
    })

    it('should handle Enter key for adding tags', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const tagInput = screen.getByPlaceholderText('Add new tag')

      fireEvent.change(tagInput, { target: { value: 'entertag' } })
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

      expect(screen.getByText('entertag')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call updateUrl with correct data on submit', async () => {
      const onOpenChange = jest.fn()
      mockUpdateUrl.mockResolvedValueOnce(undefined)

      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={onOpenChange}
        />
      )

      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateUrl).toHaveBeenCalledWith(
          'test-123',
          expect.objectContaining({
            status: 'pending',
            authority: 2,
            tags: ['test', 'example']
          })
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'URL updated successfully'
      })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should handle update errors', async () => {
      const error = new Error('Update failed')
      mockUpdateUrl.mockRejectedValueOnce(error)

      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Update failed',
          variant: 'destructive'
        })
      })
    })

    it('should disable save button while loading', async () => {
      mockUpdateUrl.mockImplementation(() => new Promise(() => {}))

      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeDisabled()
      })
    })
  })

  describe('Metadata Editing', () => {
    it('should display metadata as JSON', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const metadataTextarea = screen.getByPlaceholderText('{"key": "value"}')
      expect(metadataTextarea).toHaveValue(JSON.stringify(mockUrl.metadata, null, 2))
    })

    it('should allow editing notes', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const notesTextarea = screen.getByPlaceholderText('Additional notes about this URL')
      expect(notesTextarea).toHaveValue('Test notes')

      fireEvent.change(notesTextarea, { target: { value: 'Updated notes' } })
      expect(notesTextarea).toHaveValue('Updated notes')
    })
  })

  describe('Configuration Loading', () => {
    it('should fetch config if not loaded', () => {
      (useKb3Store as unknown as jest.Mock).mockReturnValue({
        updateUrl: mockUpdateUrl,
        fetchConfig: mockFetchConfig,
        configData: null
      })

      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      expect(mockFetchConfig).toHaveBeenCalled()
    })
  })

  describe('SRP Compliance', () => {
    it('should only handle URL editing responsibilities', () => {
      render(
        <EditUrlDialog
          url={mockUrl}
          open={true}
          onOpenChange={() => {}}
        />
      )

      // Should contain URL editing elements
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/authority/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/metadata/i)).toBeInTheDocument()

      // Should NOT contain unrelated elements
      expect(screen.queryByText(/batch/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/import/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/export/i)).not.toBeInTheDocument()
    })
  })
})