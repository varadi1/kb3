"use strict";
/**
 * Base abstract class for text cleaners - Template Method Pattern
 * Single Responsibility: Common cleaner functionality
 * Open/Closed: Extended by concrete cleaners, not modified
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTextCleaner = void 0;
class BaseTextCleaner {
    name;
    description;
    supportedFormats;
    defaultConfig;
    config;
    constructor(name, description, supportedFormats, defaultConfig) {
        this.name = name;
        this.description = description;
        this.supportedFormats = supportedFormats;
        this.defaultConfig = defaultConfig;
        this.config = { ...defaultConfig };
    }
    /**
     * Template method for cleaning text
     */
    async clean(input, config) {
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
    canClean(input, format) {
        return this.supportedFormats.includes(format) &&
            (this.config.maxLength === 0 || input.length <= (this.config.maxLength || Infinity));
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Validate configuration
     */
    validateConfig(config) {
        const errors = [];
        const warnings = [];
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
     * Optional pre-processing step
     */
    async preProcess(input, _config) {
        return input;
    }
    /**
     * Optional post-processing step
     */
    async postProcess(input, _config) {
        return input;
    }
    /**
     * Validate input before processing
     */
    validateInput(input, config) {
        if (input === null || input === undefined)
            return false;
        if (config.maxLength && config.maxLength > 0 && input.length > config.maxLength)
            return false;
        return true;
    }
    /**
     * Merge configurations
     */
    mergeConfig(config) {
        if (!config)
            return { ...this.config };
        return { ...this.config, ...config, options: { ...this.config.options, ...config.options } };
    }
    /**
     * Create cleaning result
     */
    createResult(original, cleaned, config, processingTime) {
        const metadata = {
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
    calculateStatistics(original, cleaned) {
        return {
            charactersRemoved: original.length - cleaned.length,
            percentageReduced: ((original.length - cleaned.length) / original.length * 100).toFixed(2) + '%'
        };
    }
    /**
     * Generate warnings if needed (can be overridden)
     */
    generateWarnings(_original, _cleaned) {
        return undefined;
    }
    /**
     * Subclasses can override to add specific config validation
     */
    validateSpecificConfig(_config, _errors, _warnings) {
        // Override in subclasses
    }
}
exports.BaseTextCleaner = BaseTextCleaner;
//# sourceMappingURL=BaseTextCleaner.js.map