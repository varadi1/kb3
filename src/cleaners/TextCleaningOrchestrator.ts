/**
 * Text Cleaning Orchestrator - Facade Pattern
 * Single Responsibility: Coordinate text cleaning operations
 * Dependency Inversion: Depends on abstractions (interfaces)
 */

import {
  ITextCleaner,
  ITextCleanerConfig,
  IChainResult,
  TextFormat,
  ITextCleanerConfigManager
} from '../interfaces/ITextCleaner';
import { TextCleanerRegistry } from './TextCleanerRegistry';
import { TextCleanerChain } from './TextCleanerChain';
import { TextCleanerConfigManager } from './TextCleanerConfigManager';

export interface ITextCleaningOrchestrator {
  /**
   * Clean text with specific cleaners
   */
  cleanWithCleaners(
    text: string,
    cleanerNames: string[],
    format: TextFormat,
    url?: string
  ): Promise<IChainResult>;

  /**
   * Clean text with automatic cleaner selection
   */
  cleanAuto(
    text: string,
    format: TextFormat,
    url?: string
  ): Promise<IChainResult>;

  /**
   * Clean text with a custom chain
   */
  cleanWithChain(
    text: string,
    chain: TextCleanerChain,
    format: TextFormat
  ): Promise<IChainResult>;

  /**
   * Configure cleaners for a URL
   */
  configureForUrl(
    url: string,
    cleanerConfigs: Map<string, ITextCleanerConfig>
  ): Promise<void>;

  /**
   * Get configuration for a URL
   */
  getUrlConfiguration(url: string): Promise<Map<string, ITextCleanerConfig>>;

  /**
   * Batch configure URLs
   */
  batchConfigureUrls(
    urls: string[],
    cleanerName: string,
    config: ITextCleanerConfig
  ): Promise<void>;
}

export class TextCleaningOrchestrator implements ITextCleaningOrchestrator {
  private registry: TextCleanerRegistry;
  private configManager: ITextCleanerConfigManager;
  private defaultChains: Map<TextFormat, TextCleanerChain>;

  constructor(
    registry?: TextCleanerRegistry,
    configManager?: ITextCleanerConfigManager
  ) {
    this.registry = registry || TextCleanerRegistry.getInstance();
    this.configManager = configManager || new TextCleanerConfigManager();
    this.defaultChains = new Map();

    // Initialize default chains for each format
    this.initializeDefaultChains();
  }

  /**
   * Clean text with specific cleaners
   */
  async cleanWithCleaners(
    text: string,
    cleanerNames: string[],
    format: TextFormat,
    url?: string
  ): Promise<IChainResult> {
    const chain = new TextCleanerChain();

    for (const cleanerName of cleanerNames) {
      const cleaner = this.registry.getCleaner(cleanerName);
      if (!cleaner) {
        console.warn(`Cleaner '${cleanerName}' not found in registry`);
        continue;
      }

      // Get URL-specific config if available
      let config = cleaner.getConfig();
      if (url) {
        const urlConfig = await this.configManager.getUrlConfig(url, cleanerName);
        if (urlConfig) {
          config = urlConfig;
        }
      }

      chain.addCleaner(cleaner, config);
    }

    const result = await chain.process(text, format);

    // Store cleaning metadata if URL provided
    if (url) {
      await this.storeCleaningMetadata(url, result);
    }

    return result;
  }

  /**
   * Clean text with automatic cleaner selection
   */
  async cleanAuto(
    text: string,
    format: TextFormat,
    url?: string
  ): Promise<IChainResult> {
    // Get or create default chain for format
    let chain = this.defaultChains.get(format);

    if (!chain) {
      chain = this.createDefaultChainForFormat(format);
    }

    // Apply URL-specific configurations if available
    if (url) {
      chain = await this.applyUrlConfigurations(chain, url);
    }

    const result = await chain.process(text, format);

    // Store cleaning metadata
    if (url) {
      await this.storeCleaningMetadata(url, result);
    }

    return result;
  }

  /**
   * Clean text with a custom chain
   */
  async cleanWithChain(
    text: string,
    chain: TextCleanerChain,
    format: TextFormat
  ): Promise<IChainResult> {
    return await chain.process(text, format);
  }

  /**
   * Configure cleaners for a URL
   */
  async configureForUrl(
    url: string,
    cleanerConfigs: Map<string, ITextCleanerConfig>
  ): Promise<void> {
    for (const [cleanerName, config] of cleanerConfigs.entries()) {
      await this.configManager.setUrlConfig(url, cleanerName, config);
    }
  }

  /**
   * Get configuration for a URL
   */
  async getUrlConfiguration(url: string): Promise<Map<string, ITextCleanerConfig>> {
    return await this.configManager.getAllUrlConfigs(url);
  }

  /**
   * Batch configure URLs
   */
  async batchConfigureUrls(
    urls: string[],
    cleanerName: string,
    config: ITextCleanerConfig
  ): Promise<void> {
    await this.configManager.batchSetConfig(urls, cleanerName, config);
  }

