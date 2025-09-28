/**
 * Text Cleaner Interface - SOLID Principles:
 * - Interface Segregation: Focused interface for text cleaning operations
 * - Single Responsibility: Only responsible for text cleaning
 * - Dependency Inversion: Abstracts text cleaning implementation details
 */

export interface ITextCleaner {
  /**
   * Unique name identifier for the cleaner
   */
  readonly name: string;

  /**
   * Description of what the cleaner does
   */
  readonly description: string;

  /**
   * Supported input formats this cleaner can handle
   */
  readonly supportedFormats: TextFormat[];

  /**
   * Default configuration for the cleaner
   */
  readonly defaultConfig: ITextCleanerConfig;

  /**
   * Clean the input text with the given configuration
   * @param input The text to clean
   * @param config Optional configuration overrides
   * @returns Promise resolving to cleaned result
   */
  clean(input: string, config?: ITextCleanerConfig): Promise<ITextCleaningResult>;

  /**
   * Validate if the cleaner can handle the given input
   * @param input The text to validate
   * @param format The format of the input
   * @returns Whether the cleaner can process this input
   */
  canClean(input: string, format: TextFormat): boolean;

  /**
   * Get the current configuration
   */
  getConfig(): ITextCleanerConfig;

  /**
   * Update the configuration
   * @param config Partial configuration to merge
   */
  updateConfig(config: Partial<ITextCleanerConfig>): void;

  /**
   * Validate a configuration object
   * @param config Configuration to validate
   * @returns Validation result
   */
  validateConfig(config: ITextCleanerConfig): IConfigValidationResult;
}

/**
 * Text cleaner configuration interface
 * Each cleaner can extend this with specific options
 */
export interface ITextCleanerConfig {
  /**
   * Enable or disable the cleaner
   */
  enabled: boolean;

  /**
   * Processing priority (higher = earlier processing)
   */
  priority?: number;

  /**
   * Maximum input length to process (0 = unlimited)
   */
  maxLength?: number;

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Custom options specific to each cleaner
   */
  options?: Record<string, any>;
}

/**
 * Result of text cleaning operation
 */
export interface ITextCleaningResult {
  /**
   * The cleaned text
   */
  cleanedText: string;

  /**
   * Original text length
   */
  originalLength: number;

  /**
   * Cleaned text length
   */
  cleanedLength: number;

  /**
   * Metadata about the cleaning process
   */
  metadata: ICleaningMetadata;

  /**
   * Any warnings or issues during cleaning
   */
  warnings?: string[];

  /**
   * Processing time in milliseconds
   */
  processingTime: number;
}

/**
 * Metadata about the cleaning process
 */
export interface ICleaningMetadata {
  /**
   * Cleaner that performed the operation
   */
  cleanerName: string;

  /**
   * Configuration used
   */
  configUsed: ITextCleanerConfig;

  /**
   * Statistics about what was removed/changed
   */
  statistics?: ICleaningStatistics;

  /**
   * Timestamp of cleaning
   */
  timestamp: Date;
}

/**
 * Statistics about cleaning operations
 */
export interface ICleaningStatistics {
  /**
   * Number of HTML tags removed
   */
  tagsRemoved?: number;

  /**
   * Number of scripts removed
   */
  scriptsRemoved?: number;

  /**
   * Number of styles removed
   */
  stylesRemoved?: number;

  /**
   * Number of links modified
   */
  linksModified?: number;

  /**
   * Number of special characters cleaned
   */
  specialCharsRemoved?: number;

  /**
   * Custom statistics per cleaner
   */
  custom?: Record<string, number>;
}

/**
 * Configuration validation result
 */
export interface IConfigValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Supported text formats
 */
export enum TextFormat {
  HTML = 'html',
  MARKDOWN = 'markdown',
  PLAIN_TEXT = 'plain_text',
  RICH_TEXT = 'rich_text',
  XML = 'xml',
  MIXED = 'mixed'
}

