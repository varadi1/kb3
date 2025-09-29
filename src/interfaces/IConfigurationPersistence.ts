/**
 * Interface for persisting per-URL configuration overrides
 * Single Responsibility: Only manages configuration persistence
 * Interface Segregation: Focused interface for configuration management
 */

import { ScraperConfiguration } from './IScraperParameters';

export interface UrlConfiguration {
  scraperConfig?: ScraperConfiguration;
  cleanerConfigs?: CleanerConfiguration[];
  priority?: number;
  lastModified?: Date;
}

export interface CleanerConfiguration {
  type: string;
  enabled: boolean;
  parameters?: Record<string, any>;
  order?: number;
}

export interface IConfigurationPersistence {
  /**
   * Saves configuration for a specific URL
   * @param url The URL to configure
   * @param config The configuration to save
   * @returns Promise resolving to success status
   */
  saveUrlConfig(url: string, config: UrlConfiguration): Promise<boolean>;

  /**
   * Retrieves configuration for a specific URL
   * @param url The URL to get configuration for
   * @returns Promise resolving to configuration or null if not found
   */
  getUrlConfig(url: string): Promise<UrlConfiguration | null>;

  /**
   * Removes configuration for a specific URL
   * @param url The URL to remove configuration for
   * @returns Promise resolving to success status
   */
  removeUrlConfig(url: string): Promise<boolean>;

  /**
   * Lists all URLs with custom configurations
   * @returns Promise resolving to array of URLs with configs
   */
  listConfiguredUrls(): Promise<string[]>;

  /**
   * Batch save configurations for multiple URLs
   * @param configs Map of URL to configuration
   * @returns Promise resolving to success status
   */
  batchSaveConfigs(configs: Map<string, UrlConfiguration>): Promise<boolean>;

  /**
   * Clear all URL configurations
   * @returns Promise resolving to success status
   */
  clearAllConfigs(): Promise<boolean>;
}

export interface ConfigurationMetadata {
  scraperType?: string;
  scraperParameters?: Record<string, any>;
  cleaners?: string[];
  cleanerParameters?: Record<string, any>;
  priority?: number;
  configVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
}