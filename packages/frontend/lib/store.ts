import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Url {
  id: string
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  tags: string[]
  scraperType?: string
  cleaners?: string[]
  processedAt?: string
  metadata?: any
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

  // Actions
  fetchUrls: (params?: any) => Promise<void>
  addUrl: (url: string, tags?: string[]) => Promise<void>
  addUrls: (urls: { url: string; tags?: string[] }[]) => Promise<void>
  updateUrl: (id: string, updates: Partial<Url>) => Promise<void>
  deleteUrl: (id: string) => Promise<void>
  selectUrl: (id: string) => void
  deselectUrl: (id: string) => void
  selectAllUrls: () => void
  deselectAllUrls: () => void

  fetchTags: () => Promise<void>
  createTag: (name: string, parentName?: string) => Promise<void>
  updateTag: (id: number, updates: Partial<Tag>) => Promise<void>
  deleteTag: (id: number) => Promise<void>

  processUrl: (id: string, options?: any) => Promise<void>
  processUrls: (ids: string[], options?: any) => Promise<void>
  processByTags: (tags: string[], options?: any) => Promise<void>

  fetchStats: () => Promise<void>

  updateProcessingTask: (task: ProcessingTask) => void
  removeProcessingTask: (id: string) => void
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
        try {
          const response = await fetch('/api/urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, tags })
          })
          const data = await response.json()
          if (data.success) {
            get().fetchUrls()
          }
        } catch (error) {
          console.error('Failed to add URL:', error)
        }
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
          }
        } catch (error) {
          console.error('Failed to fetch tags:', error)
          set({ tagsLoading: false })
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
        try {
          const response = await fetch(`/api/tags/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          })
          const data = await response.json()
          if (data.success) {
            get().fetchTags()
          }
        } catch (error) {
          console.error('Failed to update tag:', error)
        }
      },

      deleteTag: async (id) => {
        try {
          const response = await fetch(`/api/tags/${id}`, {
            method: 'DELETE'
          })
          const data = await response.json()
          if (data.success) {
            get().fetchTags()
          }
        } catch (error) {
          console.error('Failed to delete tag:', error)
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
      }
    }),
    {
      name: 'kb3-store'
    }
  )
)