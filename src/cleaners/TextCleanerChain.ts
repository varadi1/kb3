/**
 * Text Cleaner Chain - Chain of Responsibility Pattern
 * Single Responsibility: Sequential text processing through cleaners
 */

import {
  ITextCleaner,
  ITextCleanerChain,
  ITextCleanerConfig,
  ITextCleaningResult,
  IChainResult,
  TextFormat
} from '../interfaces/ITextCleaner';

export class TextCleanerChain implements ITextCleanerChain {
  private cleaners: Array<{ cleaner: ITextCleaner; config: ITextCleanerConfig }> = [];

  /**
   * Add a cleaner to the chain
   */
  addCleaner(cleaner: ITextCleaner, config?: ITextCleanerConfig): ITextCleanerChain {
    const cleanerConfig = config || cleaner.getConfig();

    // Validate the cleaner can be added
    if (!cleaner) {
      throw new Error('Cannot add null cleaner to chain');
    }

    // Check for duplicates
    const existingIndex = this.cleaners.findIndex(c => c.cleaner.name === cleaner.name);
    if (existingIndex !== -1) {
      console.warn(`Cleaner '${cleaner.name}' already in chain. Updating configuration...`);
      this.cleaners[existingIndex] = { cleaner, config: cleanerConfig };
    } else {
      this.cleaners.push({ cleaner, config: cleanerConfig });
    }

    // Sort by priority
    this.sortByPriority();

    return this;
  }

  /**
   * Remove a cleaner from the chain
   */
  removeCleaner(cleanerName: string): ITextCleanerChain {
    const index = this.cleaners.findIndex(c => c.cleaner.name === cleanerName);

    if (index === -1) {
      console.warn(`Cleaner '${cleanerName}' not found in chain`);
      return this;
    }

    this.cleaners.splice(index, 1);
    console.log(`Removed cleaner '${cleanerName}' from chain`);

    return this;
  }

  /**
   * Process text through the chain
   */
  async process(input: string, format: TextFormat): Promise<IChainResult> {
    const startTime = Date.now();
    const cleanerResults: ITextCleaningResult[] = [];
    let currentText = input;

    // Filter and sort cleaners by priority
    const activeCleaners = this.cleaners.filter(({ cleaner, config }) =>
      config.enabled && cleaner.canClean(currentText, format)
    );

    console.log(`Processing through ${activeCleaners.length} active cleaners`);

    // Process through each cleaner
    for (const { cleaner, config } of activeCleaners) {
      try {
        console.log(`Applying cleaner: ${cleaner.name}`);
        const result = await cleaner.clean(currentText, config);
        cleanerResults.push(result);
        currentText = result.cleanedText;

        // Check if we should stop processing
        if (this.shouldStopProcessing(result)) {
          console.warn(`Stopping chain processing after ${cleaner.name}: Critical warning detected`);
          break;
        }
      } catch (error) {
        console.error(`Error in cleaner '${cleaner.name}':`, error);

        // Create error result
        cleanerResults.push({
          cleanedText: currentText,
          originalLength: currentText.length,
          cleanedLength: currentText.length,
          metadata: {
            cleanerName: cleaner.name,
            configUsed: config,
            timestamp: new Date()
          },
          warnings: [`Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`],
          processingTime: 0
        });

        // Continue with next cleaner unless it's a critical error
        if (this.isCriticalError(error)) {
          throw error;
        }
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    return {
      finalText: currentText,
      cleanerResults,
      totalProcessingTime,
      chainConfig: activeCleaners.map(({ config }) => config)
    };
  }

  /**
   * Get all cleaners in the chain
   */
  getCleaners(): ITextCleaner[] {
    return this.cleaners.map(({ cleaner }) => cleaner);
  }

  /**
   * Clear all cleaners from the chain
   */
  clear(): void {
    this.cleaners = [];
    console.log('Cleared all cleaners from chain');
  }

  /**
   * Sort cleaners by priority (higher priority = earlier execution)
   */
  private sortByPriority(): void {
    this.cleaners.sort((a, b) => {
      const priorityA = a.config.priority || 0;
      const priorityB = b.config.priority || 0;
      return priorityB - priorityA; // Descending order
    });
  }

  /**
   * Check if processing should stop
   */
  private shouldStopProcessing(result: ITextCleaningResult): boolean {
    // Stop if text is empty
    if (!result.cleanedText || result.cleanedText.trim().length === 0) {
      return true;
    }

    // Stop if there are critical warnings
    if (result.warnings && result.warnings.some(w =>
      w.toLowerCase().includes('critical') ||
      w.toLowerCase().includes('empty') ||
      w.toLowerCase().includes('failed')
    )) {
      return true;
    }

    return false;
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('critical') ||
             message.includes('invalid') ||
             message.includes('cannot process');
    }
    return false;
  }

  /**
   * Get chain configuration
   */
  getConfiguration(): Array<{ cleanerName: string; config: ITextCleanerConfig }> {
    return this.cleaners.map(({ cleaner, config }) => ({
      cleanerName: cleaner.name,
      config
    }));
  }

  /**
   * Update cleaner configuration in the chain
   */
  updateCleanerConfig(cleanerName: string, config: Partial<ITextCleanerConfig>): void {
    const entry = this.cleaners.find(c => c.cleaner.name === cleanerName);

    if (!entry) {
      throw new Error(`Cleaner '${cleanerName}' not found in chain`);
    }

    entry.config = { ...entry.config, ...config };
    this.sortByPriority();
  }

  /**
   * Clone the chain
   */
  clone(): TextCleanerChain {
    const newChain = new TextCleanerChain();
    for (const { cleaner, config } of this.cleaners) {
      newChain.addCleaner(cleaner, { ...config });
    }
    return newChain;
  }

  /**
   * Get chain statistics
   */
  getStats(): {
    totalCleaners: number;
    enabledCleaners: number;
    supportedFormats: Set<TextFormat>;
    averagePriority: number;
  } {
    const enabledCleaners = this.cleaners.filter(c => c.config.enabled).length;
    const supportedFormats = new Set<TextFormat>();
    let totalPriority = 0;

    for (const { cleaner, config } of this.cleaners) {
      cleaner.supportedFormats.forEach(f => supportedFormats.add(f));
      totalPriority += config.priority || 0;
    }

    return {
      totalCleaners: this.cleaners.length,
      enabledCleaners,
      supportedFormats,
      averagePriority: this.cleaners.length > 0
        ? totalPriority / this.cleaners.length
        : 0
    };
  }
}