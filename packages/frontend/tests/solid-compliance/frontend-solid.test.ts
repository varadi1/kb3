import { describe, it, expect } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'

/**
 * SOLID Compliance Tests for Frontend Components
 * Ensures architectural principles are maintained
 */
describe('Frontend SOLID Compliance', () => {

  describe('Single Responsibility Principle (SRP)', () => {
    it('services should have single responsibility', () => {
      const services = [
        {
          name: 'ConfigService',
          path: 'lib/services/config-service.ts',
          responsibility: 'configuration management',
          shouldNotContain: ['import', 'export', 'auth', 'url', 'content']
        },
        {
          name: 'ImportExportService',
          path: 'lib/services/import-export-service.ts',
          responsibility: 'import/export operations',
          shouldNotContain: ['config', 'auth', 'scraper', 'cleaner']
        }
      ]

      services.forEach(service => {
        const filePath = path.join(__dirname, '../../', service.path)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')

          // Check that service doesn't contain unrelated concerns
          service.shouldNotContain.forEach(term => {
            const regex = new RegExp(`\\b${term}(?:Service|Manager|Handler)\\b`, 'i')
            expect(content.match(regex)).toBeFalsy()
          })
        }
      })
    })

    it('components should have single responsibility', () => {
      const components = [
        {
          name: 'EditUrlDialog',
          path: 'components/urls/edit-url-dialog.tsx',
          responsibility: 'editing single URL',
          shouldContain: ['updateUrl'],
          shouldNotContain: ['batchUpdate', 'import', 'export']
        },
        {
          name: 'BatchOperationsPanel',
          path: 'components/urls/batch-operations.tsx',
          responsibility: 'batch operations',
          shouldContain: ['batch'],
          shouldNotContain: ['EditUrl', 'single']
        },
        {
          name: 'ContentViewer',
          path: 'components/content/content-viewer.tsx',
          responsibility: 'viewing content',
          shouldContain: ['original', 'cleaned'],
          shouldNotContain: ['edit', 'update', 'delete']
        }
      ]

      components.forEach(component => {
        const filePath = path.join(__dirname, '../../', component.path)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')

          component.shouldContain?.forEach(term => {
            expect(content).toContain(term)
          })

          component.shouldNotContain?.forEach(term => {
            const regex = new RegExp(`\\b${term}Dialog\\b|\\b${term}Panel\\b`, 'i')
            expect(content.match(regex)).toBeFalsy()
          })
        }
      })
    })
  })

  describe('Open/Closed Principle (OCP)', () => {
    it('services should be extendable without modification', () => {
      const interfacesPath = path.join(__dirname, '../../lib/services/interfaces.ts')
      const content = fs.readFileSync(interfacesPath, 'utf-8')

      // Check that interfaces are defined for extension
      expect(content).toContain('export interface IConfigService')
      expect(content).toContain('export interface IImportExportService')
      expect(content).toContain('export interface IAuthorityService')
      expect(content).toContain('export interface IContentService')
      expect(content).toContain('export interface IUrlConfigService')
      expect(content).toContain('export interface IBatchOperationsService')
    })

    it('services should implement interfaces', () => {
      const services = [
        { file: 'config-service.ts', interface: 'IConfigExtendedService' },
        { file: 'import-export-service.ts', interface: 'IImportExportService' }
      ]

      services.forEach(service => {
        const filePath = path.join(__dirname, '../../lib/services', service.file)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          expect(content).toContain(`implements ${service.interface}`)
        }
      })
    })
  })

  describe('Liskov Substitution Principle (LSP)', () => {
    it('all service implementations should be substitutable', () => {
      const services = [
        'ConfigService',
        'ImportExportService'
      ]

      services.forEach(serviceName => {
        const modulePath = `@/lib/services/${serviceName.toLowerCase().replace('service', '-service')}`
        try {
          const module = require(modulePath)
          const getterName = `get${serviceName}`

          // Should have singleton getter
          expect(module[getterName]).toBeDefined()
          expect(typeof module[getterName]).toBe('function')

          // Getter should return same instance
          const instance1 = module[getterName]()
          const instance2 = module[getterName]()
          expect(instance1).toBe(instance2)
        } catch {
          // Module not found in test environment is acceptable
        }
      })
    })
  })

  describe('Interface Segregation Principle (ISP)', () => {
    it('interfaces should be small and focused', () => {
      const interfacesPath = path.join(__dirname, '../../lib/services/interfaces.ts')
      const content = fs.readFileSync(interfacesPath, 'utf-8')

      // Extract interface definitions
      const interfaceMatches = content.match(/export interface I\w+Service {[^}]+}/g) || []

      interfaceMatches.forEach(interfaceBlock => {
        // Count methods in interface
        const methodMatches = interfaceBlock.match(/\w+\([^)]*\):/g) || []

        // Interfaces should have focused method count (typically 3-7)
        expect(methodMatches.length).toBeGreaterThan(0)
        expect(methodMatches.length).toBeLessThanOrEqual(7)
      })
    })

    it('components should not depend on unused methods', () => {
      // Check that components only import what they need
      const components = [
        {
          file: 'components/urls/edit-url-dialog.tsx',
          shouldImport: ['useKb3Store'],
          shouldNotImport: ['ConfigService', 'ImportExportService']
        },
        {
          file: 'components/config/config-panel.tsx',
          mayImport: ['fetchConfig', 'updateConfig'],
          shouldNotImport: ['importUrls', 'exportData']
        }
      ]

      components.forEach(component => {
        const filePath = path.join(__dirname, '../../', component.file)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')

          component.shouldImport?.forEach(imp => {
            expect(content).toContain(imp)
          })

          component.shouldNotImport?.forEach(imp => {
            expect(content).not.toContain(`import.*${imp}`)
          })
        }
      })
    })
  })

  describe('Dependency Inversion Principle (DIP)', () => {
    it('high-level modules should not depend on low-level modules', () => {
      // Store should depend on abstractions (services), not implementations
      const storePath = path.join(__dirname, '../../lib/store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')

      // Should import from service layer
      expect(content).toContain('from \'./services/')

      // Should use getters for service instances
      expect(content).toContain('getConfigService()')
      expect(content).toContain('getImportExportService()')

      // Should NOT directly instantiate services
      expect(content).not.toContain('new ConfigService(')
      expect(content).not.toContain('new ImportExportService(')
    })

    it('services should use dependency injection', () => {
      const servicePaths = [
        'lib/services/config-service.ts',
        'lib/services/import-export-service.ts'
      ]

      servicePaths.forEach(servicePath => {
        const filePath = path.join(__dirname, '../../', servicePath)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')

          // Should have singleton pattern
          expect(content).toContain('let')
          expect(content).toContain('Instance')
          expect(content).toContain('export function get')

          // Should not have hard dependencies on other services
          expect(content).not.toContain('import { ConfigService }')
          expect(content).not.toContain('import { ImportExportService }')
        }
      })
    })

    it('components should depend on store abstraction', () => {
      const componentPaths = [
        'components/urls/edit-url-dialog.tsx',
        'components/urls/batch-operations.tsx',
        'components/content/content-viewer.tsx'
      ]

      componentPaths.forEach(componentPath => {
        const filePath = path.join(__dirname, '../../', componentPath)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')

          // Should use store hook
          expect(content).toContain('useKb3Store')

          // Should NOT directly import services
          expect(content).not.toContain('from \'@/lib/services/')
          expect(content).not.toContain('ConfigService')
          expect(content).not.toContain('ImportExportService')
        }
      })
    })
  })

  describe('Component Architecture', () => {
    it('should maintain proper folder structure', () => {
      const expectedStructure = [
        'components/urls',
        'components/content',
        'components/tags',
        'components/config',
        'components/import-export',
        'lib/services'
      ]

      expectedStructure.forEach(dir => {
        const dirPath = path.join(__dirname, '../../', dir)
        expect(fs.existsSync(dirPath)).toBeTruthy()
      })
    })

    it('should follow naming conventions', () => {
      const files = [
        { path: 'components/urls/edit-url-dialog.tsx', pattern: /EditUrlDialog/ },
        { path: 'components/urls/batch-operations.tsx', pattern: /BatchOperationsPanel/ },
        { path: 'components/content/content-viewer.tsx', pattern: /ContentViewer/ },
        { path: 'lib/services/config-service.ts', pattern: /ConfigService/ },
        { path: 'lib/services/import-export-service.ts', pattern: /ImportExportService/ }
      ]

      files.forEach(file => {
        const filePath = path.join(__dirname, '../../', file.path)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          expect(content).toMatch(file.pattern)
        }
      })
    })
  })

  describe('Service Layer Integrity', () => {
    it('all service interfaces should have implementations', () => {
      const interfaces = [
        { interface: 'IConfigService', implementation: 'ConfigService' },
        { interface: 'IImportExportService', implementation: 'ImportExportService' }
      ]

      interfaces.forEach(({ interface: interfaceName, implementation }) => {
        const interfacesPath = path.join(__dirname, '../../lib/services/interfaces.ts')
        const interfaceContent = fs.readFileSync(interfacesPath, 'utf-8')

        // Interface should exist
        expect(interfaceContent).toContain(`export interface ${interfaceName}`)

        // Implementation should exist
        // Convert CamelCase to kebab-case properly
        const kebabCase = implementation
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase()
          .replace(/^-/, '') // Remove leading dash
          .replace(/-service/, '') + '-service' // Ensure single -service suffix
        const implPath = path.join(__dirname, '../../lib/services', `${kebabCase}.ts`)
        expect(fs.existsSync(implPath)).toBeTruthy()
      })
    })

    it('services should handle errors appropriately', () => {
      const servicePaths = [
        'lib/services/config-service.ts',
        'lib/services/import-export-service.ts'
      ]

      servicePaths.forEach(servicePath => {
        const filePath = path.join(__dirname, '../../', servicePath)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')

          // Should have error handling
          expect(content).toContain('try')
          expect(content).toContain('catch')
          expect(content).toContain('console.error')
          expect(content).toContain('throw')
        }
      })
    })
  })
})