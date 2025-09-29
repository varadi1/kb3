/**
 * Decorator for ScraperParameterManager that adds persistence capabilities
 * Open/Closed Principle: Extends functionality without modifying original class
 * Single Responsibility: Only adds persistence layer to existing manager
 * Dependency Inversion: Depends on abstractions (interfaces)
 */

import {
  IParameterManager,
  ScraperConfiguration,
  BatchScraperConfiguration,
  ParameterValidationResult,
  ScraperSpecificParameters
} from '../interfaces/IScraperParameters';
import {
  IConfigurationPersistence,
  UrlConfiguration
} from '../interfaces/IConfigurationPersistence';
import { ScraperParameterManager } from './ScraperParameterManager';
import { ErrorHandler } from '../utils/ErrorHandler';

export class PersistentParameterManager implements IParameterManager {
  private readonly baseManager: ScraperParameterManager;
  private readonly persistence: IConfigurationPersistence;
  private readonly cache: Map<string, UrlConfiguration>;
  private readonly cacheExpiry: Map<string, number>;
  private readonly cacheTimeout: number;

  constructor(
    persistence: IConfigurationPersistence,
    baseManager?: ScraperParameterManager,
    cacheTimeout: number = 300000 // 5 minutes default
  ) {
    this.baseManager = baseManager || new ScraperParameterManager();
    this.persistence = persistence;
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTimeout = cacheTimeout;
  }

  /**
   * Sets parameters for a URL and persists them
   */
  async setParameters(url: string, config: ScraperConfiguration): Promise<void> {
    try {
      // Validate parameters without storing in base manager
      const validation = this.baseManager.validateParameters(config.scraperType, config.parameters);
      if (!validation.valid) {
        throw new Error(`Invalid parameters: ${validation.errors?.join(', ')}`);
      }

      // Create normalized config
      const normalizedConfig: ScraperConfiguration = {
        ...config,
        parameters: validation.normalizedParams!
      };

      // Persist configuration
      const urlConfig: UrlConfiguration = {
        scraperConfig: normalizedConfig,
        priority: config.priority,
        lastModified: new Date()
      };

      // Update cache immediately
      this.cache.set(url, urlConfig);
      this.cacheExpiry.set(url, Date.now() + this.cacheTimeout);

      // Persist synchronously to ensure consistency
      await this.persistence.saveUrlConfig(url, urlConfig);

    } catch (error) {
      throw ErrorHandler.createError(
        'PARAMETER_SET_ERROR',
        `Failed to set parameters for URL: ${url}`,
        { url, config, error }
      );
    }
  }