/**
 * Text cleaner chain for sequential processing
 */
export interface ITextCleanerChain {
  /**
   * Add a cleaner to the chain
   * @param cleaner The cleaner to add
   * @param config Optional configuration for this cleaner
   */
  addCleaner(cleaner: ITextCleaner, config?: ITextCleanerConfig): ITextCleanerChain;

  /**
   * Remove a cleaner from the chain
   * @param cleanerName Name of the cleaner to remove
   */
  removeCleaner(cleanerName: string): ITextCleanerChain;

  /**
   * Process text through the entire chain
   * @param input The text to process
   * @param format The format of the input
   * @returns Combined result from all cleaners
   */
  process(input: string, format: TextFormat): Promise<IChainResult>;

  /**
   * Get all cleaners in the chain
   */
  getCleaners(): ITextCleaner[];

  /**
   * Clear all cleaners from the chain
   */
  clear(): void;
}

/**
 * Result from processing through a chain of cleaners
 */
export interface IChainResult {
  /**
   * Final cleaned text
   */
  finalText: string;

  /**
   * Individual results from each cleaner
   */
  cleanerResults: ITextCleaningResult[];

  /**
   * Total processing time
   */
  totalProcessingTime: number;

  /**
   * Chain configuration used
   */
  chainConfig: ITextCleanerConfig[];
}

/**
 * Registry for managing text cleaners
 */
export interface ITextCleanerRegistry {
  /**
   * Register a new cleaner
   * @param cleaner The cleaner to register
   */
  register(cleaner: ITextCleaner): void;

  /**
   * Unregister a cleaner
   * @param cleanerName Name of the cleaner to unregister
   */
  unregister(cleanerName: string): void;

  /**
   * Get a cleaner by name
   * @param cleanerName Name of the cleaner
   */
  getCleaner(cleanerName: string): ITextCleaner | undefined;

  /**
   * Get all registered cleaners
   */
  getAllCleaners(): ITextCleaner[];

  /**
   * Get cleaners that support a specific format
   * @param format The text format
   */
  getCleanersForFormat(format: TextFormat): ITextCleaner[];

  /**
   * Check if a cleaner is registered
   * @param cleanerName Name of the cleaner
   */
  hasClleaner(cleanerName: string): boolean;
}

/**
 * Configuration manager for per-URL cleaner settings
 */
export interface ITextCleanerConfigManager {
  /**
   * Set configuration for a specific URL
   * @param url The URL to configure
   * @param cleanerName The cleaner name
   * @param config The configuration
   */
  setUrlConfig(url: string, cleanerName: string, config: ITextCleanerConfig): Promise<void>;

  /**
   * Get configuration for a specific URL
   * @param url The URL
   * @param cleanerName The cleaner name
   */
  getUrlConfig(url: string, cleanerName: string): Promise<ITextCleanerConfig | null>;

  /**
   * Set configuration for multiple URLs
   * @param urls Array of URLs
   * @param cleanerName The cleaner name
   * @param config The configuration
   */
  batchSetConfig(urls: string[], cleanerName: string, config: ITextCleanerConfig): Promise<void>;

  /**
   * Get all configurations for a URL
   * @param url The URL
   */
  getAllUrlConfigs(url: string): Promise<Map<string, ITextCleanerConfig>>;

  /**
   * Remove configuration for a URL
   * @param url The URL
   * @param cleanerName Optional cleaner name (removes all if not specified)
   */
  removeUrlConfig(url: string, cleanerName?: string): Promise<void>;

  /**
   * Apply configuration template to URLs matching a pattern
   * @param pattern URL pattern (glob or regex)
   * @param cleanerName The cleaner name
   * @param config The configuration template
   */
  applyConfigTemplate(pattern: string | RegExp, cleanerName: string, config: ITextCleanerConfig): Promise<number>;
}