import { renderHook, act, waitFor } from '@testing-library/react'
import { useKb3Store } from '@/lib/store'

// Mock fetch
global.fetch = jest.fn()

describe('KB3 Store Integration Tests', () => {
  beforeEach(() => {
    // Reset store state
    useKb3Store.setState({
      urls: [],
      selectedUrls: new Set(),
      urlsLoading: false,
      tags: [],
      tagsLoading: false,
      processingTasks: new Map(),
      stats: null
    })

    // Clear fetch mock
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('URL Management', () => {
    it('fetches URLs from API', async () => {
      const mockUrls = [
        { id: '1', url: 'https://example.com', status: 'completed', tags: [] },
        { id: '2', url: 'https://example.org', status: 'pending', tags: [] }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockUrls })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.fetchUrls()
      })

      expect(result.current.urls).toEqual(mockUrls)
      expect(result.current.urlsLoading).toBe(false)
      expect(global.fetch).toHaveBeenCalledWith('/api/urls?')
    })

    it('adds a single URL', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.addUrl('https://new.com', ['test'])
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://new.com', tags: ['test'] })
      })
    })

    it('adds multiple URLs in batch', async () => {
      const urls = [
        { url: 'https://batch1.com', tags: ['tag1'] },
        { url: 'https://batch2.com', tags: ['tag2'] }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.addUrls(urls)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/urls/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      })
    })

    it('updates URL metadata', async () => {
      const initialUrl = { id: '1', url: 'https://example.com', status: 'pending' as const, tags: [] }
      useKb3Store.setState({ urls: [initialUrl] })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.updateUrl('1', { status: 'completed' })
      })

      expect(result.current.urls[0].status).toBe('completed')
      expect(global.fetch).toHaveBeenCalledWith('/api/urls/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      })
    })

    it('deletes a URL', async () => {
      useKb3Store.setState({
        urls: [
          { id: '1', url: 'https://example.com', status: 'completed' as const, tags: [] },
          { id: '2', url: 'https://example.org', status: 'pending' as const, tags: [] }
        ],
        selectedUrls: new Set(['1', '2'])
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.deleteUrl('1')
      })

      expect(result.current.urls).toHaveLength(1)
      expect(result.current.urls[0].id).toBe('2')
      expect(result.current.selectedUrls.has('1')).toBe(false)
    })
  })

  describe('URL Selection', () => {
    beforeEach(() => {
      useKb3Store.setState({
        urls: [
          { id: '1', url: 'https://example.com', status: 'completed' as const, tags: [] },
          { id: '2', url: 'https://example.org', status: 'pending' as const, tags: [] },
          { id: '3', url: 'https://example.net', status: 'failed' as const, tags: [] }
        ]
      })
    })

    it('selects a URL', () => {
      const { result } = renderHook(() => useKb3Store())

      act(() => {
        result.current.selectUrl('1')
      })

      expect(result.current.selectedUrls.has('1')).toBe(true)
      expect(result.current.selectedUrls.size).toBe(1)
    })

    it('deselects a URL', () => {
      useKb3Store.setState({ selectedUrls: new Set(['1', '2']) })
      const { result } = renderHook(() => useKb3Store())

      act(() => {
        result.current.deselectUrl('1')
      })

      expect(result.current.selectedUrls.has('1')).toBe(false)
      expect(result.current.selectedUrls.size).toBe(1)
    })

    it('selects all URLs', () => {
      const { result } = renderHook(() => useKb3Store())

      act(() => {
        result.current.selectAllUrls()
      })

      expect(result.current.selectedUrls.size).toBe(3)
      expect(result.current.selectedUrls.has('1')).toBe(true)
      expect(result.current.selectedUrls.has('2')).toBe(true)
      expect(result.current.selectedUrls.has('3')).toBe(true)
    })

    it('deselects all URLs', () => {
      useKb3Store.setState({ selectedUrls: new Set(['1', '2', '3']) })
      const { result } = renderHook(() => useKb3Store())

      act(() => {
        result.current.deselectAllUrls()
      })

      expect(result.current.selectedUrls.size).toBe(0)
    })
  })

  describe('Tag Management', () => {
    it('fetches tags from API', async () => {
      const mockTags = [
        { id: 1, name: 'tag1', created_at: '2025-01-28' },
        { id: 2, name: 'tag2', parent_id: 1, created_at: '2025-01-28' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockTags })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.fetchTags()
      })

      expect(result.current.tags).toEqual(mockTags)
      expect(result.current.tagsLoading).toBe(false)
    })

    it('creates a new tag', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.createTag('new-tag', 'parent-tag')
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new-tag', parentName: 'parent-tag' })
      })
    })

    it('updates a tag', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.updateTag(1, { name: 'updated-tag' })
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/tags/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'updated-tag' })
      })
    })

    it('deletes a tag', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.deleteTag(1)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/tags/1', {
        method: 'DELETE'
      })
    })
  })

  describe('Processing', () => {
    it('processes a single URL', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.processUrl('url-id', { scraperType: 'http' })
      })

      expect(result.current.processingTasks.has('url-id')).toBe(false) // Cleaned up after success
      expect(global.fetch).toHaveBeenCalledWith('/api/process/url/url-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scraperType: 'http' })
      })
    })

    it('tracks processing task status', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          json: async () => ({ success: true })
        }), 100))
      )

      const { result } = renderHook(() => useKb3Store())

      const processPromise = act(async () => {
        await result.current.processUrl('url-id')
      })

      // Task should be in progress
      expect(result.current.processingTasks.has('url-id')).toBe(true)
      expect(result.current.processingTasks.get('url-id')?.status).toBe('queued')

      await processPromise

      // Task should be removed after completion
      expect(result.current.processingTasks.has('url-id')).toBe(false)
    })

    it('processes multiple URLs', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.processUrls(['url1', 'url2'], { scraperType: 'playwright' })
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/process/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: ['url1', 'url2'], options: { scraperType: 'playwright' } })
      })
    })

    it('processes URLs by tags', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.processByTags(['tag1', 'tag2'], { includeChildTags: true })
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/process/by-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: ['tag1', 'tag2'], includeChildTags: true })
      })
    })
  })

  describe('Statistics', () => {
    it('fetches statistics', async () => {
      const mockStats = {
        totalUrls: 100,
        processedUrls: 75,
        failedUrls: 5,
        processing: 2,
        queue: 18,
        tags: 15,
        totalSize: 1024000
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockStats })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.fetchStats()
      })

      expect(result.current.stats).toEqual(mockStats)
      expect(global.fetch).toHaveBeenCalledWith('/api/process/queue')
    })
  })

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.fetchUrls()
      })

      expect(result.current.urlsLoading).toBe(false)
      expect(result.current.urls).toEqual([])
    })

    it('handles API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'Invalid request' })
      })

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.addUrl('invalid-url')
      })

      // fetchUrls should not be called after failed add
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('cleans up processing tasks on error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Processing failed'))

      const { result } = renderHook(() => useKb3Store())

      await act(async () => {
        await result.current.processUrl('url-id').catch(() => {})
      })

      expect(result.current.processingTasks.has('url-id')).toBe(false)
    })
  })
})