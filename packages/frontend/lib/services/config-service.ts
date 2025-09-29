import {
  IConfigService,
  ConfigData,
  ConfigTemplate,
  ScraperConfig,
  CleanerConfig
} from './interfaces'

/**
 * Configuration service implementation
 * Handles all configuration-related operations following SRP
 */
export class ConfigService implements IConfigService {
  private baseUrl = '/api/config'

  async fetchConfig(): Promise<ConfigData> {
    try {
      const [scrapersRes, cleanersRes] = await Promise.all([
        fetch(`${this.baseUrl}/scrapers`),
        fetch(`${this.baseUrl}/cleaners`)
      ])

      if (!scrapersRes.ok || !cleanersRes.ok) {
        throw new Error('Failed to fetch configuration')
      }

      const scrapersData = await scrapersRes.json()
      const cleanersData = await cleanersRes.json()

      return {
        scrapers: scrapersData.data || [],
        cleaners: cleanersData.data || []
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
      throw error
    }
  }

  async updateConfig(config: Partial<ConfigData>): Promise<void> {
    try {
      const requests = []

      if (config.scrapers) {
        requests.push(
          fetch(`${this.baseUrl}/scrapers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scrapers: config.scrapers })
          })
        )
      }

      if (config.cleaners) {
        requests.push(
          fetch(`${this.baseUrl}/cleaners`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cleaners: config.cleaners })
          })
        )
      }

      const responses = await Promise.all(requests)
      const failed = responses.find(r => !r.ok)

      if (failed) {
        throw new Error('Failed to update configuration')
      }
    } catch (error) {
      console.error('Failed to update config:', error)
      throw error
    }
  }

  async fetchTemplates(): Promise<ConfigTemplate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`)
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      throw error
    }
  }

  async saveTemplate(template: Omit<ConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConfigTemplate> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      })

      if (!response.ok) {
        throw new Error('Failed to save template')
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Failed to save template:', error)
      throw error
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      throw error
    }
  }

  async applyTemplate(templateId: string, urlIds?: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlIds })
      })

      if (!response.ok) {
        throw new Error('Failed to apply template')
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
      throw error
    }
  }
}

// Singleton instance
let configServiceInstance: ConfigService | null = null

export function getConfigService(): IConfigService {
  if (!configServiceInstance) {
    configServiceInstance = new ConfigService()
  }
  return configServiceInstance
}