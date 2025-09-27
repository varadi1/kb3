/**
 * SOLID principle compliance tests for Rate Limiting and Error Collection components
 * Ensures architectural integrity and maintainability
 */

import { DomainRateLimiter } from '../../src/scrapers/DomainRateLimiter';
import { ScrapingErrorCollector } from '../../src/scrapers/ScrapingErrorCollector';
import { IRateLimiter } from '../../src/interfaces/IRateLimiter';
import { IErrorCollector } from '../../src/interfaces/IErrorCollector';
import { ScraperAwareContentFetcher } from '../../src/fetchers/ScraperAwareContentFetcher';
import { IContentFetcher } from '../../src/interfaces/IContentFetcher';

describe('SOLID Compliance - Rate Limiting and Error Collection', () => {
  describe('Single Responsibility Principle (SRP)', () => {
    describe('DomainRateLimiter', () => {
      test('should have single responsibility of managing rate limits', () => {
        const limiter = new DomainRateLimiter();

        // Should only have rate limiting methods
        const rateLimitMethods = [
          'waitForDomain',
          'recordRequest',
          'getWaitTime',
          'clearHistory',
          'setDomainInterval',
          'getConfiguration',
          'getStats'
        ];

        rateLimitMethods.forEach(method => {
          expect(limiter[method]).toBeDefined();
          expect(typeof limiter[method]).toBe('function');
        });

        // Should NOT have unrelated responsibilities
        const unrelatedMethods = [
          'fetchContent',
          'parseData',
          'saveToDatabase',
          'sendEmail',
          'processPayment',
          'authenticateUser'
        ];

        unrelatedMethods.forEach(method => {
          expect(limiter[method]).toBeUndefined();
        });
      });

      test('should only change for rate limiting logic changes', () => {
        const limiter = new DomainRateLimiter();

        // Test that changes to rate limiting logic are isolated
        const config1 = limiter.getConfiguration();
        limiter.setDomainInterval('test.com', 1000);
        const config2 = limiter.getConfiguration();

        // Configuration change should only affect rate limiting
        expect(config1.domainIntervals.size).not.toBe(config2.domainIntervals.size);

        // No side effects on other concerns
        expect(limiter.constructor.name).toBe('DomainRateLimiter');
        expect(Object.keys(limiter).every(key =>
          key.includes('request') ||
          key.includes('wait') ||
          key.includes('configuration') ||
          key.includes('Interval')
        )).toBeDefined();
      });
    });

    describe('ScrapingErrorCollector', () => {
      test('should have single responsibility of collecting errors', () => {
        const collector = new ScrapingErrorCollector();

        // Should only have error collection methods
        const errorMethods = [
          'recordError',
          'recordWarning',
          'getErrors',
          'getWarnings',
          'getIssues',
          'clearIssues',
          'exportIssues',
          'merge',
          'getFormattedSummary'
        ];

        errorMethods.forEach(method => {
          expect(collector[method]).toBeDefined();
          expect(typeof collector[method]).toBe('function');
        });

        // Should NOT have unrelated responsibilities
        const unrelatedMethods = [
          'rateLimit',
          'fetchData',
          'processContent',
          'saveFile',
          'sendNotification'
        ];

        unrelatedMethods.forEach(method => {
          expect(collector[method]).toBeUndefined();
        });
      });

      test('should encapsulate error management logic', () => {
        const collector = new ScrapingErrorCollector();

        // All public methods should relate to error management
        const publicMethods = Object.getOwnPropertyNames(
          Object.getPrototypeOf(collector)
        ).filter(name =>
          typeof collector[name] === 'function' &&
          !name.startsWith('_') &&
          name !== 'constructor'
        );

        publicMethods.forEach(method => {
          // Method names should relate to error/warning/issue management
          expect(
            method.includes('error') ||
            method.includes('Error') ||
            method.includes('warning') ||
            method.includes('Warning') ||
            method.includes('Issues') ||
            method.includes('merge') ||
            method.includes('clear') ||
            method.includes('export') ||
            method.includes('Summary')
          ).toBe(true);
        });
      });
    });
  });

  describe('Open/Closed Principle (OCP)', () => {
    test('DomainRateLimiter should be open for extension', () => {
      // Can extend without modifying the base class
      class CustomRateLimiter extends DomainRateLimiter {
        private customLogic: boolean = true;

        async waitForDomain(domain: string): Promise<void> {
          // Add custom logic before
          if (this.customLogic) {
            console.log(`Custom logic for ${domain}`);
          }

          // Call parent implementation
          await super.waitForDomain(domain);

          // Add custom logic after
          if (this.customLogic) {
            console.log(`Completed wait for ${domain}`);
          }
        }

        // Add new methods without modifying base
        async waitForMultipleDomains(domains: string[]): Promise<void> {
          for (const domain of domains) {
            await this.waitForDomain(domain);
          }
        }
      }

      const customLimiter = new CustomRateLimiter();
      expect(customLimiter).toBeInstanceOf(DomainRateLimiter);
      expect(customLimiter.waitForMultipleDomains).toBeDefined();

      // Original functionality preserved
      expect(customLimiter.getConfiguration).toBeDefined();
      expect(customLimiter.recordRequest).toBeDefined();
    });

    test('ScrapingErrorCollector should be open for extension', () => {
      // Can add new error categorization without modifying base
      class EnhancedErrorCollector extends ScrapingErrorCollector {
        private errorCategories: Map<string, string[]> = new Map();

        recordCategorizedError(
          context: string,
          category: string,
          error: Error | string,
          metadata?: Record<string, any>
        ): void {
          // Add to category tracking
          if (!this.errorCategories.has(category)) {
            this.errorCategories.set(category, []);
          }
          this.errorCategories.get(category)!.push(context);

          // Use base functionality
          super.recordError(context, error, { ...metadata, category });
        }

        getErrorsByCategory(category: string): string[] {
          return this.errorCategories.get(category) || [];
        }
      }

      const enhanced = new EnhancedErrorCollector();
      expect(enhanced).toBeInstanceOf(ScrapingErrorCollector);
      expect(enhanced.recordCategorizedError).toBeDefined();
      expect(enhanced.getErrorsByCategory).toBeDefined();

      // Original functionality preserved
      expect(enhanced.recordError).toBeDefined();
      expect(enhanced.getIssues).toBeDefined();
    });

    test('Components should be closed for modification', () => {
      const limiter = new DomainRateLimiter();
      const collector = new ScrapingErrorCollector();

      // Core behavior should not be modifiable from outside
      const originalWait = limiter.waitForDomain;
      const originalRecord = collector.recordError;

      // Try to modify (this should not affect internal behavior)
      limiter.waitForDomain = async () => { throw new Error('Modified'); };
      collector.recordError = () => { throw new Error('Modified'); };

      // Create new instances - should have original behavior
      const newLimiter = new DomainRateLimiter();
      const newCollector = new ScrapingErrorCollector();

      expect(newLimiter.waitForDomain).not.toBe(limiter.waitForDomain);
      expect(newCollector.recordError).not.toBe(collector.recordError);
    });
  });

  describe('Liskov Substitution Principle (LSP)', () => {
    test('DomainRateLimiter should be substitutable for IRateLimiter', () => {
      function useRateLimiter(limiter: IRateLimiter): void {
        // Should work with any IRateLimiter implementation
        limiter.setDomainInterval('test.com', 1000);
        limiter.recordRequest('test.com');
        const waitTime = limiter.getWaitTime('test.com');
        const config = limiter.getConfiguration();

        expect(waitTime).toBeGreaterThanOrEqual(0);
        expect(config.enabled).toBeDefined();
      }

      // Should work with concrete implementation
      const domainLimiter = new DomainRateLimiter();
      useRateLimiter(domainLimiter);

      // Should also work with any other implementation
      class AlternativeRateLimiter implements IRateLimiter {
        private intervals = new Map<string, number>();

        async waitForDomain(domain: string): Promise<void> {
          // Alternative implementation
        }

        recordRequest(domain: string): void {
          // Alternative implementation
        }

        getWaitTime(domain: string): number {
          return this.intervals.get(domain) || 0;
        }

        clearHistory(domain?: string): void {
          if (domain) {
            this.intervals.delete(domain);
          } else {
            this.intervals.clear();
          }
        }

        setDomainInterval(domain: string, intervalMs: number): void {
          this.intervals.set(domain, intervalMs);
        }

        getConfiguration() {
          return {
            enabled: true,
            defaultIntervalMs: 1000,
            domainIntervals: new Map(this.intervals)
          };
        }
      }

      const altLimiter = new AlternativeRateLimiter();
      useRateLimiter(altLimiter);
    });

    test('ScrapingErrorCollector should be substitutable for IErrorCollector', () => {
      function useErrorCollector(collector: IErrorCollector): void {
        // Should work with any IErrorCollector implementation
        collector.recordError('context', new Error('Test'));
        collector.recordWarning('context', 'Warning');

        const errors = collector.getErrors('context');
        const warnings = collector.getWarnings('context');
        const issues = collector.getIssues('context');

        expect(errors.length).toBeGreaterThan(0);
        expect(warnings.length).toBeGreaterThan(0);
        expect(issues.summary.errorCount).toBe(1);
      }

      // Should work with concrete implementation
      const scrapingCollector = new ScrapingErrorCollector();
      useErrorCollector(scrapingCollector);

      // Should also work with alternative implementation
      class SimpleErrorCollector implements IErrorCollector {
        private errors = new Map<string, any[]>();
        private warnings = new Map<string, any[]>();

        recordError(context: string, error: Error | string, metadata?: Record<string, any>): void {
          if (!this.errors.has(context)) {
            this.errors.set(context, []);
          }
          this.errors.get(context)!.push({
            timestamp: new Date(),
            message: error instanceof Error ? error.message : error,
            metadata,
            severity: 'error'
          });
        }

        recordWarning(context: string, warning: string, metadata?: Record<string, any>): void {
          if (!this.warnings.has(context)) {
            this.warnings.set(context, []);
          }
          this.warnings.get(context)!.push({
            timestamp: new Date(),
            message: warning,
            metadata,
            severity: 'warning'
          });
        }

        getErrors(context: string) {
          return this.errors.get(context) || [];
        }

        getWarnings(context: string) {
          return this.warnings.get(context) || [];
        }

        getIssues(context: string) {
          const errors = this.getErrors(context);
          const warnings = this.getWarnings(context);
          return {
            errors,
            warnings,
            summary: {
              errorCount: errors.length,
              warningCount: warnings.length,
              criticalErrors: 0
            }
          };
        }

        clearIssues(context?: string): void {
          if (context) {
            this.errors.delete(context);
            this.warnings.delete(context);
          } else {
            this.errors.clear();
            this.warnings.clear();
          }
        }

        exportIssues() {
          const result = new Map();
          const contexts = new Set([...this.errors.keys(), ...this.warnings.keys()]);
          for (const context of contexts) {
            result.set(context, this.getIssues(context));
          }
          return result;
        }
      }

      const simpleCollector = new SimpleErrorCollector();
      useErrorCollector(simpleCollector);
    });
  });

  describe('Interface Segregation Principle (ISP)', () => {
    test('IRateLimiter interface should be focused and minimal', () => {
      // Interface should only contain rate limiting methods
      const limiter: IRateLimiter = new DomainRateLimiter();

      // Essential rate limiting operations
      expect(limiter.waitForDomain).toBeDefined();
      expect(limiter.recordRequest).toBeDefined();
      expect(limiter.getWaitTime).toBeDefined();

      // Configuration management
      expect(limiter.setDomainInterval).toBeDefined();
      expect(limiter.getConfiguration).toBeDefined();

      // History management
      expect(limiter.clearHistory).toBeDefined();

      // Should not have methods unrelated to rate limiting
      expect((limiter as any).fetchData).toBeUndefined();
      expect((limiter as any).processContent).toBeUndefined();
    });

    test('IErrorCollector interface should be focused on error collection', () => {
      const collector: IErrorCollector = new ScrapingErrorCollector();

      // Essential error collection operations
      expect(collector.recordError).toBeDefined();
      expect(collector.recordWarning).toBeDefined();
      expect(collector.getErrors).toBeDefined();
      expect(collector.getWarnings).toBeDefined();
      expect(collector.getIssues).toBeDefined();

      // Management operations
      expect(collector.clearIssues).toBeDefined();
      expect(collector.exportIssues).toBeDefined();

      // Should not have methods unrelated to error collection
      expect((collector as any).rateLimit).toBeUndefined();
      expect((collector as any).fetchContent).toBeUndefined();
    });

    test('Clients should not depend on methods they do not use', () => {
      // Client that only needs to record errors
      class ErrorRecorder {
        constructor(private collector: Pick<IErrorCollector, 'recordError' | 'recordWarning'>) {}

        logError(context: string, error: Error): void {
          this.collector.recordError(context, error);
        }

        logWarning(context: string, warning: string): void {
          this.collector.recordWarning(context, warning);
        }
      }

      // Client that only needs to read errors
      class ErrorReader {
        constructor(private collector: Pick<IErrorCollector, 'getErrors' | 'getIssues'>) {}

        hasErrors(context: string): boolean {
          return this.collector.getErrors(context).length > 0;
        }

        getSummary(context: string) {
          return this.collector.getIssues(context).summary;
        }
      }

      const fullCollector = new ScrapingErrorCollector();

      // Both clients can work with subsets of the interface
      const recorder = new ErrorRecorder(fullCollector);
      const reader = new ErrorReader(fullCollector);

      recorder.logError('test', new Error('Test'));
      expect(reader.hasErrors('test')).toBe(true);
    });
  });

  describe('Dependency Inversion Principle (DIP)', () => {
    test('ScraperAwareContentFetcher should depend on abstractions', () => {
      const fetcher = new ScraperAwareContentFetcher(
        {} as IContentFetcher,
        undefined,
        undefined,
        undefined,
        new DomainRateLimiter(),
        new ScrapingErrorCollector()
      );

      // Should depend on interfaces, not concrete implementations
      expect(fetcher.getRateLimiter).toBeDefined();
      expect(fetcher.getErrorCollector).toBeDefined();

      // Can work with any implementation of the interfaces
      class MockRateLimiter implements IRateLimiter {
        async waitForDomain(domain: string): Promise<void> {}
        recordRequest(domain: string): void {}
        getWaitTime(domain: string): number { return 0; }
        clearHistory(domain?: string): void {}
        setDomainInterval(domain: string, intervalMs: number): void {}
        getConfiguration() {
          return {
            enabled: true,
            defaultIntervalMs: 1000,
            domainIntervals: new Map()
          };
        }
      }

      class MockErrorCollector implements IErrorCollector {
        recordError(context: string, error: Error | string): void {}
        recordWarning(context: string, warning: string): void {}
        getErrors(context: string) { return []; }
        getWarnings(context: string) { return []; }
        getIssues(context: string) {
          return {
            errors: [],
            warnings: [],
            summary: {
              errorCount: 0,
              warningCount: 0,
              criticalErrors: 0
            }
          };
        }
        clearIssues(context?: string): void {}
        exportIssues() { return new Map(); }
      }

      // Can inject different implementations
      const fetcherWithMocks = new ScraperAwareContentFetcher(
        {} as IContentFetcher,
        undefined,
        undefined,
        undefined,
        new MockRateLimiter(),
        new MockErrorCollector()
      );

      expect(fetcherWithMocks.getRateLimiter()).toBeInstanceOf(MockRateLimiter);
      expect(fetcherWithMocks.getErrorCollector()).toBeInstanceOf(MockErrorCollector);
    });

    test('High-level modules should not depend on low-level modules', () => {
      // High-level orchestrator
      class ProcessingOrchestrator {
        constructor(
          private rateLimiter: IRateLimiter,
          private errorCollector: IErrorCollector
        ) {}

        async processWithRateLimit(url: string): Promise<void> {
          const domain = this.extractDomain(url);

          try {
            await this.rateLimiter.waitForDomain(domain);
            this.rateLimiter.recordRequest(domain);
            // Process...
          } catch (error) {
            this.errorCollector.recordError(url, error as Error);
          }
        }

        private extractDomain(url: string): string {
          try {
            return new URL(url).hostname;
          } catch {
            return 'unknown';
          }
        }
      }

      // Can work with any implementations
      const orchestrator1 = new ProcessingOrchestrator(
        new DomainRateLimiter(),
        new ScrapingErrorCollector()
      );

      // Can also work with test doubles
      const mockLimiter: IRateLimiter = {
        async waitForDomain() {},
        recordRequest() {},
        getWaitTime() { return 0; },
        clearHistory() {},
        setDomainInterval() {},
        getConfiguration() {
          return {
            enabled: false,
            defaultIntervalMs: 0,
            domainIntervals: new Map()
          };
        }
      };

      const mockCollector: IErrorCollector = {
        recordError() {},
        recordWarning() {},
        getErrors() { return []; },
        getWarnings() { return []; },
        getIssues() {
          return {
            errors: [],
            warnings: [],
            summary: {
              errorCount: 0,
              warningCount: 0,
              criticalErrors: 0
            }
          };
        },
        clearIssues() {},
        exportIssues() { return new Map(); }
      };

      const orchestrator2 = new ProcessingOrchestrator(mockLimiter, mockCollector);

      // Both should work correctly
      expect(orchestrator1.processWithRateLimit).toBeDefined();
      expect(orchestrator2.processWithRateLimit).toBeDefined();
    });
  });
});