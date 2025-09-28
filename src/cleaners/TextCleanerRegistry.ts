/**
 * Text Cleaner Registry - Singleton Pattern
 * Single Responsibility: Manage registration and retrieval of text cleaners
 * Open/Closed: New cleaners can be added without modifying the registry
 */

import {
  ITextCleaner,
  ITextCleanerRegistry,
  TextFormat
} from '../interfaces/ITextCleaner';

export class TextCleanerRegistry implements ITextCleanerRegistry {
  private static instance: TextCleanerRegistry;
  private cleaners: Map<string, ITextCleaner>;

  private constructor() {
    this.cleaners = new Map();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TextCleanerRegistry {
    if (!TextCleanerRegistry.instance) {
      TextCleanerRegistry.instance = new TextCleanerRegistry();
    }
    return TextCleanerRegistry.instance;
  }

  /**
   * Register a new cleaner
   */
  register(cleaner: ITextCleaner): void {
    if (!cleaner || !cleaner.name) {
      throw new Error('Invalid cleaner: must have a name');
    }

    if (this.cleaners.has(cleaner.name)) {
      console.warn(`Cleaner '${cleaner.name}' is already registered. Overwriting...`);
    }

    this.cleaners.set(cleaner.name, cleaner);
    console.log(`Registered text cleaner: ${cleaner.name}`);
  }

  /**
   * Unregister a cleaner
   */
  unregister(cleanerName: string): void {
    if (!this.cleaners.has(cleanerName)) {
      console.warn(`Cleaner '${cleanerName}' is not registered`);
      return;
    }

    this.cleaners.delete(cleanerName);
    console.log(`Unregistered text cleaner: ${cleanerName}`);
  }

  /**
   * Get a cleaner by name
   */
  getCleaner(cleanerName: string): ITextCleaner | undefined {
    return this.cleaners.get(cleanerName);
  }

  /**
   * Get all registered cleaners
   */
  getAllCleaners(): ITextCleaner[] {
    return Array.from(this.cleaners.values());
  }

  /**
   * Get cleaners that support a specific format
   */
  getCleanersForFormat(format: TextFormat): ITextCleaner[] {
    return this.getAllCleaners().filter(cleaner =>
      cleaner.supportedFormats.includes(format)
    );
  }

  /**
   * Check if a cleaner is registered
   */
  hasClleaner(cleanerName: string): boolean {
    return this.cleaners.has(cleanerName);
  }

  /**
   * Clear all registered cleaners
   */
  clear(): void {
    this.cleaners.clear();
    console.log('Cleared all registered text cleaners');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalCleaners: number;
    cleanersByFormat: Map<TextFormat, number>;
    enabledCleaners: number;
  } {
    const cleanersByFormat = new Map<TextFormat, number>();
    let enabledCleaners = 0;

    for (const cleaner of this.cleaners.values()) {
      if (cleaner.getConfig().enabled) {
        enabledCleaners++;
      }

      for (const format of cleaner.supportedFormats) {
        cleanersByFormat.set(
          format,
          (cleanersByFormat.get(format) || 0) + 1
        );
      }
    }

    return {
      totalCleaners: this.cleaners.size,
      cleanersByFormat,
      enabledCleaners
    };
  }

  /**
   * Initialize with default cleaners
   */
  initializeDefaultCleaners(): void {
    // Import all cleaner implementations
    const { SanitizeHtmlCleaner } = require('./SanitizeHtmlCleaner');
    const { ReadabilityCleaner } = require('./ReadabilityCleaner');
    const { XssCleaner } = require('./XssCleaner');
    const { VocaCleaner } = require('./VocaCleaner');
    const { StringJsCleaner } = require('./StringJsCleaner');
    const { RemarkCleaner } = require('./RemarkCleaner');

    // Register default cleaners
    this.register(new SanitizeHtmlCleaner());
    this.register(new ReadabilityCleaner());
    this.register(new XssCleaner());
    this.register(new VocaCleaner());
    this.register(new StringJsCleaner());
    this.register(new RemarkCleaner());

    console.log('Initialized default text cleaners');
  }

  /**
   * Get cleaners sorted by priority
   */
  getCleanersByPriority(ascending: boolean = false): ITextCleaner[] {
    const cleaners = this.getAllCleaners();

    return cleaners.sort((a, b) => {
      const priorityA = a.getConfig().priority || 0;
      const priorityB = b.getConfig().priority || 0;

      return ascending
        ? priorityA - priorityB
        : priorityB - priorityA;
    });
  }

  /**
   * Export registry configuration
   */
  exportConfiguration(): Record<string, any> {
    const config: Record<string, any> = {};

    for (const [name, cleaner] of this.cleaners.entries()) {
      config[name] = {
        description: cleaner.description,
        supportedFormats: cleaner.supportedFormats,
        config: cleaner.getConfig()
      };
    }

    return config;
  }

  /**
   * Import registry configuration
   */
  importConfiguration(config: Record<string, any>): void {
    for (const [name, settings] of Object.entries(config)) {
      const cleaner = this.cleaners.get(name);
      if (cleaner && settings.config) {
        cleaner.updateConfig(settings.config);
        console.log(`Updated configuration for cleaner: ${name}`);
      }
    }
  }
}