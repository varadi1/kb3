import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { ConfigService } from '@/lib/services/config-service'
import type { ConfigData } from '@/lib/services/interfaces'

// Mock fetch globally
global.fetch = jest.fn()

describe('ConfigService', () => {
  let service: ConfigService
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    service = new ConfigService()
    jest.clearAllMocks()
  })

  describe('fetchConfig', () => {
    it('should fetch scrapers and cleaners configuration', async () => {
      const mockScrapers = {
        data: [
          { type: 'http', enabled: true, priority: 1, parameters: {} },
          { type: 'playwright', enabled: true, priority: 2, parameters: {} }
        ]
      }
      const mockCleaners = {
        data: [
          { type: 'sanitize-html', enabled: true, order: 1, parameters: {} },
          { type: 'xss', enabled: true, order: 2, parameters: {} }
        ]
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockScrapers
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCleaners
        } as Response)

      const result = await service.fetchConfig()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenCalledWith('/api/config/scrapers')
      expect(mockFetch).toHaveBeenCalledWith('/api/config/cleaners')
      expect(result).toEqual({
        scrapers: mockScrapers.data,
        cleaners: mockCleaners.data
      })
    })

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(service.fetchConfig()).rejects.toThrow()
    })
  })

  describe('updateConfig', () => {
    it('should update scrapers configuration', async () => {
      const config: Partial<ConfigData> = {
        scrapers: [
          { type: 'http', enabled: true, priority: 1, parameters: {} }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      await service.updateConfig(config)

      expect(mockFetch).toHaveBeenCalledWith('/api/config/scrapers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scrapers: config.scrapers })
      })
    })

    it('should update cleaners configuration', async () => {
      const config: Partial<ConfigData> = {
        cleaners: [
          { type: 'sanitize-html', enabled: true, order: 1, parameters: {} }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      await service.updateConfig(config)

      expect(mockFetch).toHaveBeenCalledWith('/api/config/cleaners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleaners: config.cleaners })
      })
    })

    it('should update both scrapers and cleaners', async () => {
      const config: ConfigData = {
        scrapers: [{ type: 'http', enabled: true, priority: 1, parameters: {} }],
        cleaners: [{ type: 'xss', enabled: true, order: 1, parameters: {} }]
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)

      await service.updateConfig(config)

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should throw error when update fails', async () => {
      const config: Partial<ConfigData> = {
        scrapers: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(service.updateConfig(config)).rejects.toThrow()
    })
  })

  describe('fetchTemplates', () => {
    it('should fetch configuration templates', async () => {
      const mockTemplates = {
        data: [
          {
            id: '1',
            name: 'Template 1',
            scraperConfigs: [],
            cleanerConfigs: [],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates
      } as Response)

      const result = await service.fetchTemplates()

      expect(mockFetch).toHaveBeenCalledWith('/api/config/templates')
      expect(result).toEqual(mockTemplates.data)
    })
  })

  describe('saveTemplate', () => {
    it('should save a new template', async () => {
      const template = {
        name: 'New Template',
        description: 'Test template',
        scraperConfigs: [],
        cleanerConfigs: []
      }

      const savedTemplate = {
        data: {
          ...template,
          id: '123',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => savedTemplate
      } as Response)

      const result = await service.saveTemplate(template)

      expect(mockFetch).toHaveBeenCalledWith('/api/config/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      })
      expect(result).toEqual(savedTemplate.data)
    })
  })

  describe('ISP Compliance', () => {
    it('should implement IConfigService interface completely', () => {
      expect(service.fetchConfig).toBeDefined()
      expect(service.updateConfig).toBeDefined()
      expect(service.fetchTemplates).toBeDefined()
      expect(service.saveTemplate).toBeDefined()
      expect(service.deleteTemplate).toBeDefined()
      expect(service.applyTemplate).toBeDefined()
    })

    it('should not have methods outside of interface contract', () => {
      const interfaceMethods = [
        'fetchConfig',
        'updateConfig',
        'fetchTemplates',
        'saveTemplate',
        'deleteTemplate',
        'applyTemplate'
      ]

      const actualMethods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(service)
      ).filter(name => name !== 'constructor')

      expect(actualMethods.sort()).toEqual(interfaceMethods.sort())
    })
  })
})