/**
 * Service interfaces following Interface Segregation Principle (ISP)
 * Each interface is focused on a specific responsibility
 */

export interface ScraperConfig {
  type: string
  enabled: boolean
  priority: number
  parameters: Record<string, any>
}

export interface CleanerConfig {
  type: string
  enabled: boolean
  order: number
  parameters: Record<string, any>
}

export interface ConfigData {
  scrapers: ScraperConfig[]
  cleaners: CleanerConfig[]
  templates?: ConfigTemplate[]
}

export interface ConfigTemplate {
  id: string
  name: string
  description?: string
  scraperConfigs: ScraperConfig[]
  cleanerConfigs: CleanerConfig[]
  createdAt: string
  updatedAt: string
}

export interface IConfigService {
  fetchConfig(): Promise<ConfigData>
  updateConfig(config: Partial<ConfigData>): Promise<void>
  fetchTemplates(): Promise<ConfigTemplate[]>
  saveTemplate(template: Omit<ConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConfigTemplate>
  deleteTemplate(id: string): Promise<void>
  applyTemplate(templateId: string, urlIds?: string[]): Promise<void>
}

export interface IConfigExtendedService extends IConfigService {
  getScrapers(): Promise<ScraperConfig[]>
  getCleaners(): Promise<CleanerConfig[]>
  setUrlScraperConfig(urlId: string, config: ScraperConfig): Promise<void>
}

export interface ImportResult {
  count: number
  successful: number
  failed: number
  errors?: string[]
}

export interface ExportData {
  content: string
  mimeType: string
  count: number
  format: 'json' | 'csv' | 'txt'
}

export interface IImportExportService {
  importUrls(content: string, format: 'json' | 'csv' | 'txt'): Promise<ImportResult>
  exportData(format: 'json' | 'csv' | 'txt', urlIds?: string[]): Promise<ExportData>
  validateImport(content: string, format: 'json' | 'csv' | 'txt'): Promise<{ valid: boolean; errors?: string[] }>
}

export interface IAuthorityService {
  updateUrlAuthority(urlId: string, authority: number): Promise<void>
  batchUpdateAuthority(urlIds: string[], authority: number): Promise<void>
  getAuthorityLevels(): Promise<{ level: number; name: string; description: string }[]>
}

export interface IContentService {
  downloadOriginal(urlId: string): Promise<Blob>
  downloadCleaned(urlId: string): Promise<Blob>
  getContentMetadata(urlId: string): Promise<any>
  reprocessContent(urlId: string, options?: any): Promise<void>
  compareContent(urlId: string): Promise<{ original: string; cleaned: string; changes: any[] }>
}

export interface IUrlConfigService {
  setUrlScraperConfig(urlId: string, config: ScraperConfig): Promise<void>
  setUrlCleanerConfig(urlId: string, configs: CleanerConfig[]): Promise<void>
  getUrlConfig(urlId: string): Promise<{ scrapers?: ScraperConfig; cleaners?: CleanerConfig[] }>
  batchSetConfig(urlIds: string[], config: { scrapers?: ScraperConfig; cleaners?: CleanerConfig[] }): Promise<void>
}

export interface IBatchOperationsService {
  batchAssignTags(urlIds: string[], tags: string[]): Promise<void>
  batchRemoveTags(urlIds: string[], tags: string[]): Promise<void>
  batchUpdateMetadata(urlIds: string[], metadata: Record<string, any>): Promise<void>
  batchProcess(urlIds: string[], options?: any): Promise<void>
  batchDelete(urlIds: string[]): Promise<void>
}

export interface ParameterSchema {
  [key: string]: any
}

export interface ParameterDefaults {
  [key: string]: any
}

export interface IParameterService {
  getParameterSchema(scraperType: string): Promise<ParameterSchema>
  validateParameters(scraperType: string, parameters: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }>
  getParameterDefaults(scraperType: string): Promise<ParameterDefaults>
}