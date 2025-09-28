"use strict";
/**
 * Text Cleaner Chain - Chain of Responsibility Pattern
 * Single Responsibility: Sequential text processing through cleaners
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextCleanerChain = void 0;
class TextCleanerChain {
    cleaners = [];
    /**
     * Add a cleaner to the chain
     */
    addCleaner(cleaner, config) {
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
        }
        else {
            this.cleaners.push({ cleaner, config: cleanerConfig });
        }
        // Sort by priority
        this.sortByPriority();
        return this;
    }
    /**
     * Remove a cleaner from the chain
     */
    removeCleaner(cleanerName) {
        const index = this.cleaners.findIndex(c => c.cleaner.name === cleanerName);
        if (index === -1) {
            console.warn(`Cleaner '${cleanerName}' not found in chain`);
            return this;
        }
        this.cleaners.splice(index, 1);
        // Successfully removed cleaner from chain
        return this;
    }
    /**
     * Process text through the chain
     */
    async process(input, format) {
        const startTime = Date.now();
        const cleanerResults = [];
        let currentText = input;
        // Filter and sort cleaners by priority
        const activeCleaners = this.cleaners.filter(({ cleaner, config }) => config.enabled && cleaner.canClean(currentText, format));
        // Processing through cleaners
        // Process through each cleaner
        for (const { cleaner, config } of activeCleaners) {
            try {
                // Applying cleaner
                const result = await cleaner.clean(currentText, config);
                cleanerResults.push(result);
                currentText = result.cleanedText;
                // Check if we should stop processing
                if (this.shouldStopProcessing(result)) {
                    console.warn(`Stopping chain processing after ${cleaner.name}: Critical warning detected`);
                    break;
                }
            }
            catch (error) {
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
    getCleaners() {
        return this.cleaners.map(({ cleaner }) => cleaner);
    }
    /**
     * Clear all cleaners from the chain
     */
    clear() {
        this.cleaners = [];
        // Cleared all cleaners
    }
    /**
     * Sort cleaners by priority (higher priority = earlier execution)
     */
    sortByPriority() {
        this.cleaners.sort((a, b) => {
            const priorityA = a.config.priority || 0;
            const priorityB = b.config.priority || 0;
            return priorityB - priorityA; // Descending order
        });
    }
    /**
     * Check if processing should stop
     */
    shouldStopProcessing(result) {
        // Stop if text is empty
        if (!result.cleanedText || result.cleanedText.trim().length === 0) {
            return true;
        }
        // Stop if there are critical warnings
        if (result.warnings && result.warnings.some(w => w.toLowerCase().includes('critical') ||
            w.toLowerCase().includes('empty') ||
            w.toLowerCase().includes('failed'))) {
            return true;
        }
        return false;
    }
    /**
     * Check if error is critical
     */
    isCriticalError(error) {
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
    getConfiguration() {
        return this.cleaners.map(({ cleaner, config }) => ({
            cleanerName: cleaner.name,
            config
        }));
    }
    /**
     * Update cleaner configuration in the chain
     */
    updateCleanerConfig(cleanerName, config) {
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
    clone() {
        const newChain = new TextCleanerChain();
        for (const { cleaner, config } of this.cleaners) {
            newChain.addCleaner(cleaner, { ...config });
        }
        return newChain;
    }
    /**
     * Get chain statistics
     */
    getStats() {
        const enabledCleaners = this.cleaners.filter(c => c.config.enabled).length;
        const supportedFormats = new Set();
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
exports.TextCleanerChain = TextCleanerChain;
//# sourceMappingURL=TextCleanerChain.js.map