  /**
   * Initialize default chains for each format
   */
  private initializeDefaultChains(): void {
    // HTML chain: XSS -> Sanitize -> Readability -> Voca
    const htmlChain = new TextCleanerChain();
    const xssCleaner = this.registry.getCleaner('xss');
    const sanitizeCleaner = this.registry.getCleaner('sanitize-html');
    const readabilityCleaner = this.registry.getCleaner('readability');
    const vocaCleaner = this.registry.getCleaner('voca');

    if (xssCleaner) htmlChain.addCleaner(xssCleaner);
    if (sanitizeCleaner) htmlChain.addCleaner(sanitizeCleaner);
    if (readabilityCleaner) htmlChain.addCleaner(readabilityCleaner);
    if (vocaCleaner) htmlChain.addCleaner(vocaCleaner);

    this.defaultChains.set(TextFormat.HTML, htmlChain);

    // Markdown chain: Remark -> Voca
    const markdownChain = new TextCleanerChain();
    const remarkCleaner = this.registry.getCleaner('remark');
    const vocaCleanerMd = this.registry.getCleaner('voca');

    if (remarkCleaner) markdownChain.addCleaner(remarkCleaner);
    if (vocaCleanerMd) markdownChain.addCleaner(vocaCleanerMd);

    this.defaultChains.set(TextFormat.MARKDOWN, markdownChain);

    // Plain text chain: String.js -> Voca
    const plainTextChain = new TextCleanerChain();
    const stringJsCleaner = this.registry.getCleaner('string-js');
    const vocaCleanerText = this.registry.getCleaner('voca');

    if (stringJsCleaner) plainTextChain.addCleaner(stringJsCleaner);
    if (vocaCleanerText) plainTextChain.addCleaner(vocaCleanerText);

    this.defaultChains.set(TextFormat.PLAIN_TEXT, plainTextChain);

    // Mixed format chain: All cleaners with appropriate config
    const mixedChain = new TextCleanerChain();
    if (xssCleaner) mixedChain.addCleaner(xssCleaner);
    if (sanitizeCleaner) mixedChain.addCleaner(sanitizeCleaner);
    if (vocaCleaner) mixedChain.addCleaner(vocaCleaner);
    if (stringJsCleaner) mixedChain.addCleaner(stringJsCleaner);

    this.defaultChains.set(TextFormat.MIXED, mixedChain);
  }

  /**
   * Create default chain for a format
   */
  private createDefaultChainForFormat(format: TextFormat): TextCleanerChain {
    const chain = new TextCleanerChain();
    const cleaners = this.registry.getCleanersForFormat(format);

    // Add cleaners sorted by priority
    for (const cleaner of cleaners) {
      if (cleaner.getConfig().enabled) {
        chain.addCleaner(cleaner);
      }
    }

    return chain;
  }

  /**
   * Apply URL-specific configurations to a chain
   */
  private async applyUrlConfigurations(
    chain: TextCleanerChain,
    url: string
  ): Promise<TextCleanerChain> {
    const urlConfigs = await this.configManager.getAllUrlConfigs(url);

    // Clone the chain to avoid modifying the original
    const newChain = chain.clone();

    for (const [cleanerName, config] of urlConfigs.entries()) {
      const cleaner = this.registry.getCleaner(cleanerName);
      if (cleaner) {
        // Remove existing and add with new config
        newChain.removeCleaner(cleanerName);
        newChain.addCleaner(cleaner, config);
      }
    }

    return newChain;
  }

  /**
   * Store cleaning metadata for a URL
   */
  private async storeCleaningMetadata(url: string, result: IChainResult): Promise<void> {
    // This would integrate with the existing URL metadata storage
    // For now, we'll just log it
    const metadata = {
      url,
      timestamp: new Date(),
      cleanersUsed: result.cleanerResults.map(r => r.metadata.cleanerName),
      totalProcessingTime: result.totalProcessingTime,
      finalLength: result.finalText.length,
      compressionRatio: result.cleanerResults.length > 0
        ? 1 - (result.finalText.length / result.cleanerResults[0].originalLength)
        : 0
    };

    console.log('Cleaning metadata:', metadata);
    // TODO: Integrate with URL metadata storage system
  }

  /**
   * Get recommended cleaners for a format
   */
  getRecommendedCleaners(format: TextFormat): ITextCleaner[] {
    const chain = this.defaultChains.get(format);
    return chain ? chain.getCleaners() : [];
  }

  /**
   * Validate cleaner configuration
   */
  validateConfiguration(cleanerName: string, config: ITextCleanerConfig): boolean {
    const cleaner = this.registry.getCleaner(cleanerName);
    if (!cleaner) {
      return false;
    }

    const validation = cleaner.validateConfig(config);
    return validation.valid;
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    registeredCleaners: number;
    defaultChains: number;
    supportedFormats: number;
  } {
    return {
      registeredCleaners: this.registry.getAllCleaners().length,
      defaultChains: this.defaultChains.size,
      supportedFormats: Object.keys(TextFormat).length / 2 // Enum has both keys and values
    };
  }

  /**
   * Apply template configuration to URLs matching a pattern
   */
  async applyConfigurationTemplate(
    pattern: string | RegExp,
    cleanerName: string,
    config: ITextCleanerConfig
  ): Promise<number> {
    return await this.configManager.applyConfigTemplate(pattern, cleanerName, config);
  }

  /**
   * Export all configurations
   */
  exportConfigurations(): {
    registry: Record<string, any>;
    defaultChains: Record<string, any>;
  } {
    const defaultChains: Record<string, any> = {};

    for (const [format, chain] of this.defaultChains.entries()) {
      defaultChains[format] = chain.getConfiguration();
    }

    return {
      registry: this.registry.exportConfiguration(),
      defaultChains
    };
  }
}