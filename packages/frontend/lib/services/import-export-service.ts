import {
  IImportExportService,
  ImportResult,
  ExportData
} from './interfaces'

/**
 * Import/Export service implementation
 * Handles data import and export operations following SRP
 */
export class ImportExportService implements IImportExportService {
  private baseUrl = '/api/export'

  async importUrls(content: string, format: 'json' | 'csv' | 'txt'): Promise<ImportResult> {
    try {
      const response = await fetch(`${this.baseUrl}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, format })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Import failed')
      }

      const data = await response.json()
      return {
        count: data.data.total || 0,
        successful: data.data.successful || 0,
        failed: data.data.failed || 0,
        errors: data.data.errors
      }
    } catch (error) {
      console.error('Failed to import URLs:', error)
      throw error
    }
  }

  async exportData(format: 'json' | 'csv' | 'txt', urlIds?: string[]): Promise<ExportData> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, urlIds })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const data = await response.json()

      // Determine mime type based on format
      const mimeTypes = {
        json: 'application/json',
        csv: 'text/csv',
        txt: 'text/plain'
      }

      return {
        content: data.data.content,
        mimeType: mimeTypes[format],
        count: data.data.count || 0,
        format
      }
    } catch (error) {
      console.error('Failed to export data:', error)
      throw error
    }
  }

  async validateImport(content: string, format: 'json' | 'csv' | 'txt'): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, format })
      })

      if (!response.ok) {
        return { valid: false, errors: ['Validation request failed'] }
      }

      const data = await response.json()
      return {
        valid: data.data.valid,
        errors: data.data.errors
      }
    } catch (error) {
      console.error('Failed to validate import:', error)
      return {
        valid: false,
        errors: ['Failed to validate: ' + (error instanceof Error ? error.message : 'Unknown error')]
      }
    }
  }
}

// Singleton instance
let importExportServiceInstance: ImportExportService | null = null

export function getImportExportService(): IImportExportService {
  if (!importExportServiceInstance) {
    importExportServiceInstance = new ImportExportService()
  }
  return importExportServiceInstance
}