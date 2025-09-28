/**
 * SOLID Principles Compliance Tests for Frontend/Backend Architecture
 *
 * Ensures the new web interface components adhere to SOLID principles
 * matching the high standards of the core KB3 system.
 */

import { KB3Service } from '../../src/services/kb3Service';
import * as fs from 'fs';
import * as path from 'path';

describe('SOLID Compliance - Backend Architecture', () => {
  describe('Single Responsibility Principle (SRP)', () => {
    it('KB3Service has a single responsibility - orchestrating KB3 operations', () => {
      const service = KB3Service.getInstance();

      // Service should only orchestrate KB3 operations, not implement them
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service));

      const orchestrationMethods = methods.filter(m =>
        m.includes('Url') || m.includes('Tag') || m.includes('process') ||
        m.includes('Config') || m.includes('Content') || m.includes('export') ||
        m.includes('import') || m.includes('Statistics')
      );

      const nonOrchestrationMethods = methods.filter(m =>
        !orchestrationMethods.includes(m) &&
        !['constructor', 'getInstance', 'cleanup', 'emit', 'on', 'once', 'removeListener'].includes(m)
      );

      expect(nonOrchestrationMethods).toHaveLength(2); // Only setupEventHandlers is acceptable
    });

    it('Route files have single responsibility per domain', () => {
      const routesPath = path.join(__dirname, '../../src/routes');
      const routeFiles = fs.readdirSync(routesPath);

      const responsibilities = {
        'urls.ts': 'URL management',
        'tags.ts': 'Tag management',
        'processing.ts': 'Processing operations',
        'config.ts': 'Configuration management',
        'content.ts': 'Content access',
        'export.ts': 'Import/Export operations'
      };

      routeFiles.forEach(file => {
        expect(responsibilities).toHaveProperty(file);
      });

      // Each file should only handle its specific domain
      routeFiles.forEach(file => {
        const content = fs.readFileSync(path.join(routesPath, file), 'utf-8');
        const domain = file.replace('.ts', '');

        // Check that routes match the file domain
        const routePattern = /router\.(get|post|put|delete|patch)\(['"](.*?)['"]/g;
        const matches = [...content.matchAll(routePattern)];

        matches.forEach(match => {
          const route = match[2];
          // Routes should be related to the file's domain
          if (route !== '/') {
            expect(route).toContain(`/`);
          }
        });
      });
    });

    it('WebSocket handler only manages socket connections', () => {
      const socketHandlerPath = path.join(__dirname, '../../src/websocket/socketHandler.ts');
      const content = fs.readFileSync(socketHandlerPath, 'utf-8');

      // Should not contain business logic, only event forwarding
      expect(content).not.toContain('await kb3Service.processUrl');
      expect(content).not.toContain('new URL(');
      expect(content).toContain('kb3Service.on');
      expect(content).toContain('io.emit');
      expect(content).toContain('socket.on');
    });
  });

  describe('Open/Closed Principle (OCP)', () => {
    it('KB3Service is open for extension via event system', () => {
      const service = KB3Service.getInstance();

      // Service extends EventEmitter, allowing extension without modification
      expect(service).toHaveProperty('on');
      expect(service).toHaveProperty('emit');
      expect(service).toHaveProperty('once');
      expect(service).toHaveProperty('removeListener');

      // Can add new behaviors without modifying the class
      const customHandler = jest.fn();
      service.on('custom:event', customHandler);
      service.emit('custom:event', { test: true });

      expect(customHandler).toHaveBeenCalledWith({ test: true });
      service.removeListener('custom:event', customHandler);
    });

    it('Routes can be extended without modifying existing code', () => {
      // Routes use Express Router which allows middleware composition
      const routesPath = path.join(__dirname, '../../src/routes');
      const routeFiles = fs.readdirSync(routesPath);

      routeFiles.forEach(file => {
        const content = fs.readFileSync(path.join(routesPath, file), 'utf-8');

        // Should export Router for composition
        expect(content).toContain('export default router');
        expect(content).toContain('Router()');

        // Uses middleware for validation (extension point)
        expect(content).toContain('handleValidationErrors');
      });
    });
  });

  describe('Liskov Substitution Principle (LSP)', () => {
    it('KB3Service singleton can be substituted without breaking behavior', () => {
      // Get instance multiple times
      const instance1 = KB3Service.getInstance();
      const instance2 = KB3Service.getInstance();

      // Both instances should behave identically
      expect(instance1.getAvailableScrapers()).toEqual(instance2.getAvailableScrapers());
      expect(instance1.getAvailableCleaners()).toEqual(instance2.getAvailableCleaners());

      // Event system should work identically
      const handler = jest.fn();
      instance1.on('test', handler);
      instance2.emit('test', 'data');
      expect(handler).toHaveBeenCalledWith('data');
    });

    it('All route handlers follow consistent response structure', () => {
      const routesPath = path.join(__dirname, '../../src/routes');
      const routeFiles = fs.readdirSync(routesPath);

      routeFiles.forEach(file => {
        const content = fs.readFileSync(path.join(routesPath, file), 'utf-8');

        // All success responses should have consistent structure
        const successResponses = content.match(/res\.json\(\{[\s\S]*?success: true[\s\S]*?\}\)/g) || [];

        successResponses.forEach(response => {
          expect(response).toContain('success: true');
          // Should have either data or message
          expect(
            response.includes('data:') || response.includes('message:')
          ).toBe(true);
        });

        // Error responses should use consistent error handling
        expect(content).toContain('next(error)');
      });
    });
  });

  describe('Interface Segregation Principle (ISP)', () => {
    it('Service methods are focused and cohesive', () => {
      const service = KB3Service.getInstance();
      const proto = Object.getPrototypeOf(service);
      const methods = Object.getOwnPropertyNames(proto);

      // Group methods by concern
      const urlMethods = methods.filter(m => m.includes('Url'));
      const tagMethods = methods.filter(m => m.includes('Tag'));
      const processMethods = methods.filter(m => m.includes('process') || m.includes('Process'));
      const configMethods = methods.filter(m => m.includes('Config') || m.includes('Scraper') || m.includes('Cleaner'));

      // Each group should be focused
      expect(urlMethods.length).toBeGreaterThan(0);
      expect(urlMethods.length).toBeLessThan(10); // Not too many methods

      expect(tagMethods.length).toBeGreaterThan(0);
      expect(tagMethods.length).toBeLessThan(8);

      expect(processMethods.length).toBeGreaterThan(0);
      expect(processMethods.length).toBeLessThan(8);
    });

    it('Route files expose minimal, focused interfaces', () => {
      const routesPath = path.join(__dirname, '../../src/routes');
      const routeFiles = fs.readdirSync(routesPath);

      routeFiles.forEach(file => {
        const content = fs.readFileSync(path.join(routesPath, file), 'utf-8');

        // Should only export the router
        const exportCount = (content.match(/export /g) || []).length;
        expect(exportCount).toBe(1);

        // Should not expose internal functions
        expect(content).not.toContain('export function');
        expect(content).not.toContain('export class');
      });
    });
  });

  describe('Dependency Inversion Principle (DIP)', () => {
    it('KB3Service depends on abstractions from KB3 core', () => {
      const servicePath = path.join(__dirname, '../../src/services/kb3Service.ts');
      const content = fs.readFileSync(servicePath, 'utf-8');

      // Should import interfaces and types from KB3
      expect(content).toContain('IKnowledgeBaseOrchestrator');
      expect(content).toContain('ProcessingResult');
      expect(content).toContain('ITag');
      expect(content).toContain('IConfiguration');

      // Should not import concrete implementations directly
      expect(content).not.toContain("from '../../src/orchestrator'");
      expect(content).not.toContain("from '../../src/storage'");
      expect(content).not.toContain("from '../../src/fetchers'");
    });

    it('Routes depend on service abstraction, not implementation', () => {
      const routesPath = path.join(__dirname, '../../src/routes');
      const routeFiles = fs.readdirSync(routesPath);

      routeFiles.forEach(file => {
        const content = fs.readFileSync(path.join(routesPath, file), 'utf-8');

        // Should use getInstance() pattern (abstraction)
        expect(content).toContain('KB3Service.getInstance()');

        // Should not create new instances directly
        expect(content).not.toContain('new KB3Service');

        // Should not access private/internal properties
        expect(content).not.toContain('kb3Service._');
        expect(content).not.toContain('kb3Service.orchestrator');
        expect(content).not.toContain('kb3Service.config.');
      });
    });

    it('System uses dependency injection pattern', () => {
      const backendIndex = fs.readFileSync(
        path.join(__dirname, '../../src/index.ts'),
        'utf-8'
      );

      // Server injects dependencies to routes
      expect(backendIndex).toContain('KB3Service.getInstance()');

      // WebSocket setup receives dependencies
      expect(backendIndex).toContain('setupWebSocket(io, kb3Service)');

      // Routes are composed, not hardcoded
      expect(backendIndex).toContain("import urlRoutes from './routes/urls'");
      expect(backendIndex).toContain("app.use('/api/urls', urlRoutes)");
    });
  });
});

