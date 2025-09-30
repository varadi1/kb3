/**
 * Parameter Configuration Service
 * Single Responsibility: Handle all parameter-related API operations
 * Interface Segregation: Implements focused interface for parameter management
 */

import { ScraperConfig } from '../services/interfaces'

export interface ParameterSchema {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'select'
  description: string
  required?: boolean
  default?: any
  options?: Array<{ value: any; label: string }>
  min?: number
  max?: number
  properties?: Record<string, ParameterSchema>
  items?: ParameterSchema
  group?: string
}

export interface ScraperParameterSchema {
  scraperType: string
  displayName: string
  description: string
  parameters: Record<string, ParameterSchema>
  groups?: Array<{ name: string; label: string; description?: string }>
}

export interface ParameterValidationResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
  normalizedParams?: Record<string, any>
}

export interface ParameterStatistics {
  total: number
  byScraperType: Record<string, number>
  byPriority: Record<number, number>
}

export interface IParameterConfigService {
  // Schema operations
  getParameterSchema(scraperType: string): Promise<ScraperParameterSchema | null>
  getAllParameterSchemas(): Promise<ScraperParameterSchema[]>

  // Default values
  getDefaultParameters(scraperType: string): Promise<Record<string, any> | null>

  // Validation
  validateParameters(scraperType: string, parameters: Record<string, any>): Promise<ParameterValidationResult>

  // URL-specific parameters
  getUrlParameters(urlId: string): Promise<ScraperConfig | null>
  setUrlParameters(urlId: string, scraperType: string, parameters: Record<string, any>, priority?: number): Promise<void>
  deleteUrlParameters(urlId: string): Promise<void>

  // Batch operations
  setBatchParameters(urlIds: string[], scraperType: string, parameters: Record<string, any>, priority?: number): Promise<void>

  // Statistics
  getParameterStatistics(): Promise<ParameterStatistics>
}

class ParameterConfigService implements IParameterConfigService {
  private baseUrl = '/api/config'
  private cache = new Map<string, { data: any; timestamp: number }>()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  private async fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T
    }

    const data = await fetcher()
    this.cache.set(key, { data, timestamp: Date.now() })
    return data
  }

  async getParameterSchema(scraperType: string): Promise<ScraperParameterSchema | null> {
    const cacheKey = `schema:${scraperType}`

    return this.fetchWithCache(cacheKey, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/scrapers/${scraperType}/schema`)
        const result = await response.json()

        if (!result.success) {
          return null
        }

        return result.data as ScraperParameterSchema
      } catch (error) {
        console.error(`Failed to fetch schema for ${scraperType}:`, error)
        return null
      }
    })
  }

  async getAllParameterSchemas(): Promise<ScraperParameterSchema[]> {
    const cacheKey = 'schemas:all'

    return this.fetchWithCache(cacheKey, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/scrapers/schemas`)
        const result = await response.json()

        if (!result.success) {
          return []
        }

        return result.data as ScraperParameterSchema[]
      } catch (error) {
        console.error('Failed to fetch all schemas:', error)
        return []
      }
    })
  }

  async getDefaultParameters(scraperType: string): Promise<Record<string, any> | null> {
    const cacheKey = `defaults:${scraperType}`

    return this.fetchWithCache(cacheKey, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/scrapers/${scraperType}/defaults`)
        const result = await response.json()

        if (!result.success) {
          return null
        }

        return result.data
      } catch (error) {
        console.error(`Failed to fetch defaults for ${scraperType}:`, error)
        return null
      }
    })
  }

  // Alias for SOLID test compatibility
  async getParameterDefaults(scraperType: string): Promise<Record<string, any> | null> {
    return this.getDefaultParameters(scraperType)
  }

  async validateParameters(
    scraperType: string,
    parameters: Record<string, any>
  ): Promise<ParameterValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/scrapers/${scraperType}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters })
      })

      const result = await response.json()
      return result.data || { valid: false, errors: ['Validation failed'] }
    } catch (error) {
      console.error('Validation error:', error)
      return {
        valid: false,
        errors: ['Failed to validate parameters']
      }
    }
  }

  async getUrlParameters(urlId: string): Promise<ScraperConfig | null> {
    try {
      const response = await fetch(`${this.baseUrl}/url/${encodeURIComponent(urlId)}/parameters`)
      const result = await response.json()

      if (!result.success || !result.data) {
        return null
      }

      return {
        type: result.data.scraperType || result.data.type,
        parameters: result.data.parameters || {},
        priority: result.data.priority,
        enabled: result.data.enabled !== false
      }
    } catch (error) {
      console.error(`Failed to fetch parameters for URL ${urlId}:`, error)
      return null
    }
  }

  async setUrlParameters(
    urlId: string,
    scraperType: string,
    parameters: Record<string, any>,
    priority?: number
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/url/${encodeURIComponent(urlId)}/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scraperType,
          parameters,
          priority: priority || 10,
          enabled: true
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to save parameters')
      }

      // Clear cache for this URL
      this.clearUrlCache(urlId)
    } catch (error) {
      console.error(`Failed to save parameters for URL ${urlId}:`, error)
      throw error
    }
  }

  async deleteUrlParameters(urlId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/url/${encodeURIComponent(urlId)}/parameters`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to delete parameters')
      }

      // Clear cache for this URL
      this.clearUrlCache(urlId)
    } catch (error) {
      console.error(`Failed to delete parameters for URL ${urlId}:`, error)
      throw error
    }
  }

  async setBatchParameters(
    urlIds: string[],
    scraperType: string,
    parameters: Record<string, any>,
    priority?: number
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlIds,
          scraperType,
          parameters,
          priority: priority || 10,
          enabled: true
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to save batch parameters')
      }

      // Clear cache for all affected URLs
      urlIds.forEach(id => this.clearUrlCache(id))
    } catch (error) {
      console.error('Failed to save batch parameters:', error)
      throw error
    }
  }

  async getParameterStatistics(): Promise<ParameterStatistics> {
    const cacheKey = 'stats:parameters'

    return this.fetchWithCache(cacheKey, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/parameters/stats`)
        const result = await response.json()

        if (!result.success) {
          return {
            total: 0,
            byScraperType: {},
            byPriority: {}
          }
        }

        return result.data as ParameterStatistics
      } catch (error) {
        console.error('Failed to fetch parameter statistics:', error)
        return {
          total: 0,
          byScraperType: {},
          byPriority: {}
        }
      }
    })
  }

  private clearUrlCache(urlId: string): void {
    // Clear any cached data related to this URL
    Array.from(this.cache.keys()).forEach(key => {
      if (key.includes(urlId)) {
        this.cache.delete(key)
      }
    })
  }

  clearAllCache(): void {
    this.cache.clear()
  }
}

// Singleton instance
let parameterServiceInstance: ParameterConfigService | null = null

export function getParameterService(): ParameterConfigService {
  if (!parameterServiceInstance) {
    parameterServiceInstance = new ParameterConfigService()
  }
  return parameterServiceInstance
}