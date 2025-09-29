import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { getConfigService } from './services/config-service'
import { getImportExportService } from './services/import-export-service'
import { getParameterService } from './services/parameter-service'
import type { ConfigData, ImportResult, ExportData, ScraperConfig, CleanerConfig } from './services/interfaces'
import type { ScraperParameterSchema, ParameterValidationResult } from './services/parameter-service'

export interface Url {
  id: string
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  tags: string[]
  scraperType?: string
  cleaners?: string[]
  processedAt?: string
  metadata?: any
  authority?: number // Added authority field
  scraperConfig?: ScraperConfig // Added URL-specific scraper config
  cleanerConfigs?: CleanerConfig[] // Added URL-specific cleaner configs
}

export interface Tag {
  id: number
  name: string
  parent_id?: number
  description?: string
  color?: string
  children?: Tag[]
  created_at: string
}

export interface ProcessingTask {
  id: string
  url: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  message?: string
  startedAt?: string
  completedAt?: string
}

export interface Stats {
  totalUrls: number
  processedUrls: number
  failedUrls: number
  processing: number
  queue: number
  tags: number
  totalSize: number
}

interface Kb3State {
  // URLs
  urls: Url[]
  selectedUrls: Set<string>
  urlsLoading: boolean

  // Tags
  tags: Tag[]
  tagsLoading: boolean

  // Processing
  processingTasks: Map<string, ProcessingTask>

  // Stats
  stats: Stats | null

  // Configuration
  configData: ConfigData | null
  configLoading: boolean

  // Actions - URLs
  fetchUrls: (params?: any) => Promise<void>
  addUrl: (url: string, tags?: string[], notes?: string) => Promise<void>
  addUrls: (urls: { url: string; tags?: string[] }[]) => Promise<void>
  updateUrl: (id: string, updates: Partial<Url>) => Promise<void>
  deleteUrl: (id: string) => Promise<void>
  deleteUrls: (ids: string[]) => Promise<void>
  selectUrl: (id: string) => void
  deselectUrl: (id: string) => void
  selectAllUrls: () => void
  deselectAllUrls: () => void

  // Actions - Tags
  fetchTags: () => Promise<Tag[]>
  createTag: (name: string, parentName?: string) => Promise<void>
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>
  deleteTag: (id: string) => Promise<void>

  // Actions - Processing
  processUrl: (id: string, options?: any) => Promise<void>
  processUrls: (ids: string[], options?: any) => Promise<void>
  processByTags: (tags: string[], options?: any) => Promise<void>

  // Actions - Stats
  fetchStats: () => Promise<void>

  // Actions - Configuration
  fetchConfig: () => Promise<ConfigData>
  updateConfig: (config: Partial<ConfigData>) => Promise<void>

  // Actions - Import/Export
  importUrls: (content: string, format: 'json' | 'csv' | 'txt') => Promise<ImportResult>
  exportData: (format: 'json' | 'csv' | 'txt') => Promise<ExportData>

  // Actions - Batch Operations
  batchUpdateUrls: (ids: string[], updates: Partial<Url>) => Promise<void>
  batchAssignTags: (ids: string[], tags: string[]) => Promise<void>
  batchUpdateAuthority: (ids: string[], authority: number) => Promise<void>
  setUrlScraperConfig: (id: string, config: ScraperConfig) => Promise<void>
  setUrlCleanerConfigs: (id: string, configs: CleanerConfig[]) => Promise<void>

  // Actions - Content
  downloadContent: (id: string, type: 'original' | 'cleaned') => Promise<void>

  // Processing Tasks
  updateProcessingTask: (task: ProcessingTask) => void
  removeProcessingTask: (id: string) => void