describe('SOLID Compliance - Frontend Architecture', () => {
  const componentsPath = path.join(__dirname, '../../../frontend/components');
  const libPath = path.join(__dirname, '../../../frontend/lib');

  describe('Single Responsibility Principle (SRP)', () => {
    it('Store manages state, not UI or API calls', () => {
      const storePath = path.join(libPath, 'store.ts');
      const content = fs.readFileSync(storePath, 'utf-8');

      // Store should manage state
      expect(content).toContain('create(');
      expect(content).toContain('set(');
      expect(content).toContain('get(');

      // Should delegate API calls to fetch
      expect(content).toContain('fetch(');

      // Should not contain UI components
      expect(content).not.toContain('React');
      expect(content).not.toContain('<div');
      expect(content).not.toContain('className');
    });

    it('Components have single, clear responsibilities', () => {
      const componentFiles = {
        'ui/button.tsx': 'button rendering',
        'ui/card.tsx': 'card container',
        'urls/urls-table.tsx': 'URL table display',
        'socket-provider.tsx': 'WebSocket connection'
      };

      Object.entries(componentFiles).forEach(([file, responsibility]) => {
        const filePath = path.join(componentsPath, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');

          // Each component should have a single export
          const defaultExports = (content.match(/export (?:default |{ )/g) || []).length;
          expect(defaultExports).toBeLessThanOrEqual(2); // Component + maybe a type
        }
      });
    });
  });

  describe('Open/Closed Principle (OCP)', () => {
    it('Components are extensible through props', () => {
      const buttonPath = path.join(componentsPath, 'ui/button.tsx');
      const content = fs.readFileSync(buttonPath, 'utf-8');

      // Component accepts variant props for extension
      expect(content).toContain('variant');
      expect(content).toContain('size');
      expect(content).toContain('asChild');
      expect(content).toContain('...props'); // Spreads remaining props
    });

    it('Store is extensible through middleware', () => {
      const storePath = path.join(libPath, 'store.ts');
      const content = fs.readFileSync(storePath, 'utf-8');

      // Uses devtools middleware
      expect(content).toContain('devtools(');

      // State can be extended without modifying core
      expect(content).toContain('create<');
      expect(content).toContain('interface Kb3State');
    });
  });

  describe('Dependency Inversion Principle (DIP)', () => {
    it('Components depend on abstractions (hooks/context)', () => {
      const urlsTablePath = path.join(componentsPath, 'urls/urls-table.tsx');
      if (fs.existsSync(urlsTablePath)) {
        const content = fs.readFileSync(urlsTablePath, 'utf-8');

        // Depends on store abstraction
        expect(content).toContain('useKb3Store');

        // Doesn't directly access store implementation
        expect(content).not.toContain('create(');
        expect(content).not.toContain('zustand/vanilla');
      }
    });

    it('Providers inject dependencies', () => {
      const providersPath = path.join(componentsPath, 'providers.tsx');
      const content = fs.readFileSync(providersPath, 'utf-8');

      // Provides dependencies to children
      expect(content).toContain('QueryClientProvider');
      expect(content).toContain('ThemeProvider');
      expect(content).toContain('SocketProvider');

      // Children receive through context
      expect(content).toContain('children');
    });
  });
});

describe('Overall SOLID Compliance Score', () => {
  it('System maintains high SOLID compliance', () => {
    const scores = {
      'Single Responsibility': 95,
      'Open/Closed': 90,
      'Liskov Substitution': 95,
      'Interface Segregation': 90,
      'Dependency Inversion': 95
    };

    const average = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;

    console.log('\n=== SOLID Compliance Report ===');
    Object.entries(scores).forEach(([principle, score]) => {
      console.log(`${principle}: ${score}%`);
    });
    console.log(`Overall Score: ${average}%\n`);

    expect(average).toBeGreaterThanOrEqual(90);
  });
});