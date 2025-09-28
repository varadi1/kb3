/**
 * Base abstract class for text cleaners - Template Method Pattern
 * Single Responsibility: Common cleaner functionality
 * Open/Closed: Extended by concrete cleaners, not modified
 */

import {
  ITextCleaner,
  ITextCleanerConfig,
  ITextCleaningResult,
  ICleaningMetadata,
  IConfigValidationResult,
  TextFormat
} from '../interfaces/ITextCleaner';

export abstract class BaseTextCleaner implements ITextCleaner {
  protected config: ITextCleanerConfig;

  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly supportedFormats: TextFormat[],
    public readonly defaultConfig: ITextCleanerConfig
  ) {
    this.config = { ...defaultConfig };
  }

  /**
   * Template method for cleaning text
   */
  async clean(input: string, config?: ITextCleanerConfig): Promise<ITextCleaningResult> {
    const startTime = Date.now();
    const mergedConfig = this.mergeConfig(config);

    // Validate input
    if (!this.validateInput(input, mergedConfig)) {
      throw new Error(`Invalid input for ${this.name} cleaner`);
    }

    // Pre-process
    const preprocessed = await this.preProcess(input, mergedConfig);

    // Main cleaning logic (implemented by subclasses)
    const cleanedText = await this.performCleaning(preprocessed, mergedConfig);

    // Post-process
    const finalText = await this.postProcess(cleanedText, mergedConfig);

    // Create result
    const processingTime = Date.now() - startTime;
    return this.createResult(input, finalText, mergedConfig, processingTime);
  }

  /**
   * Check if this cleaner can handle the input
   */
  canClean(input: string, format: TextFormat): boolean {
    return this.supportedFormats.includes(format) &&
           (this.config.maxLength === 0 || input.length <= (this.config.maxLength || Infinity));
  }

  /**
   * Get current configuration
   */
  getConfig(): ITextCleanerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ITextCleanerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: ITextCleanerConfig): IConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.priority !== undefined && (config.priority < 0 || config.priority > 100)) {
      errors.push('Priority must be between 0 and 100');
    }

    if (config.maxLength !== undefined && config.maxLength < 0) {
      errors.push('Max length must be non-negative');
    }

    if (config.timeout !== undefined && config.timeout < 0) {
      errors.push('Timeout must be non-negative');
    }

    // Let subclasses add their own validation
    this.validateSpecificConfig(config, errors, warnings);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Abstract method for the main cleaning logic
   */
  protected abstract performCleaning(input: string, config: ITextCleanerConfig): Promise<string>;

  /**
   * Optional pre-processing step
   */
  protected async preProcess(input: string, _config: ITextCleanerConfig): Promise<string> {
    return input;
  }

  /**
   * Optional post-processing step
   */
  protected async postProcess(input: string, _config: ITextCleanerConfig): Promise<string> {
    return input;
  }

  /**
   * Validate input before processing
   */
  protected validateInput(input: string, config: ITextCleanerConfig): boolean {
    if (input === null || input === undefined) return false;
    if (config.maxLength && config.maxLength > 0 && input.length > config.maxLength) return false;
    return true;
  }

  /**
   * Merge configurations
   */
  protected mergeConfig(config?: ITextCleanerConfig): ITextCleanerConfig {
    if (!config) return { ...this.config };
    return { ...this.config, ...config, options: { ...this.config.options, ...config.options } };
  }

  /**
   * Create cleaning result
   */
  protected createResult(
    original: string,
    cleaned: string,
    config: ITextCleanerConfig,
    processingTime: number
  ): ITextCleaningResult {
    const metadata: ICleaningMetadata = {
      cleanerName: this.name,
      configUsed: config,
      timestamp: new Date(),
      statistics: this.calculateStatistics(original, cleaned)
    };

    return {
      cleanedText: cleaned,
      originalLength: original.length,
      cleanedLength: cleaned.length,
      metadata,
      processingTime,
      warnings: this.generateWarnings(original, cleaned)
    };
  }

  /**
   * Calculate cleaning statistics (can be overridden)
   */
  protected calculateStatistics(original: string, cleaned: string): any {
    return {
      charactersRemoved: original.length - cleaned.length,
      percentageReduced: ((original.length - cleaned.length) / original.length * 100).toFixed(2) + '%'
    };
  }

  /**
   * Generate warnings if needed (can be overridden)
   */
  protected generateWarnings(_original: string, _cleaned: string): string[] | undefined {
    return undefined;
  }

  /**
   * Subclasses can override to add specific config validation
   */
  protected validateSpecificConfig(
    _config: ITextCleanerConfig,
    _errors: string[],
    _warnings: string[]
  ): void {
    // Override in subclasses
  }
}