  // Actions - Advanced Parameters
  getParameterSchema: (scraperType: string) => Promise<ScraperParameterSchema | null>
  getAllParameterSchemas: () => Promise<ScraperParameterSchema[]>
  getParameterDefaults: (scraperType: string) => Promise<Record<string, any> | null>
  validateParameters: (scraperType: string, parameters: Record<string, any>) => Promise<ParameterValidationResult>
  getUrlParameterConfig: (urlId: string) => Promise<ScraperConfig | null>
  setUrlParameterConfig: (urlId: string, scraperType: string, parameters: Record<string, any>, priority?: number) => Promise<void>
  deleteUrlParameterConfig: (urlId: string) => Promise<void>
  setBatchParameterConfig: (urlIds: string[], scraperType: string, parameters: Record<string, any>, priority?: number) => Promise<void>
}

export const useKb3Store = create<Kb3State>()(
  devtools(
    (set, get) => ({
      // Initial state
      urls: [],
      selectedUrls: new Set(),
      urlsLoading: false,
      tags: [],
      tagsLoading: false,
      processingTasks: new Map(),
      stats: null,
      configData: null,
      configLoading: false,

      // URL Actions
      fetchUrls: async (params) => {
        set({ urlsLoading: true })
        try {
          const queryParams = new URLSearchParams(params).toString()
          const response = await fetch(`/api/urls?${queryParams}`)
          const data = await response.json()
          if (data.success) {
            set({ urls: data.data, urlsLoading: false })
          }
        } catch (error) {
          console.error('Failed to fetch URLs:', error)
          set({ urlsLoading: false })
        }
      },

      addUrl: async (url, tags) => {
        const response = await fetch('/api/urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, tags })
        })
        const data = await response.json()

        // Check both HTTP status and response success flag
        if (!response.ok || !data.success) {
          // Throw error with the message from the backend
          throw new Error(data.error || 'Failed to add URL')
        }

        // Only refresh URLs if the addition was successful
        get().fetchUrls()
        return data
      },

      addUrls: async (urls) => {
        try {
          const response = await fetch('/api/urls/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls })
          })
          const data = await response.json()
          if (data.success) {
            get().fetchUrls()
          }
        } catch (error) {
          console.error('Failed to add URLs:', error)
        }
      },

      updateUrl: async (id, updates) => {
        try {
          const response = await fetch(`/api/urls/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          })
          const data = await response.json()
          if (data.success) {
            set((state) => ({
              urls: state.urls.map(u =>
                u.id === id ? { ...u, ...updates } : u
              )
            }))
          }
        } catch (error) {
          console.error('Failed to update URL:', error)
        }
      },

      deleteUrl: async (id) => {
        try {
          const response = await fetch(`/api/urls/${id}`, {
            method: 'DELETE'
          })
          const data = await response.json()
          if (data.success) {
            set((state) => ({
              urls: state.urls.filter(u => u.id !== id),
              selectedUrls: new Set([...state.selectedUrls].filter(uid => uid !== id))
            }))
          }
        } catch (error) {
          console.error('Failed to delete URL:', error)
        }
      },

      deleteUrls: async (ids) => {
        try {
          const response = await fetch('/api/urls/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urlIds: ids })
          })
          const data = await response.json()

          if (data.success || data.data?.successful > 0) {
            // Remove deleted URLs from local state
            const deletedIds = ids.filter((id, index) =>
              !data.data?.failedUrls?.includes(ids[index])
            )

            set((state) => ({
              urls: state.urls.filter(u => !deletedIds.includes(u.id)),
              selectedUrls: new Set([...state.selectedUrls].filter(uid => !deletedIds.includes(uid)))
            }))

            // Refresh to ensure consistency
            get().fetchUrls()
          }

          // Throw error if some deletions failed for UI feedback
          if (data.data?.failedUrls?.length > 0) {
            throw new Error(`Failed to delete ${data.data.failedUrls.length} URLs`)
          }
        } catch (error) {
          console.error('Failed to delete URLs:', error)
          throw error
        }
      },

      selectUrl: (id) => {
        set((state) => ({
          selectedUrls: new Set([...state.selectedUrls, id])
        }))
      },

      deselectUrl: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedUrls)
          newSelected.delete(id)
          return { selectedUrls: newSelected }
        })
      },

      selectAllUrls: () => {
        set((state) => ({
          selectedUrls: new Set(state.urls.map(u => u.id))
        }))
      },

      deselectAllUrls: () => {
        set({ selectedUrls: new Set() })
      },

      // Tag Actions
      fetchTags: async () => {
        set({ tagsLoading: true })
        try {
          const response = await fetch('/api/tags')
          const data = await response.json()
          if (data.success) {
            set({ tags: data.data, tagsLoading: false })
            return data.data
          }
          return []
        } catch (error) {
          console.error('Failed to fetch tags:', error)
          set({ tagsLoading: false })
          return []
        }
      },

      createTag: async (name, parentName) => {
        try {
          const response = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentName })
          })
          const data = await response.json()
          if (data.success) {
            get().fetchTags()
          }
        } catch (error) {
          console.error('Failed to create tag:', error)
        }
      },

      updateTag: async (id, updates) => {
        const response = await fetch(`/api/tags/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to update tag' }))
          throw new Error(errorData.message || 'Failed to update tag')
        }

        const data = await response.json()
        if (data.success) {
          get().fetchTags()
        } else {
          throw new Error(data.message || 'Failed to update tag')
        }
      },

      deleteTag: async (id) => {
        const response = await fetch(`/api/tags/${id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to delete tag' }))
          throw new Error(errorData.message || 'Failed to delete tag')
        }

        const data = await response.json()
        if (data.success) {
          get().fetchTags()
        } else {
          throw new Error(data.message || 'Failed to delete tag')
        }
      },

      // Processing Actions
      processUrl: async (id, options) => {
        try {
          const task: ProcessingTask = {
            id,
            url: id,
            status: 'queued',
            progress: 0,
            startedAt: new Date().toISOString()
          }
          get().updateProcessingTask(task)

          const response = await fetch(`/api/process/url/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options || {})
          })
          const data = await response.json()

          if (data.success) {
            get().fetchUrls()
            get().removeProcessingTask(id)
          }
        } catch (error) {
          console.error('Failed to process URL:', error)
          get().removeProcessingTask(id)
        }
      },

      processUrls: async (ids, options) => {
        try {
          const response = await fetch('/api/process/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: ids, options })
          })
          const data = await response.json()
          if (data.success) {
            get().fetchUrls()
          }
        } catch (error) {
          console.error('Failed to process URLs:', error)
        }
      },

      processByTags: async (tags, options) => {
        try {
          const response = await fetch('/api/process/by-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags, ...options })
          })
          const data = await response.json()
          if (data.success) {
            get().fetchUrls()
          }
        } catch (error) {
          console.error('Failed to process by tags:', error)
        }
      },

      // Stats
      fetchStats: async () => {
        try {
          const response = await fetch('/api/process/queue')
          const data = await response.json()
          if (data.success) {
            set({ stats: data.data })
          }
        } catch (error) {
          console.error('Failed to fetch stats:', error)
        }
      },

      // Processing Tasks
      updateProcessingTask: (task) => {
        set((state) => {
          const newTasks = new Map(state.processingTasks)
          newTasks.set(task.id, task)
          return { processingTasks: newTasks }
        })
      },

      removeProcessingTask: (id) => {
        set((state) => {
          const newTasks = new Map(state.processingTasks)
          newTasks.delete(id)
          return { processingTasks: newTasks }
        })
      },

      // Parameter Actions
      getParameterSchema: async (scraperType) => {
        const parameterService = getParameterService()
        try {
          return await parameterService.getParameterSchema(scraperType)
        } catch (error) {
          console.error('Failed to get parameter schema:', error)
          return null
        }
      },

      getAllParameterSchemas: async () => {
        const parameterService = getParameterService()
        try {
          return await parameterService.getAllParameterSchemas()
        } catch (error) {
          console.error('Failed to get all parameter schemas:', error)
          return []
        }
      },

      getParameterDefaults: async (scraperType) => {
        const parameterService = getParameterService()
        try {
          return await parameterService.getDefaultParameters(scraperType)
        } catch (error) {
          console.error('Failed to get parameter defaults:', error)
          return null
        }
      },

      validateParameters: async (scraperType, parameters) => {
        const parameterService = getParameterService()
        try {
          return await parameterService.validateParameters(scraperType, parameters)
        } catch (error) {
          console.error('Failed to validate parameters:', error)
          return { valid: false, errors: ['Validation failed'] }
        }
      },

      getUrlParameterConfig: async (urlId) => {
        const parameterService = getParameterService()
        try {
          return await parameterService.getUrlParameters(urlId)
        } catch (error) {
          console.error('Failed to get URL parameter config:', error)
          return null
        }
      },

      setUrlParameterConfig: async (urlId, scraperType, parameters, priority) => {
        const parameterService = getParameterService()
        try {
          await parameterService.setUrlParameters(urlId, scraperType, parameters, priority)
          // Update local state if needed
          set((state) => ({
            urls: state.urls.map(u =>
              u.id === urlId
                ? { ...u, scraperConfig: { type: scraperType, enabled: true, priority: priority || 10, parameters } }
                : u
            )
          }))
        } catch (error) {
          console.error('Failed to set URL parameter config:', error)
          throw error
        }
      },

      deleteUrlParameterConfig: async (urlId) => {
        const parameterService = getParameterService()
        try {
          await parameterService.deleteUrlParameters(urlId)
          // Update local state if needed
          set((state) => ({
            urls: state.urls.map(u =>
              u.id === urlId
                ? { ...u, scraperConfig: undefined }
                : u
            )
          }))
        } catch (error) {
          console.error('Failed to delete URL parameter config:', error)
          throw error
        }
      },

      setBatchParameterConfig: async (urlIds, scraperType, parameters, priority) => {
        const parameterService = getParameterService()
        try {
          await parameterService.setBatchParameters(urlIds, scraperType, parameters, priority)
          // Update local state if needed
          set((state) => ({
            urls: state.urls.map(u =>
              urlIds.includes(u.id)
                ? { ...u, scraperConfig: { type: scraperType, enabled: true, priority: priority || 10, parameters } }
                : u
            )
          }))
        } catch (error) {
          console.error('Failed to set batch parameter config:', error)
          throw error
        }
      },

      // Configuration Actions
      fetchConfig: async () => {
        const configService = getConfigService()
        set({ configLoading: true })
        try {
          const config = await configService.fetchConfig()
          set({ configData: config, configLoading: false })
          return config
        } catch (error) {
          console.error('Failed to fetch config:', error)
          set({ configLoading: false })
          throw error
        }
      },

      updateConfig: async (config) => {
        const configService = getConfigService()
        try {
          await configService.updateConfig(config)
          // Update local state
          set((state) => ({
            configData: state.configData ? { ...state.configData, ...config } : config as ConfigData
          }))
        } catch (error) {
          console.error('Failed to update config:', error)
          throw error
        }
      },

      // Import/Export Actions
      importUrls: async (content, format) => {
        const importExportService = getImportExportService()
        try {
          const result = await importExportService.importUrls(content, format)
          // Refresh URLs after successful import
          await get().fetchUrls()
          return result
        } catch (error) {
          console.error('Failed to import URLs:', error)
          throw error
        }
      },

      exportData: async (format) => {
        const importExportService = getImportExportService()
        try {
          const selectedIds = Array.from(get().selectedUrls)
          const urlIds = selectedIds.length > 0 ? selectedIds : undefined
          return await importExportService.exportData(format, urlIds)
        } catch (error) {
          console.error('Failed to export data:', error)
          throw error
        }
      },

      // Batch Operations
      batchUpdateUrls: async (ids, updates) => {
        try {
          const response = await fetch('/api/urls/batch-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, updates })
          })
          const data = await response.json()
          if (data.success) {
            // Update local state
            set((state) => ({
              urls: state.urls.map(u =>
                ids.includes(u.id) ? { ...u, ...updates } : u
              )
            }))
          }
        } catch (error) {
          console.error('Failed to batch update URLs:', error)
          throw error
        }
      },

      batchAssignTags: async (ids, tags) => {
        try {
          const response = await fetch('/api/urls/batch-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, tags, operation: 'add' })
          })
          const data = await response.json()
          if (data.success) {
            // Update local state
            set((state) => ({
              urls: state.urls.map(u =>
                ids.includes(u.id)
                  ? { ...u, tags: [...new Set([...u.tags, ...tags])] }
                  : u
              )
            }))
          }
        } catch (error) {
          console.error('Failed to batch assign tags:', error)
          throw error
        }
      },

      batchUpdateAuthority: async (ids, authority) => {
        try {
          await get().batchUpdateUrls(ids, { authority })
        } catch (error) {
          console.error('Failed to batch update authority:', error)
          throw error
        }
      },

      setUrlScraperConfig: async (id, config) => {
        try {
          const response = await fetch(`/api/config/url/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scraperConfig: config })
          })
          const data = await response.json()
          if (data.success) {
            // Update local state
            set((state) => ({
              urls: state.urls.map(u =>
                u.id === id ? { ...u, scraperConfig: config } : u
              )
            }))
          }
        } catch (error) {
          console.error('Failed to set URL scraper config:', error)
          throw error
        }
      },

      setUrlCleanerConfigs: async (id, configs) => {
        try {
          const response = await fetch(`/api/config/url/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cleanerConfigs: configs })
          })
          const data = await response.json()
          if (data.success) {
            // Update local state
            set((state) => ({
              urls: state.urls.map(u =>
                u.id === id ? { ...u, cleanerConfigs: configs } : u
              )
            }))
          }
        } catch (error) {
          console.error('Failed to set URL cleaner configs:', error)
          throw error
        }
      },

      // Queue Management Actions
      fetchQueue: async () => {
        try {
          const response = await fetch('/api/process/queue')
          const data = await response.json()

          // Ensure we always return an array
          if (data.success && data.data?.queue) {
            // Validate it's actually an array
            if (Array.isArray(data.data.queue)) {
              return data.data.queue
            } else {
              console.warn('Queue is not an array:', typeof data.data.queue, data.data.queue)
              return []
            }
          }
          return []
        } catch (error) {
          console.error('Failed to fetch queue:', error)
          return []
        }
      },

      startProcessing: async () => {
        try {
          const response = await fetch('/api/process/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          const data = await response.json()
          if (!data.success) {
            throw new Error(data.message || 'Failed to start processing')
          }
          return data
        } catch (error) {
          console.error('Failed to start processing:', error)
          throw error
        }
      },

      stopProcessing: async () => {
        try {
          const response = await fetch('/api/process/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          const data = await response.json()
          if (!data.success) {
            throw new Error(data.message || 'Failed to stop processing')
          }
          return data
        } catch (error) {
          console.error('Failed to stop processing:', error)
          throw error
        }
      },

      retryItem: async (id) => {
        try {
          const response = await fetch('/api/process/retry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: [id] })
          })
          const data = await response.json()
          if (!data.success) {
            throw new Error(data.message || 'Failed to retry item')
          }
          return data
        } catch (error) {
          console.error('Failed to retry item:', error)
          throw error
        }
      },

      clearCompleted: async () => {
        try {
          const response = await fetch('/api/process/completed', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          })
          const data = await response.json()
          if (!data.success) {
            throw new Error(data.message || 'Failed to clear completed items')
          }
          return data
        } catch (error) {
          console.error('Failed to clear completed items:', error)
          throw error
        }
      },

      // Content Actions
      downloadContent: async (id, type) => {
        try {
          const endpoint = type === 'original' ? 'original' : 'cleaned'
          const response = await fetch(`/api/content/${id}/${endpoint}`)

          if (!response.ok) {
            throw new Error('Failed to download content')
          }

          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${id}-${type}.txt`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } catch (error) {
          console.error('Failed to download content:', error)
          throw error
        }
      }
    }),
    {
      name: 'kb3-store'
    }
  )
)