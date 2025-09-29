/**
 * SQL-based implementation of configuration persistence
 * Single Responsibility: Manages configuration persistence using URL repository
 * Dependency Inversion: Depends on IUrlRepository abstraction
 */

import {
  IConfigurationPersistence,
  UrlConfiguration,
  CleanerConfiguration,
  ConfigurationMetadata
} from '../interfaces/IConfigurationPersistence';
import { IUrlRepository, UrlMetadata } from '../interfaces/IUrlRepository';
import { ErrorHandler } from '../utils/ErrorHandler';

export class SqlConfigurationPersistence implements IConfigurationPersistence {
  private static readonly CONFIG_KEY = 'urlConfig';
  private static readonly CONFIG_VERSION = 1;

  constructor(private readonly urlRepository: IUrlRepository) {
    if (!urlRepository) {
      throw ErrorHandler.createError(
        'INVALID_DEPENDENCY',
        'URL repository is required for configuration persistence'
      );
    }
  }

  /**
   * Saves configuration for a specific URL
   */
  async saveUrlConfig(url: string, config: UrlConfiguration): Promise<boolean> {
    try {
      // Get existing URL info
      const urlInfo = await this.urlRepository.getUrlInfo(url);

      if (!urlInfo) {
        // Register URL if it doesn't exist
        const metadata = this.createMetadataWithConfig(config);
        await this.urlRepository.register(url, metadata);
        return true;
      }

      // Merge configuration with existing metadata
      const existingMetadata = urlInfo.metadata || {};
      const updatedMetadata = this.mergeConfigIntoMetadata(existingMetadata, config);

      // Re-register to update metadata
      await this.urlRepository.register(url, updatedMetadata);
      return true;

    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('CONFIG_SAVE', url, { config })
      );
      return false;
    }
  }

  /**
   * Retrieves configuration for a specific URL
   */
  async getUrlConfig(url: string): Promise<UrlConfiguration | null> {
    try {
      const urlInfo = await this.urlRepository.getUrlInfo(url);

      if (!urlInfo || !urlInfo.metadata) {
        return null;
      }

      return this.extractConfigFromMetadata(urlInfo.metadata);

    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('CONFIG_RETRIEVE', url)
      );
      return null;
    }
  }

  /**
   * Removes configuration for a specific URL
   */
  async removeUrlConfig(url: string): Promise<boolean> {
    try {
      const urlInfo = await this.urlRepository.getUrlInfo(url);

      if (!urlInfo) {
        return true; // Already doesn't exist
      }

      // Remove configuration from metadata
      const metadata = urlInfo.metadata || {};
      delete metadata[SqlConfigurationPersistence.CONFIG_KEY];

      // Update URL with cleaned metadata
      await this.urlRepository.register(url, metadata);
      return true;

    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('CONFIG_REMOVE', url)
      );
      return false;
    }
  }

  /**
   * Lists all URLs with custom configurations
   */
  async listConfiguredUrls(): Promise<string[]> {
    try {
      // Get all URLs
      const allUrls = await this.urlRepository.list();

      // Filter URLs that have configuration
      const configuredUrls = allUrls
        .filter(urlRecord => {
          const config = this.extractConfigFromMetadata(urlRecord.metadata);
          return config !== null;
        })
        .map(urlRecord => urlRecord.url);

      return configuredUrls;

    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('CONFIG_LIST')
      );
      return [];
    }
  }

  /**
   * Batch save configurations for multiple URLs
   */
  async batchSaveConfigs(configs: Map<string, UrlConfiguration>): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];

      for (const [url, config] of configs.entries()) {
        promises.push(this.saveUrlConfig(url, config));
      }

      const results = await Promise.all(promises);
      return results.every(result => result === true);

    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('CONFIG_BATCH_SAVE', undefined, { count: configs.size })
      );
      return false;
    }
  }

  /**
   * Clear all URL configurations
   */
  async clearAllConfigs(): Promise<boolean> {
    try {
      const configuredUrls = await this.listConfiguredUrls();
      const promises: Promise<boolean>[] = [];

      for (const url of configuredUrls) {
        promises.push(this.removeUrlConfig(url));
      }

      const results = await Promise.all(promises);
      return results.every(result => result === true);

    } catch (error) {
      ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'),
        ErrorHandler.createContext('CONFIG_CLEAR_ALL')
      );
      return false;
    }
  }

  /**
   * Creates metadata with configuration
   */
  private createMetadataWithConfig(config: UrlConfiguration): UrlMetadata {
    const configMetadata: ConfigurationMetadata = {
      scraperType: config.scraperConfig?.scraperType,
      scraperParameters: config.scraperConfig?.parameters,
      cleaners: config.cleanerConfigs?.map(c => c.type),
      cleanerParameters: this.extractCleanerParameters(config.cleanerConfigs),
      priority: config.priority,
      configVersion: SqlConfigurationPersistence.CONFIG_VERSION,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      [SqlConfigurationPersistence.CONFIG_KEY]: configMetadata
    };
  }

  /**
   * Merges configuration into existing metadata
   */
  private mergeConfigIntoMetadata(
    existingMetadata: UrlMetadata,
    config: UrlConfiguration
  ): UrlMetadata {
    const configMetadata: ConfigurationMetadata = {
      scraperType: config.scraperConfig?.scraperType,
      scraperParameters: config.scraperConfig?.parameters,
      cleaners: config.cleanerConfigs?.map(c => c.type),
      cleanerParameters: this.extractCleanerParameters(config.cleanerConfigs),
      priority: config.priority,
      configVersion: SqlConfigurationPersistence.CONFIG_VERSION,
      createdAt: existingMetadata[SqlConfigurationPersistence.CONFIG_KEY]?.createdAt || new Date(),
      updatedAt: new Date()
    };

    return {
      ...existingMetadata,
      [SqlConfigurationPersistence.CONFIG_KEY]: configMetadata
    };
  }

  /**
   * Extracts configuration from metadata
   */
  private extractConfigFromMetadata(metadata?: UrlMetadata): UrlConfiguration | null {
    if (!metadata || !metadata[SqlConfigurationPersistence.CONFIG_KEY]) {
      return null;
    }

    const configMetadata = metadata[SqlConfigurationPersistence.CONFIG_KEY] as ConfigurationMetadata;

    const config: UrlConfiguration = {
      lastModified: configMetadata.updatedAt,
      priority: configMetadata.priority
    };

    // Extract scraper configuration
    if (configMetadata.scraperType) {
      config.scraperConfig = {
        scraperType: configMetadata.scraperType as 'playwright' | 'crawl4ai' | 'docling' | 'http' | 'deepdoctection',
        parameters: configMetadata.scraperParameters || {},
        priority: configMetadata.priority
      };
    }

    // Extract cleaner configurations
    if (configMetadata.cleaners && configMetadata.cleaners.length > 0) {
      config.cleanerConfigs = configMetadata.cleaners.map((type, index) => ({
        type,
        enabled: true,
        parameters: configMetadata.cleanerParameters?.[type] || {},
        order: index
      }));
    }

    // Extract priority
    if (configMetadata.priority !== undefined) {
      config.priority = configMetadata.priority;
    }

    return config;
  }

  /**
   * Extracts cleaner parameters into a map
   */
  private extractCleanerParameters(
    cleanerConfigs?: CleanerConfiguration[]
  ): Record<string, any> | undefined {
    if (!cleanerConfigs || cleanerConfigs.length === 0) {
      return undefined;
    }

    const parameters: Record<string, any> = {};
    for (const cleaner of cleanerConfigs) {
      if (cleaner.parameters && Object.keys(cleaner.parameters).length > 0) {
        parameters[cleaner.type] = cleaner.parameters;
      }
    }

    return Object.keys(parameters).length > 0 ? parameters : undefined;
  }
}