  /**
   * Gets parameters for a URL, loading from persistence if needed
   */
  getParameters(url: string): ScraperConfiguration | null {
    try {
      // Check cache first
      const cachedConfig = this.getCachedConfig(url);
      if (cachedConfig?.scraperConfig) {
        return cachedConfig.scraperConfig;
      }

      // Schedule async load from persistence (won't block)
      this.loadFromPersistence(url);

      // Since we're a persistent manager, we don't fall back to base manager's memory
      // The base manager is only used for validation in this decorator pattern
      return null;

    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('PARAMETER_GET', url)
      );
      return null;
    }
  }

  /**
   * Sets batch parameters with persistence
   */
  setBatchParameters(batch: BatchScraperConfiguration): void {
    try {
      // Validate parameters without storing in base manager
      const validation = this.baseManager.validateParameters(
        batch.configuration.scraperType,
        batch.configuration.parameters
      );

      if (!validation.valid) {
        throw new Error(`Invalid batch parameters: ${validation.errors?.join(', ')}`);
      }

      const normalizedConfig: ScraperConfiguration = {
        ...batch.configuration,
        parameters: validation.normalizedParams!
      };

      // Persist configurations for all URLs
      const configs = new Map<string, UrlConfiguration>();
      for (const url of batch.urls) {
        const urlConfig: UrlConfiguration = {
          scraperConfig: normalizedConfig,
          lastModified: new Date()
        };
        configs.set(url, urlConfig);

        // Update cache immediately
        this.cache.set(url, urlConfig);
        this.cacheExpiry.set(url, Date.now() + this.cacheTimeout);
      }

      // Persist asynchronously without blocking
      this.persistence.batchSaveConfigs(configs).catch(error => {
        ErrorHandler.handleError(
          error instanceof Error ? error : new Error('Unknown error'),
          ErrorHandler.createContext('BATCH_PERSIST', undefined, { batch })
        );
      });

    } catch (error) {
      throw ErrorHandler.createError(
        'BATCH_PARAMETER_SET_ERROR',
        'Failed to set batch parameters',
        { batch, error }
      );
    }
  }

  /**
   * Clears parameters for a URL including persistence
   */
  clearParameters(url?: string): void {
    if (url) {
      try {
        // Clear cache
        this.cache.delete(url);
        this.cacheExpiry.delete(url);

        // Remove from persistence asynchronously
        this.persistence.removeUrlConfig(url).catch(error => {
          ErrorHandler.handleError(
            error instanceof Error ? error : new Error('Unknown error'),
            ErrorHandler.createContext('PARAMETER_CLEAR', url)
          );
        });

    } catch (error) {
        ErrorHandler.handleError(
          error instanceof Error ? error : new Error('Unknown error'),
          ErrorHandler.createContext('PARAMETER_CLEAR', url)
        );
      }
    } else {
      this.clearAllParametersSync();
    }
  }

  /**
   * Gets batch parameters for multiple URLs
   */
  getBatchParameters(urls: string[]): Map<string, ScraperConfiguration> {
    const result = new Map<string, ScraperConfiguration>();
    for (const url of urls) {
      const config = this.getParameters(url);
      if (config) {
        result.set(url, config);
      }
    }
    return result;
  }

  /**
   * Merges parameters with defaults
   */
  mergeWithDefaults(scraperType: string, params: any): ScraperSpecificParameters {
    return this.baseManager.mergeWithDefaults(scraperType, params);
  }

  /**
   * Exports all parameters
   */
  exportParameters(): Map<string, ScraperConfiguration> {
    return this.baseManager.exportParameters();
  }

  /**
   * Imports parameters
   */
  importParameters(params: Map<string, ScraperConfiguration>): void {
    this.baseManager.importParameters(params);

    // Persist imported parameters asynchronously
    const configs = new Map<string, UrlConfiguration>();
    for (const [url, config] of params.entries()) {
      const urlConfig: UrlConfiguration = {
        scraperConfig: config,
        lastModified: new Date()
      };
      configs.set(url, urlConfig);
      this.cache.set(url, urlConfig);
      this.cacheExpiry.set(url, Date.now() + this.cacheTimeout);
    }

    this.persistence.batchSaveConfigs(configs).catch(error => {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('IMPORT_PERSIST')
      );
    });
  }

  /**
   * Helper method to load from persistence asynchronously
   */
  private async loadFromPersistence(url: string): Promise<void> {
    try {
      const persistedConfig = await this.persistence.getUrlConfig(url);
      if (persistedConfig?.scraperConfig) {
        // Update cache
        this.cache.set(url, persistedConfig);
        this.cacheExpiry.set(url, Date.now() + this.cacheTimeout);

        // Also update base manager for faster access
        this.baseManager.setParameters(url, persistedConfig.scraperConfig);
      }
    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('LOAD_FROM_PERSISTENCE', url)
      );
    }
  }

  /**
   * Helper to clear all parameters synchronously
   */
  private clearAllParametersSync(): void {
    // Clear cache
    this.cache.clear();
    this.cacheExpiry.clear();

    // Clear persistence asynchronously
    this.persistence.clearAllConfigs().catch(error => {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('CLEAR_ALL_PERSIST')
      );
    });
  }

  /**
   * Clears all parameters including persistence
   */
  async clearAllParameters(): Promise<void> {
    try {
      // Clear from base manager
      this.baseManager.clearParameters();

      // Clear all persisted configs
      await this.persistence.clearAllConfigs();

      // Clear cache
      this.cache.clear();
      this.cacheExpiry.clear();

    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('PARAMETER_CLEAR_ALL')
      );
    }
  }

  /**
   * Validates parameters using base manager
   */
  validateParameters(
    scraperType: string,
    params: any
  ): ParameterValidationResult {
    return this.baseManager.validateParameters(scraperType, params);
  }

  /**
   * Normalizes parameters by merging with defaults using base manager
   */
  normalizeParameters(
    scraperType: string,
    parameters?: ScraperSpecificParameters
  ): ScraperSpecificParameters {
    return this.baseManager.mergeWithDefaults(scraperType, parameters || {});
  }

  /**
   * Gets default parameters using base manager
   */
  getDefaultParameters(scraperType: string): ScraperSpecificParameters {
    return this.baseManager.getDefaultParameters(scraperType) || {};
  }

  /**
   * Gets supported parameters using base manager
   */
  getSupportedParameters(scraperType: string): string[] {
    return this.baseManager.getSupportedParameters(scraperType);
  }

  /**
   * Gets all URLs with custom configurations
   */
  async getConfiguredUrls(): Promise<string[]> {
    try {
      return await this.persistence.listConfiguredUrls();
    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('LIST_CONFIGURED_URLS')
      );
      return [];
    }
  }

  /**
   * Preloads configurations from persistence into memory
   */
  async preloadConfigurations(): Promise<void> {
    try {
      const configuredUrls = await this.persistence.listConfiguredUrls();

      for (const url of configuredUrls) {
        const config = await this.persistence.getUrlConfig(url);
        if (config?.scraperConfig) {
          // Just update cache, not base manager (we're using decorator pattern)
          this.cache.set(url, config);
          this.cacheExpiry.set(url, Date.now() + this.cacheTimeout);
        }
      }

    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('PRELOAD_CONFIGURATIONS')
      );
    }
  }

  /**
   * Gets cached configuration if not expired
   */
  private getCachedConfig(url: string): UrlConfiguration | null {
    const expiry = this.cacheExpiry.get(url);
    if (expiry && expiry > Date.now()) {
      return this.cache.get(url) || null;
    }

    // Remove expired cache entry
    this.cache.delete(url);
    this.cacheExpiry.delete(url);
    return null;
  }

  /**
   * Clears expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [url, expiry] of this.cacheExpiry.entries()) {
      if (expiry <= now) {
        this.cache.delete(url);
        this.cacheExpiry.delete(url);
      }
    }
  }
}