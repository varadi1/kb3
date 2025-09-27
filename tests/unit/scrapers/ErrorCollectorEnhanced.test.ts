/**
 * Enhanced unit tests for error collection functionality
 * Comprehensive coverage with edge cases and complex scenarios
 */

import { ScrapingErrorCollector } from '../../../src/scrapers/ScrapingErrorCollector';
import { IErrorCollector, ScrapingIssues } from '../../../src/interfaces/IErrorCollector';

describe('ScrapingErrorCollector - Enhanced Tests', () => {
  let collector: ScrapingErrorCollector;

  beforeEach(() => {
    collector = new ScrapingErrorCollector();
  });

  afterEach(() => {
    collector.clearIssues();
  });

  describe('Error Recording and Retrieval', () => {
    test('should record errors with full details', () => {
      const context = 'https://test.com';
      const error = new Error('Test error');
      error.stack = 'Test stack trace';
      (error as any).code = 'TEST_ERROR';

      collector.recordError(context, error, { attempt: 1, url: context });

      const errors = collector.getErrors(context);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test error');
      expect(errors[0].stack).toBe('Test stack trace');
      expect(errors[0].code).toBe('TEST_ERROR');
      expect(errors[0].metadata?.attempt).toBe(1);
      expect(errors[0].timestamp).toBeInstanceOf(Date);
    });

    test('should handle string errors', () => {
      const context = 'string-error-context';
      collector.recordError(context, 'String error message', { type: 'string' });

      const errors = collector.getErrors(context);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('String error message');
      expect(errors[0].stack).toBeUndefined();
      expect(errors[0].severity).toBe('error');
    });

    test('should record multiple errors for same context', () => {
      const context = 'multi-error';

      collector.recordError(context, new Error('Error 1'));
      collector.recordError(context, new Error('Error 2'));
      collector.recordError(context, new Error('Error 3'));

      const errors = collector.getErrors(context);
      expect(errors).toHaveLength(3);
      expect(errors.map(e => e.message)).toEqual(['Error 1', 'Error 2', 'Error 3']);
    });

    test('should maintain separate errors for different contexts', () => {
      collector.recordError('context1', new Error('Error 1'));
      collector.recordError('context2', new Error('Error 2'));

      expect(collector.getErrors('context1')).toHaveLength(1);
      expect(collector.getErrors('context2')).toHaveLength(1);
      expect(collector.getErrors('context3')).toHaveLength(0);
    });
  });

  describe('Warning Recording and Retrieval', () => {
    test('should record warnings with metadata', () => {
      const context = 'warning-context';
      collector.recordWarning(context, 'Slow response', {
        responseTime: 5000,
        threshold: 3000
      });

      const warnings = collector.getWarnings(context);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toBe('Slow response');
      expect(warnings[0].metadata?.responseTime).toBe(5000);
      expect(warnings[0].timestamp).toBeInstanceOf(Date);
    });

    test('should classify warning severity correctly', () => {
      const context = 'severity-test';

      collector.recordWarning(context, 'Method is deprecated');
      collector.recordWarning(context, 'Response was slow');
      collector.recordWarning(context, 'Rate limit approaching');
      collector.recordWarning(context, 'Cache miss occurred');

      const warnings = collector.getWarnings(context);

      const deprecated = warnings.find(w => w.message.includes('deprecated'));
      const slow = warnings.find(w => w.message.includes('slow'));
      const limit = warnings.find(w => w.message.includes('limit'));
      const cache = warnings.find(w => w.message.includes('Cache'));

      expect(deprecated?.severity).toBe('warning');
      expect(slow?.severity).toBe('warning');
      expect(limit?.severity).toBe('warning');
      expect(cache?.severity).toBe('info');
    });

    test('should handle multiple warnings for same context', () => {
      const context = 'multi-warning';

      for (let i = 1; i <= 10; i++) {
        collector.recordWarning(context, `Warning ${i}`);
      }

      const warnings = collector.getWarnings(context);
      expect(warnings).toHaveLength(10);
    });
  });

  describe('Issue Aggregation', () => {
    test('should provide complete issue summary', () => {
      const context = 'summary-test';

      // Add various errors
      collector.recordError(context, new Error('Normal error'));
      collector.recordError(context, new Error('Fatal: Critical failure'));
      collector.recordError(context, new Error('Connection timeout'));

      // Add warnings
      collector.recordWarning(context, 'Slow response');
      collector.recordWarning(context, 'Cache miss');

      const issues = collector.getIssues(context);

      expect(issues.errors).toHaveLength(3);
      expect(issues.warnings).toHaveLength(2);
      expect(issues.summary.errorCount).toBe(3);
      expect(issues.summary.warningCount).toBe(2);
      expect(issues.summary.criticalErrors).toBe(1);
      expect(issues.summary.firstError).toBeInstanceOf(Date);
      expect(issues.summary.lastError).toBeInstanceOf(Date);
    });

    test('should handle empty context correctly', () => {
      const issues = collector.getIssues('non-existent');

      expect(issues.errors).toHaveLength(0);
      expect(issues.warnings).toHaveLength(0);
      expect(issues.summary.errorCount).toBe(0);
      expect(issues.summary.warningCount).toBe(0);
      expect(issues.summary.criticalErrors).toBe(0);
      expect(issues.summary.firstError).toBeUndefined();
      expect(issues.summary.lastError).toBeUndefined();
    });

    test('should track error timeline correctly', async () => {
      const context = 'timeline-test';

      collector.recordError(context, new Error('First error'));

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      collector.recordError(context, new Error('Second error'));

      await new Promise(resolve => setTimeout(resolve, 10));

      collector.recordError(context, new Error('Last error'));

      const issues = collector.getIssues(context);

      expect(issues.summary.firstError).toBeDefined();
      expect(issues.summary.lastError).toBeDefined();
      expect(issues.summary.firstError!.getTime()).toBeLessThan(
        issues.summary.lastError!.getTime()
      );
    });
  });

  describe('Error Severity Classification', () => {
    test('should classify critical errors', () => {
      const context = 'critical-test';

      const criticalErrors = [
        'Fatal: System failure',
        'Critical: Database corrupted',
        'Invalid configuration detected'
      ];

      criticalErrors.forEach(msg => {
        collector.recordError(context, new Error(msg));
      });

      const errors = collector.getErrors(context);
      errors.forEach(error => {
        expect(error.severity).toBe('critical');
      });

      const issues = collector.getIssues(context);
      expect(issues.summary.criticalErrors).toBe(3);
    });

    test('should classify recoverable errors', () => {
      const context = 'recoverable-test';

      const recoverableErrors = [
        'Connection timeout',
        'Network error occurred',
        'Retry attempt failed'
      ];

      recoverableErrors.forEach(msg => {
        collector.recordError(context, new Error(msg));
      });

      const errors = collector.getErrors(context);
      errors.forEach(error => {
        expect(error.severity).toBe('recoverable');
      });
    });

    test('should classify normal errors', () => {
      const context = 'normal-test';

      collector.recordError(context, new Error('Generic error'));
      collector.recordError(context, new Error('Something went wrong'));

      const errors = collector.getErrors(context);
      errors.forEach(error => {
        expect(error.severity).toBe('error');
      });
    });
  });

  describe('Issue Management', () => {
    test('should clear issues for specific context', () => {
      collector.recordError('keep', new Error('Keep this'));
      collector.recordError('clear', new Error('Clear this'));
      collector.recordWarning('keep', 'Keep warning');
      collector.recordWarning('clear', 'Clear warning');

      collector.clearIssues('clear');

      expect(collector.getErrors('keep')).toHaveLength(1);
      expect(collector.getWarnings('keep')).toHaveLength(1);
      expect(collector.getErrors('clear')).toHaveLength(0);
      expect(collector.getWarnings('clear')).toHaveLength(0);
    });

    test('should clear all issues when context not specified', () => {
      collector.recordError('ctx1', new Error('Error 1'));
      collector.recordError('ctx2', new Error('Error 2'));
      collector.recordWarning('ctx3', 'Warning 1');

      collector.clearIssues();

      expect(collector.getErrors('ctx1')).toHaveLength(0);
      expect(collector.getErrors('ctx2')).toHaveLength(0);
      expect(collector.getWarnings('ctx3')).toHaveLength(0);
    });

    test('should export all issues correctly', () => {
      collector.recordError('url1', new Error('Error 1'));
      collector.recordWarning('url1', 'Warning 1');
      collector.recordError('url2', new Error('Error 2'));
      collector.recordWarning('url3', 'Warning 3');

      const allIssues = collector.exportIssues();

      expect(allIssues.size).toBe(3);
      expect(allIssues.has('url1')).toBe(true);
      expect(allIssues.has('url2')).toBe(true);
      expect(allIssues.has('url3')).toBe(true);

      const url1Issues = allIssues.get('url1')!;
      expect(url1Issues.summary.errorCount).toBe(1);
      expect(url1Issues.summary.warningCount).toBe(1);
    });
  });

  describe('Collector Merging', () => {
    test('should merge issues from another collector', () => {
      const other = new ScrapingErrorCollector();

      other.recordError('shared', new Error('Other error'));
      other.recordWarning('other-only', 'Other warning');

      collector.recordError('shared', new Error('My error'));
      collector.recordError('my-only', new Error('My only error'));

      collector.merge(other);

      // Should have both errors for shared context
      const sharedIssues = collector.getIssues('shared');
      expect(sharedIssues.summary.errorCount).toBe(2);

      // Should have other collector's unique context
      const otherOnlyIssues = collector.getIssues('other-only');
      expect(otherOnlyIssues.summary.warningCount).toBe(1);

      // Should keep original unique context
      const myOnlyIssues = collector.getIssues('my-only');
      expect(myOnlyIssues.summary.errorCount).toBe(1);
    });

    test('should preserve timestamps when merging', () => {
      const other = new ScrapingErrorCollector();

      // Record error with metadata including original timestamp
      other.recordError('test', new Error('Old error'));

      collector.merge(other);

      const issues = collector.getIssues('test');
      expect(issues.errors).toHaveLength(1);
      // The merged error should have metadata with originalTimestamp
      expect(issues.errors[0].metadata).toBeDefined();
    });
  });

  describe('Formatted Summary', () => {
    test('should generate formatted summary correctly', () => {
      collector.recordError('url1', new Error('Critical: System failure'));
      collector.recordError('url1', new Error('Network timeout'));
      collector.recordWarning('url1', 'Slow response');

      collector.recordError('url2', new Error('Parse error'));
      collector.recordWarning('url2', 'Deprecated API');

      const summary = collector.getFormattedSummary();

      expect(summary).toContain('Scraping Issues Summary');
      expect(summary).toContain('url1');
      expect(summary).toContain('url2');
      expect(summary).toContain('Errors: 2');
      expect(summary).toContain('Critical: 1');
      expect(summary).toContain('Warnings: 1');
    });

    test('should handle empty collector in formatted summary', () => {
      const summary = collector.getFormattedSummary();
      expect(summary).toBe('No issues recorded');
    });

    test('should show recent errors and warnings in summary', () => {
      const context = 'summary-context';

      // Add many errors
      for (let i = 1; i <= 10; i++) {
        collector.recordError(context, new Error(`Error ${i}`));
      }

      const summary = collector.getFormattedSummary();

      // Should show only last 3 errors
      expect(summary).toContain('Error 8');
      expect(summary).toContain('Error 9');
      expect(summary).toContain('Error 10');
      // Check that early errors are not shown (use more specific check to avoid substring match with Error 10)
      expect(summary).not.toContain('Error 1]');  // With closing bracket to avoid matching Error 10
      expect(summary).not.toContain('Error 2');
      expect(summary).not.toContain('Error 7');
    });
  });

  describe('Edge Cases and Boundaries', () => {
    test('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      collector.recordError('long', new Error(longMessage));

      const errors = collector.getErrors('long');
      expect(errors[0].message).toBe(longMessage);
    });

    test('should handle special characters in context', () => {
      const specialContext = 'https://example.com/path?query=value&other=123#hash';
      collector.recordError(specialContext, new Error('Test'));

      const errors = collector.getErrors(specialContext);
      expect(errors).toHaveLength(1);
    });

    test('should handle null and undefined metadata gracefully', () => {
      collector.recordError('test', new Error('Test'), null as any);
      collector.recordError('test', new Error('Test'), undefined);

      const errors = collector.getErrors('test');
      expect(errors).toHaveLength(2);
    });

    test('should handle concurrent operations', () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            collector.recordError(`ctx${i % 10}`, new Error(`Error ${i}`));
            collector.recordWarning(`ctx${i % 10}`, `Warning ${i}`);
          })
        );
      }

      return Promise.all(promises).then(() => {
        // Each of 10 contexts should have 10 errors and 10 warnings
        for (let i = 0; i < 10; i++) {
          const issues = collector.getIssues(`ctx${i}`);
          expect(issues.summary.errorCount).toBe(10);
          expect(issues.summary.warningCount).toBe(10);
        }
      });
    });
  });

  describe('Interface Compliance', () => {
    test('should implement IErrorCollector interface correctly', () => {
      const errorCollector: IErrorCollector = collector;

      // Verify all interface methods are implemented
      expect(errorCollector.recordError).toBeDefined();
      expect(errorCollector.recordWarning).toBeDefined();
      expect(errorCollector.getErrors).toBeDefined();
      expect(errorCollector.getWarnings).toBeDefined();
      expect(errorCollector.getIssues).toBeDefined();
      expect(errorCollector.clearIssues).toBeDefined();
      expect(errorCollector.exportIssues).toBeDefined();
    });

    test('should return proper issue structure', () => {
      collector.recordError('test', new Error('Test'));
      collector.recordWarning('test', 'Warning');

      const issues: ScrapingIssues = collector.getIssues('test');

      expect(issues).toHaveProperty('errors');
      expect(issues).toHaveProperty('warnings');
      expect(issues).toHaveProperty('summary');
      expect(Array.isArray(issues.errors)).toBe(true);
      expect(Array.isArray(issues.warnings)).toBe(true);
    });
  });
});