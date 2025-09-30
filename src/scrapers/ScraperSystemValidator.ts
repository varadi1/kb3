/**
 * Validates scraper system readiness and configuration
 * Single Responsibility: Validation of scraper system state
 * Open/Closed Principle: Extensible validation rules
 */

import { ScraperRegistry } from './ScraperRegistry';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  diagnostics: {
    registeredScrapers: string[];
    defaultScraper: string | null;
    totalScrapers: number;
  };
}

export class ScraperSystemValidator {
  private readonly registry: ScraperRegistry;

  constructor(registry?: ScraperRegistry) {
    this.registry = registry || ScraperRegistry.getInstance();
  }

  /**
   * Validates that the scraper system is properly configured and ready
   * @returns Validation result with errors, warnings, and diagnostics
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get registry state
    const registeredScrapers = this.registry.getNames();
    const defaultScraper = this.getDefaultScraperName();
    const totalScrapers = registeredScrapers.length;

    // Critical validation: At least one scraper must be registered
    if (totalScrapers === 0) {
      errors.push('No scrapers registered in ScraperRegistry. System cannot process URLs.');
    }

    // Critical validation: Default scraper must be set
    if (!defaultScraper) {
      errors.push('No default scraper configured. System requires a fallback scraper.');
    }

    // Critical validation: HttpScraper should be available for basic URLs
    if (!this.registry.has('http')) {
      errors.push('HttpScraper not registered. Basic HTTP/HTTPS URLs cannot be processed.');
    }

    // Warning: If only HttpScraper is available
    if (totalScrapers === 1 && this.registry.has('http')) {
      warnings.push('Only HttpScraper is registered. Advanced scraping features unavailable.');
    }

    // Validation: Default scraper must be functional
    if (defaultScraper) {
      const scraper = this.registry.get(defaultScraper);
      if (!scraper) {
        errors.push(`Default scraper '${defaultScraper}' is set but not found in registry.`);
      } else {
        try {
          // Test if scraper can handle basic URL
          const canHandle = scraper.canHandle('https://example.com');
          if (!canHandle) {
            warnings.push(`Default scraper '${defaultScraper}' reports it cannot handle basic HTTPS URLs.`);
          }
        } catch (error) {
          errors.push(`Default scraper '${defaultScraper}' threw error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      diagnostics: {
        registeredScrapers,
        defaultScraper,
        totalScrapers
      }
    };
  }

  /**
   * Validates and throws if system is not ready
   * @throws Error with detailed message if validation fails
   */
  validateOrThrow(): void {
    const result = this.validate();

    if (!result.isValid) {
      const errorMessage = this.formatValidationError(result);
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (result.warnings.length > 0) {
      console.warn('Scraper system validation warnings:', result.warnings);
    }
  }

  /**
   * Checks if a specific scraper is available and functional
   * @param scraperName The name of the scraper to check
   * @returns True if scraper is available and can handle URLs
   */
  isScraperAvailable(scraperName: string): boolean {
    if (!this.registry.has(scraperName)) {
      return false;
    }

    const scraper = this.registry.get(scraperName);
    if (!scraper) {
      return false;
    }

    // Test basic functionality
    try {
      return scraper.canHandle('https://example.com');
    } catch {
      return false;
    }
  }

  /**
   * Gets diagnostic information about the scraper system
   * @returns Detailed diagnostic information
   */
  getDiagnostics(): string {
    const result = this.validate();

    let output = '=== Scraper System Diagnostics ===\n';
    output += `Status: ${result.isValid ? 'VALID' : 'INVALID'}\n`;
    output += `Total Scrapers: ${result.diagnostics.totalScrapers}\n`;
    output += `Default Scraper: ${result.diagnostics.defaultScraper || 'NONE'}\n`;
    output += `Registered Scrapers: ${result.diagnostics.registeredScrapers.join(', ') || 'NONE'}\n`;

    if (result.errors.length > 0) {
      output += '\nERRORS:\n';
      result.errors.forEach((error, index) => {
        output += `  ${index + 1}. ${error}\n`;
      });
    }

    if (result.warnings.length > 0) {
      output += '\nWARNINGS:\n';
      result.warnings.forEach((warning, index) => {
        output += `  ${index + 1}. ${warning}\n`;
      });
    }

    return output;
  }

  private getDefaultScraperName(): string | null {
    const defaultScraper = this.registry.getDefault();
    if (!defaultScraper) {
      return null;
    }

    // Find the name by comparing instances
    for (const [name, scraper] of this.registry.getAll()) {
      if (scraper === defaultScraper) {
        return name;
      }
    }

    return null;
  }

  private formatValidationError(result: ValidationResult): string {
    let message = 'Scraper system validation failed:\n\n';

    message += 'ERRORS:\n';
    result.errors.forEach((error, index) => {
      message += `  ${index + 1}. ${error}\n`;
    });

    message += '\nDIAGNOSTICS:\n';
    message += `  - Registered scrapers: ${result.diagnostics.registeredScrapers.join(', ') || 'NONE'}\n`;
    message += `  - Default scraper: ${result.diagnostics.defaultScraper || 'NONE'}\n`;
    message += `  - Total scrapers: ${result.diagnostics.totalScrapers}\n`;

    if (result.warnings.length > 0) {
      message += '\nWARNINGS:\n';
      result.warnings.forEach((warning, index) => {
        message += `  ${index + 1}. ${warning}\n`;
      });
    }

    message += '\nACTION REQUIRED:\n';
    message += '  Check that scrapers are properly configured in the system configuration.\n';
    message += '  Ensure at least HttpScraper is enabled in config.scraping.enabledScrapers.\n';

    return message;
  }
}