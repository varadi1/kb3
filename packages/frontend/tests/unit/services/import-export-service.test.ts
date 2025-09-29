import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { ImportExportService } from '@/lib/services/import-export-service'
import type { ImportResult, ExportData } from '@/lib/services/interfaces'

// Mock fetch globally
global.fetch = jest.fn()

describe('ImportExportService', () => {
  let service: ImportExportService
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    service = new ImportExportService()
    jest.clearAllMocks()
  })

  describe('importUrls', () => {
    it('should import URLs in JSON format', async () => {
      const content = JSON.stringify([
        { url: 'https://example.com', tags: ['test'] }
      ])
      const mockResponse = {
        data: {
          total: 1,
          successful: 1,
          failed: 0,
          errors: []
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await service.importUrls(content, 'json')

      expect(mockFetch).toHaveBeenCalledWith('/api/export/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, format: 'json' })
      })
      expect(result).toEqual({
        count: 1,
        successful: 1,
        failed: 0,
        errors: []
      })
    })

    it('should import URLs in CSV format', async () => {
      const content = 'url,tags\nhttps://example.com,"test,demo"'
      const mockResponse = {
        data: {
          total: 1,
          successful: 1,
          failed: 0
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await service.importUrls(content, 'csv')

      expect(result.count).toBe(1)
      expect(result.successful).toBe(1)
    })

    it('should handle import errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid format' })
      } as Response)

      await expect(service.importUrls('invalid', 'json'))
        .rejects.toThrow('Invalid format')
    })
  })

  describe('exportData', () => {
    it('should export data in JSON format', async () => {
      const mockResponse = {
        data: {
          content: JSON.stringify([{ url: 'https://example.com' }]),
          count: 1
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await service.exportData('json')

      expect(mockFetch).toHaveBeenCalledWith('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json' })
      })
      expect(result).toEqual({
        content: mockResponse.data.content,
        mimeType: 'application/json',
        count: 1,
        format: 'json'
      })
    })

    it('should export selected URLs', async () => {
      const urlIds = ['url1', 'url2']
      const mockResponse = {
        data: {
          content: 'url1\nurl2',
          count: 2
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await service.exportData('txt', urlIds)

      expect(mockFetch).toHaveBeenCalledWith('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'txt', urlIds })
      })
      expect(result.mimeType).toBe('text/plain')
      expect(result.count).toBe(2)
    })

    it('should set correct mime types for each format', async () => {
      const formats: Array<{ format: 'json' | 'csv' | 'txt', mimeType: string }> = [
        { format: 'json', mimeType: 'application/json' },
        { format: 'csv', mimeType: 'text/csv' },
        { format: 'txt', mimeType: 'text/plain' }
      ]

      for (const { format, mimeType } of formats) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { content: '', count: 0 } })
        } as Response)

        const result = await service.exportData(format)
        expect(result.mimeType).toBe(mimeType)
      }
    })
  })

  describe('validateImport', () => {
    it('should validate valid import content', async () => {
      const content = JSON.stringify([{ url: 'https://example.com' }])

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, errors: [] } })
      } as Response)

      const result = await service.validateImport(content, 'json')

      expect(result).toEqual({ valid: true, errors: [] })
    })

    it('should return validation errors', async () => {
      const content = 'invalid json'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            valid: false,
            errors: ['Invalid JSON format']
          }
        })
      } as Response)

      const result = await service.validateImport(content, 'json')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid JSON format')
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await service.validateImport('content', 'json')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Failed to validate: Network error')
    })
  })

  describe('ISP Compliance', () => {
    it('should implement IImportExportService interface completely', () => {
      expect(service.importUrls).toBeDefined()
      expect(service.exportData).toBeDefined()
      expect(service.validateImport).toBeDefined()
    })

    it('should not have methods outside of interface contract', () => {
      const interfaceMethods = [
        'importUrls',
        'exportData',
        'validateImport'
      ]

      const actualMethods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(service)
      ).filter(name => name !== 'constructor')

      expect(actualMethods.sort()).toEqual(interfaceMethods.sort())
    })
  })

  describe('SRP Compliance', () => {
    it('should only handle import/export operations', () => {
      // Service should not handle:
      // - URL management
      // - Configuration
      // - Authentication
      // - Any other unrelated concerns

      const methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(service)
      ).filter(name => name !== 'constructor')

      // All methods should be related to import/export
      methods.forEach(method => {
        expect(['import', 'export', 'validate'].some(op =>
          method.toLowerCase().includes(op)
        )).toBe(true)
      })
    })
  })
})