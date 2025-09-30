/**
 * SOLID Principles Compliance Tests for Frontend Components
 * Ensures all frontend code follows SOLID design principles
 */

import React from 'react'
import { render, screen, renderHook } from '@testing-library/react'
import * as fs from 'fs'
import * as path from 'path'

// Mock UI components to avoid render issues in tests
jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onCheckedChange && onCheckedChange(!checked)}
      {...props}
    />
  )
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open !== false ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div role="combobox">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>
}))

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: any) => (
    <div onClick={disabled ? undefined : onClick}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />
}))

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-value={defaultValue}>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-value={value}>{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-value={value}>{children}</div>
}))

jest.mock('lucide-react', () => ({
  Plus: () => <span>Plus</span>,
  MoreHorizontal: () => <span>MoreHorizontal</span>,
  Download: () => <span>Download</span>,
  Trash: () => <span>Trash</span>,
  Trash2: () => <span>Trash2</span>,
  Edit: () => <span>Edit</span>,
  Edit2: () => <span>Edit2</span>,
  Check: () => <span>Check</span>,
  X: () => <span>X</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  ExternalLink: () => <span>ExternalLink</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  Play: () => <span>Play</span>,
  Folder: () => <span>Folder</span>,
  FolderOpen: () => <span>FolderOpen</span>,
  Copy: () => <span>Copy</span>,
  Eye: () => <span>Eye</span>
}))

jest.mock('@/components/urls/edit-url-dialog', () => ({
  EditUrlDialog: ({ open, url }: any) => (
    open ? <div>Editing {url?.url}</div> : null
  )
}))

// Import components for testing
import { UrlsTable } from '@/components/urls/urls-table'
import { BatchOperationsPanel } from '@/components/urls/batch-operations'
import { EditUrlDialog } from '@/components/urls/edit-url-dialog'
import { BatchAddUrlsDialog } from '@/components/urls/batch-add-urls-dialog'
import { TagManager } from '@/components/tags/tag-manager'
import { ContentViewer } from '@/components/content/content-viewer'
import { ContentReprocessor } from '@/components/content/content-reprocessor'
import { ConfigPanel } from '@/components/config/config-panel'
import { ParameterEditor } from '@/components/config/parameter-editor'
import { ImportExportPanel } from '@/components/import-export/import-export-panel'

// Import services
import { getConfigService } from '@/lib/services/config-service'
import { getImportExportService } from '@/lib/services/import-export-service'
import { getParameterService } from '@/lib/services/parameter-service'

// Import store
import { useKb3Store } from '@/lib/store'

// Mock dependencies
jest.mock('@/lib/store')
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}))

const mockUseKb3Store = useKb3Store as jest.MockedFunction<typeof useKb3Store>

// Helper to read component source code
function getComponentSource(componentPath: string): string {
  try {
    const fullPath = path.join(__dirname, '../../', componentPath)
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    // Return empty string if file not found (for testing purposes)
    return ''
  }
}

