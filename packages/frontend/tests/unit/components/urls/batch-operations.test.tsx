import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BatchOperationsPanel } from '@/components/urls/batch-operations'
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

describe('BatchOperationsPanel', () => {
  const mockBatchAssignTags = jest.fn()
  const mockBatchUpdateAuthority = jest.fn()
  const mockBatchUpdateUrls = jest.fn()
  const mockProcessUrls = jest.fn()
  const mockDeselectAllUrls = jest.fn()
  const mockFetchTags = jest.fn()
  const mockToast = jest.fn()

  const defaultMockStore = {
    selectedUrls: new Set(['url1', 'url2', 'url3']),
    urls: [
      { id: 'url1', url: 'https://example1.com', tags: [], status: 'pending' },
      { id: 'url2', url: 'https://example2.com', tags: [], status: 'pending' },
      { id: 'url3', url: 'https://example3.com', tags: [], status: 'pending' }
    ],
    tags: [
      { id: 1, name: 'docs', created_at: '2024-01-01' },
      { id: 2, name: 'api', created_at: '2024-01-01' }
    ],
    fetchTags: mockFetchTags,
    batchAssignTags: mockBatchAssignTags,
    batchUpdateAuthority: mockBatchUpdateAuthority,
    batchUpdateUrls: mockBatchUpdateUrls,
    processUrls: mockProcessUrls,
    deselectAllUrls: mockDeselectAllUrls
  }

  beforeEach(() => {
    (useKb3Store as unknown as jest.Mock).mockReturnValue(defaultMockStore);
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when URLs are selected', () => {
      render(<BatchOperationsPanel />)

      expect(screen.getByText('Batch Operations')).toBeInTheDocument()
      expect(screen.getByText('3 URLs selected')).toBeInTheDocument()
    })

    it('should not render when no URLs are selected', () => {
      (useKb3Store as unknown as jest.Mock).mockReturnValue({
        ...defaultMockStore,
        selectedUrls: new Set()
      })

      const { container } = render(<BatchOperationsPanel />)
      expect(container.firstChild).toBeNull()
    })

    it('should show correct count for single URL', () => {
      (useKb3Store as unknown as jest.Mock).mockReturnValue({
        ...defaultMockStore,
        selectedUrls: new Set(['url1'])
      })

      render(<BatchOperationsPanel />)
      expect(screen.getByText('1 URL selected')).toBeInTheDocument()
    })
  })

  describe('Tag Assignment', () => {
    it('should allow adding tags', () => {
      render(<BatchOperationsPanel />)

      const tagInput = screen.getByPlaceholderText('Enter tag name')
      const addButton = screen.getByText('Add Tag')

      fireEvent.change(tagInput, { target: { value: 'newtag' } })
      fireEvent.click(addButton)

      expect(screen.getByText('newtag')).toBeInTheDocument()
    })

    it('should handle Enter key for adding tags', () => {
      render(<BatchOperationsPanel />)

      const tagInput = screen.getByPlaceholderText('Enter tag name')

      fireEvent.change(tagInput, { target: { value: 'entertag' } })
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

      expect(screen.getByText('entertag')).toBeInTheDocument()
    })

    it('should allow removing tags', () => {
      render(<BatchOperationsPanel />)

      const tagInput = screen.getByPlaceholderText('Enter tag name')
      fireEvent.change(tagInput, { target: { value: 'removeme' } })
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

      const removeButton = screen.getByText('removeme').parentElement?.querySelector('svg')
      fireEvent.click(removeButton!)

      expect(screen.queryByText('removeme')).not.toBeInTheDocument()
    })

    it('should call batchAssignTags on assign', async () => {
      mockBatchAssignTags.mockResolvedValueOnce(undefined)

      render(<BatchOperationsPanel />)

      const tagInput = screen.getByPlaceholderText('Enter tag name')
      fireEvent.change(tagInput, { target: { value: 'newtag' } })
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

      const assignButton = screen.getByText('Assign Tags')
      fireEvent.click(assignButton)

      await waitFor(() => {
        expect(mockBatchAssignTags).toHaveBeenCalledWith(
          ['url1', 'url2', 'url3'],
          ['newtag']
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Assigned 1 tags to 3 URLs'
      })
    })

    it('should show error if no tags selected', () => {
      render(<BatchOperationsPanel />)

      const assignButton = screen.getByText('Assign Tags')
      fireEvent.click(assignButton)

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Please select at least one tag',
        variant: 'destructive'
      })
    })
  })

  describe('Authority Updates', () => {
    it('should display authority levels', () => {
      render(<BatchOperationsPanel />)

      expect(screen.getByText('None (0)')).toBeInTheDocument()
      expect(screen.getByText('Update Authority')).toBeInTheDocument()
    })

    it('should call batchUpdateAuthority on update', async () => {
      mockBatchUpdateAuthority.mockResolvedValueOnce(undefined)

      render(<BatchOperationsPanel />)

      const authoritySelect = screen.getByText('None (0)')
      fireEvent.click(authoritySelect)
      fireEvent.click(screen.getByText('High (3)'))

      const updateButton = screen.getByText('Update Authority')
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(mockBatchUpdateAuthority).toHaveBeenCalledWith(
          ['url1', 'url2', 'url3'],
          3
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Updated authority level for 3 URLs'
      })
    })
  })

  describe('Status Updates', () => {
    it('should display status options', () => {
      render(<BatchOperationsPanel />)

      const statusSelect = screen.getByText('Select status')
      fireEvent.click(statusSelect)

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('should call batchUpdateUrls on status update', async () => {
      mockBatchUpdateUrls.mockResolvedValueOnce(undefined)

      render(<BatchOperationsPanel />)

      const statusSelect = screen.getByText('Select status')
      fireEvent.click(statusSelect)
      fireEvent.click(screen.getByText('Completed'))

      const updateButton = screen.getByText('Update Status')
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(mockBatchUpdateUrls).toHaveBeenCalledWith(
          ['url1', 'url2', 'url3'],
          { status: 'completed' }
        )
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Updated status for 3 URLs'
      })
    })

    it('should show error if no status selected', () => {
      render(<BatchOperationsPanel />)

      const updateButton = screen.getByText('Update Status')
      fireEvent.click(updateButton)

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Please select a status',
        variant: 'destructive'
      })
    })
  })

  describe('Action Buttons', () => {
    it('should call processUrls on process', async () => {
      mockProcessUrls.mockResolvedValueOnce(undefined)

      render(<BatchOperationsPanel />)

      const processButton = screen.getByText('Process Selected')
      fireEvent.click(processButton)

      await waitFor(() => {
        expect(mockProcessUrls).toHaveBeenCalledWith(['url1', 'url2', 'url3'])
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Started processing 3 URLs'
      })
    })

    it('should confirm before deleting', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      mockBatchUpdateUrls.mockResolvedValue(undefined)

      render(<BatchOperationsPanel />)

      const deleteButton = screen.getByText('Delete Selected')
      fireEvent.click(deleteButton)

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete 3 URLs?')

      await waitFor(() => {
        expect(mockBatchUpdateUrls).toHaveBeenCalled()
      })

      confirmSpy.mockRestore()
    })

    it('should not delete if not confirmed', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

      render(<BatchOperationsPanel />)

      const deleteButton = screen.getByText('Delete Selected')
      fireEvent.click(deleteButton)

      expect(mockBatchUpdateUrls).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('should clear selection', () => {
      render(<BatchOperationsPanel />)

      const clearButton = screen.getByText('Clear Selection')
      fireEvent.click(clearButton)

      expect(mockDeselectAllUrls).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('should disable buttons during processing', async () => {
      mockBatchAssignTags.mockImplementation(() => new Promise(() => {}))

      render(<BatchOperationsPanel />)

      const tagInput = screen.getByPlaceholderText('Enter tag name')
      fireEvent.change(tagInput, { target: { value: 'tag' } })
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

      const assignButton = screen.getByText('Assign Tags')
      fireEvent.click(assignButton)

      await waitFor(() => {
        expect(screen.getByText('Process Selected')).toBeDisabled()
        expect(screen.getByText('Export Selected')).toBeDisabled()
        expect(screen.getByText('Delete Selected')).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error toast on tag assignment failure', async () => {
      mockBatchAssignTags.mockRejectedValueOnce(new Error('Network error'))

      render(<BatchOperationsPanel />)

      const tagInput = screen.getByPlaceholderText('Enter tag name')
      fireEvent.change(tagInput, { target: { value: 'tag' } })
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' })

      const assignButton = screen.getByText('Assign Tags')
      fireEvent.click(assignButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to assign tags',
          variant: 'destructive'
        })
      })
    })
  })

  describe('SRP Compliance', () => {
    it('should only handle batch operations', () => {
      render(<BatchOperationsPanel />)

      // Should contain batch operation elements
      expect(screen.getByText('Batch Operations')).toBeInTheDocument()
      expect(screen.getByText('Assign Tags')).toBeInTheDocument()
      expect(screen.getByText('Update Authority')).toBeInTheDocument()
      expect(screen.getByText('Update Status')).toBeInTheDocument()

      // Should NOT contain single URL operations
      expect(screen.queryByText('Edit URL')).not.toBeInTheDocument()
      expect(screen.queryByText('Add URL')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('URL')).not.toBeInTheDocument()
    })
  })
})