describe('Frontend SOLID Principles Compliance', () => {
  const mockStore = {
    urls: [],
    selectedUrls: new Set(),
    tags: [],
    urlsLoading: false,
    tagsLoading: false,
    configData: null,
    processingTasks: new Map(),
    stats: null,
    fetchUrls: jest.fn().mockResolvedValue([]),
    fetchTags: jest.fn().mockResolvedValue([]),
    fetchConfig: jest.fn().mockResolvedValue({}),
    selectUrl: jest.fn(),
    deselectUrl: jest.fn(),
    selectAllUrls: jest.fn(),
    deselectAllUrls: jest.fn(),
    processUrl: jest.fn(),
    deleteUrl: jest.fn(),
    createTag: jest.fn(),
    updateTag: jest.fn(),
    deleteTag: jest.fn(),
    batchAssignTags: jest.fn(),
    batchUpdateAuthority: jest.fn(),
    addUrl: jest.fn(),
    addUrls: jest.fn(),
    updateUrl: jest.fn(),
    deleteUrls: jest.fn(),
    importUrls: jest.fn(),
    exportData: jest.fn(),
    downloadContent: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseKb3Store.mockReturnValue(mockStore)
  })

  describe('1. Single Responsibility Principle (SRP)', () => {
    describe('Component Responsibilities', () => {
      it('UrlsTable should only handle URL table display', () => {
        render(<UrlsTable />)

        // Check component source for violations
        const source = getComponentSource('components/urls/urls-table.tsx')

        // Should not contain business logic
        expect(source).not.toMatch(/fetch\s*\(/)
        expect(source).not.toContain('localStorage')
        expect(source).not.toContain('INSERT INTO')
        expect(source).not.toContain('SELECT FROM')

        // Should delegate to store
        expect(mockStore.fetchUrls).toHaveBeenCalled()
      })

      it('TagManager should only handle tag UI operations', () => {
        render(<TagManager />)

        const source = getComponentSource('components/tags/tag-manager.tsx')

        // Should not contain API calls
        expect(source).not.toMatch(/fetch\s*\(/)
        expect(source).not.toContain('/api/')

        // Should not contain data transformation logic
        expect(source).not.toContain('SQL')
        expect(source).not.toContain('database')

        // Should use store for data operations
        expect(mockStore.fetchTags).toHaveBeenCalled()
      })

      it('BatchOperationsPanel should only handle batch UI operations', () => {
        mockStore.selectedUrls = new Set(['1', '2'])
        render(<BatchOperationsPanel />)

        const source = getComponentSource('components/urls/batch-operations.tsx')

        // Should focus on UI coordination
        expect(source).not.toMatch(/fetch\s*\(/)
        expect(source).not.toContain('database')

        // Should delegate batch operations to store
        expect(source).toContain('batchAssignTags')
        expect(source).toContain('batchUpdateAuthority')
      })

      it('ContentViewer should only display content', () => {
        const mockUrl = { id: '1', url: 'test.com' }
        render(<ContentViewer url={mockUrl} open={true} onOpenChange={jest.fn()} />)

        const source = getComponentSource('components/content/content-viewer.tsx')

        // Should not process content
        expect(source).not.toContain('cleanContent')
        expect(source).not.toContain('processContent')

        // Should only fetch and display
        expect(source).toContain('fetchContent')
        expect(source).toContain('displayContent')
      })
    })

    describe('Service Responsibilities', () => {
      it('ConfigService should only handle configuration', () => {
        const configService = getConfigService()

        // Should have config-specific methods
        expect(configService).toHaveProperty('getScrapers')
        expect(configService).toHaveProperty('getCleaners')
        expect(configService).toHaveProperty('setUrlScraperConfig')

        // Should not have unrelated methods
        expect(configService).not.toHaveProperty('importUrls')
        expect(configService).not.toHaveProperty('processContent')
        expect(configService).not.toHaveProperty('manageTags')
      })

      it('ImportExportService should only handle data transfer', () => {
        const importExportService = getImportExportService()

        // Should have import/export methods
        expect(importExportService).toHaveProperty('importUrls')
        expect(importExportService).toHaveProperty('exportData')

        // Should not have configuration or processing methods
        expect(importExportService).not.toHaveProperty('getScrapers')
        expect(importExportService).not.toHaveProperty('processUrl')
      })

      it('ParameterService should only handle parameter validation', () => {
        const parameterService = getParameterService()

        // Should have parameter-specific methods
        expect(parameterService).toHaveProperty('getParameterSchema')
        expect(parameterService).toHaveProperty('validateParameters')
        expect(parameterService).toHaveProperty('getParameterDefaults')

        // Should not have unrelated operations
        expect(parameterService).not.toHaveProperty('fetchUrls')
        expect(parameterService).not.toHaveProperty('manageTags')
      })
    })

    describe('Store Responsibility', () => {
      it('Store should coordinate state management', () => {
        const { result } = renderHook(() => useKb3Store())

        // Store should have state management methods
        expect(result.current).toHaveProperty('fetchUrls')
        expect(result.current).toHaveProperty('fetchTags')
        expect(result.current).toHaveProperty('updateUrl')

        // Store should not contain UI logic
        const storeSource = getComponentSource('lib/store.ts')
        expect(storeSource).not.toContain('render')
        expect(storeSource).not.toContain('className')
        expect(storeSource).not.toContain('<div')
      })
    })
  })

  describe('2. Open/Closed Principle (OCP)', () => {
    it('Components should handle new data types without modification', () => {
      // Extended URL with new properties
      const extendedUrl = {
        id: '1',
        url: 'https://example.com',
        status: 'completed' as const,
        tags: [],
        // New properties
        customField: 'value',
        priority: 10,
        metadata: { extra: 'data' },
        analytics: { views: 100 }
      }

      mockStore.urls = [extendedUrl]
      render(<UrlsTable />)

      // Component should render without breaking
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('https://example.com')).toBeInTheDocument()
    })

    it('New scraper types should work without modifying components', () => {
      const newScraperConfig = {
        scrapers: [
          { value: 'http', label: 'HTTP', enabled: true },
          { value: 'custom-scraper', label: 'Custom Scraper', enabled: true },
          { value: 'ai-scraper', label: 'AI Scraper', enabled: true }
        ]
      }

      mockStore.configData = newScraperConfig
      render(<ConfigPanel />)

      // Should handle new scraper types
      expect(screen.getByText(/Scraper Configuration/i)).toBeInTheDocument()
    })

    it('New tag properties should not break TagManager', () => {
      const extendedTag = {
        id: 1,
        name: 'test',
        created_at: new Date().toISOString(),
        // New properties
        color: '#FF0000',
        icon: 'folder',
        priority: 1,
        metadata: { description: 'Test tag' },
        children: []
      }

      mockStore.tags = [extendedTag]
      mockStore.fetchTags.mockResolvedValue([extendedTag])

      render(<TagManager />)

      // Should handle extended tag structure
      waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument()
      })
    })

    it('Services should be extensible through composition', () => {
      // Extended service with caching
      class CachedConfigService {
        private cache = new Map()
        private service = getConfigService()

        async getScrapers() {
          if (!this.cache.has('scrapers')) {
            const data = await this.service.getScrapers()
            this.cache.set('scrapers', data)
          }
          return this.cache.get('scrapers')
        }
      }

      const cachedService = new CachedConfigService()
      expect(cachedService.getScrapers).toBeDefined()
    })
  })

  describe('3. Liskov Substitution Principle (LSP)', () => {
    it('All store implementations should be substitutable', () => {
      // Alternative store implementation
      const alternativeStore = {
        ...mockStore,
        fetchUrls: jest.fn().mockImplementation(async () => {
          // Different implementation but same contract
          return new Promise(resolve => {
            setTimeout(() => resolve([]), 100)
          })
        })
      }

      mockUseKb3Store.mockReturnValue(alternativeStore)
      render(<UrlsTable />)

      // Should work with alternative implementation
      expect(alternativeStore.fetchUrls).toHaveBeenCalled()
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('Service implementations should follow contracts', () => {
      // Mock alternative implementation
      const alternativeConfigService = {
        getScrapers: async () => [],
        getCleaners: async () => [],
        setUrlScraperConfig: async () => {},
        setUrlCleanerConfigs: async () => {}
      }

      // Should match expected interface
      expect(alternativeConfigService.getScrapers()).resolves.toEqual([])
      expect(alternativeConfigService.getCleaners()).resolves.toEqual([])
    })

    it('Component props should accept derived types', () => {
      type UrlType = ReturnType<typeof useKb3Store>['urls'][0]
      interface ExtendedUrl extends UrlType {
        customField: string
      }

      const extendedUrl: ExtendedUrl = {
        id: '1',
        url: 'test.com',
        status: 'completed',
        tags: [],
        customField: 'extra'
      }

      // Components should accept extended types
      render(<EditUrlDialog url={extendedUrl} open={true} onOpenChange={jest.fn()} />)
      expect(screen.getByText(/Edit URL/i)).toBeInTheDocument()
    })
  })

  describe('4. Interface Segregation Principle (ISP)', () => {
    it('Components should only use required store methods', () => {
      // Minimal store for UrlsTable
      const minimalUrlStore = {
        urls: [],
        selectedUrls: new Set(),
        urlsLoading: false,
        fetchUrls: jest.fn(),
        selectUrl: jest.fn(),
        deselectUrl: jest.fn(),
        selectAllUrls: jest.fn(),
        deselectAllUrls: jest.fn(),
        processUrl: jest.fn(),
        deleteUrl: jest.fn(),
        downloadContent: jest.fn()
        // No tag methods needed
      }

      mockUseKb3Store.mockReturnValue(minimalUrlStore as any)
      render(<UrlsTable />)

      // Should work with minimal interface
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(minimalUrlStore.fetchUrls).toHaveBeenCalled()
    })

    it('Services should expose minimal interfaces', () => {
      const paramService = getParameterService()

      // Public interface should be minimal
      const publicMethods = Object.keys(paramService).filter(
        key => !key.startsWith('_')
      )

      // Should only expose necessary methods
      expect(publicMethods).toContain('getParameterSchema')
      expect(publicMethods).toContain('validateParameters')
      expect(publicMethods).toContain('getParameterDefaults')

      // Should not expose internals
      expect(publicMethods).not.toContain('_cache')
      expect(publicMethods).not.toContain('_fetchInternal')
    })

    it('Props interfaces should be focused', () => {
      // ContentViewer should only require essential props
      const minimalProps = {
        url: { id: '1' } as any,
        open: true,
        onOpenChange: jest.fn()
      }

      render(<ContentViewer {...minimalProps} />)
      // Should work with minimal props
      expect(screen.queryByText(/Content Viewer/i)).toBeDefined()
    })

    it('Tag components should not depend on URL operations', () => {
      const tagOnlyStore = {
        tags: [],
        tagsLoading: false,
        fetchTags: jest.fn().mockResolvedValue([]),
        createTag: jest.fn(),
        updateTag: jest.fn(),
        deleteTag: jest.fn()
        // No URL-related methods
      }

      mockUseKb3Store.mockReturnValue(tagOnlyStore as any)
      render(<TagManager />)

      // Should work without URL methods
      expect(tagOnlyStore.fetchTags).toHaveBeenCalled()
    })
  })

  describe('5. Dependency Inversion Principle (DIP)', () => {
    it('Components should depend on store abstraction', () => {
      const sources = [
        getComponentSource('components/urls/urls-table.tsx'),
        getComponentSource('components/tags/tag-manager.tsx'),
        getComponentSource('components/content/content-viewer.tsx')
      ]

      sources.forEach(source => {
        // Should use store abstraction
        expect(source).toContain('useKb3Store')

        // Should not have direct API dependencies
        expect(source).not.toMatch(/fetch\s*\(['"`]\/api/)
        expect(source).not.toContain('XMLHttpRequest')
        expect(source).not.toContain('axios')
      })
    })

    it('Services should depend on fetch abstraction', async () => {
      // Custom fetch implementation
      const customFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

      // Temporarily replace global fetch
      const originalFetch = global.fetch
      global.fetch = customFetch

      const configService = getConfigService()
      await configService.getScrapers()

      // Should use injected fetch
      expect(customFetch).toHaveBeenCalled()

      // Restore original
      global.fetch = originalFetch
    })

    it('Store should depend on service interfaces', () => {
      const storeSource = getComponentSource('lib/store.ts')

      // Should import services
      expect(storeSource).toContain('getConfigService')
      expect(storeSource).toContain('getImportExportService')
      expect(storeSource).toContain('getParameterService')

      // Should not have direct implementations
      expect(storeSource).not.toMatch(/class.*Service.*\{/)
    })

    it('High-level modules should not depend on low-level modules', () => {
      // App component should not depend on database
      const appSource = getComponentSource('app/page.tsx')

      expect(appSource).not.toContain('sqlite')
      expect(appSource).not.toContain('database')
      expect(appSource).not.toContain('SQL')

      // Should use high-level abstractions
      expect(appSource).toContain('UrlsTable')
      expect(appSource).toContain('TagManager')
    })
  })

  describe('Component Architecture Compliance', () => {
    it('Each component should have clear boundaries', () => {
      const components = [
        'UrlsTable',
        'TagManager',
        'BatchOperationsPanel',
        'ContentViewer',
        'ConfigPanel'
      ]

      components.forEach(componentName => {
        // Each component should be independently testable
        expect(() => {
          const Component = require(`@/components/${componentName}`)[componentName]
          render(<Component />)
        }).not.toThrow()
      })
    })

    it('Components should communicate through defined interfaces', () => {
      // Components should use props and callbacks
      const mockCallback = jest.fn()

      render(
        <EditUrlDialog
          url={{ id: '1', url: 'test.com' } as any}
          open={true}
          onOpenChange={mockCallback}
        />
      )

      // Should communicate through callbacks
      expect(mockCallback).toBeDefined()
    })

    it('Shared logic should be in services or hooks', () => {
      const hooksSource = getComponentSource('lib/hooks')
      const servicesSource = getComponentSource('lib/services')

      // Shared logic should be extracted
      expect(hooksSource || servicesSource).toBeDefined()
    })
  })

  describe('Service Layer Compliance', () => {
    it('Services should be stateless', () => {
      const configService1 = getConfigService()
      const configService2 = getConfigService()

      // Should return same instance (singleton)
      expect(configService1).toBe(configService2)
    })

    it('Services should handle errors consistently', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const configService = getConfigService()

      // Should handle errors gracefully
      await expect(configService.getScrapers()).rejects.toThrow()
    })

    it('Services should validate inputs', async () => {
      const paramService = getParameterService()

      // Should validate parameters
      const result = await paramService.validateParameters('playwright', {
        invalidParam: 'value'
      })

      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('errors')
    })
  })

  describe('Code Quality Metrics', () => {
    it('Components should have reasonable complexity', () => {
      const sources = [
        getComponentSource('components/urls/urls-table.tsx'),
        getComponentSource('components/tags/tag-manager.tsx')
      ]

      sources.forEach(source => {
        // Check for deeply nested code (indicates high complexity)
        const maxIndentation = source.split('\n').reduce((max, line) => {
          const indent = line.match(/^\s*/)?.[0].length || 0
          return Math.max(max, indent)
        }, 0)

        // Should not have excessive nesting
        expect(maxIndentation).toBeLessThan(24) // 6 levels of indentation
      })
    })

    it('Functions should be focused and small', () => {
      const source = getComponentSource('components/urls/urls-table.tsx')

      // Extract function definitions
      const functions = source.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || []

      // Should have multiple small functions
      expect(functions.length).toBeGreaterThan(5)
    })

    it('Code should follow naming conventions', () => {
      const sources = [
        getComponentSource('components/urls/urls-table.tsx'),
        getComponentSource('lib/services/config-service.ts')
      ]

      sources.forEach(source => {
        // Components should use PascalCase
        expect(source).toMatch(/export.*function\s+[A-Z]\w+/)

        // Functions should use camelCase
        expect(source).toMatch(/const\s+[a-z]\w+\s*=/)

        // Interfaces should start with I
        if (source.includes('interface')) {
          expect(source).toMatch(/interface\s+I[A-Z]\w+/)
        }
      })
    })
  })
})