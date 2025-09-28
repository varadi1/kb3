"use strict";
/**
 * Content Processor with Text Cleaning Integration
 * Decorator Pattern: Wraps existing processor with cleaning capabilities
 * Single Responsibility: Adds text cleaning to content processing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentProcessorWithCleaning = void 0;
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
const ITextCleaner_1 = require("../interfaces/ITextCleaner");
const TextCleaningOrchestrator_1 = require("../cleaners/TextCleaningOrchestrator");
const TextCleanerRegistry_1 = require("../cleaners/TextCleanerRegistry");
const TextCleanerConfigManager_1 = require("../cleaners/TextCleanerConfigManager");
class ContentProcessorWithCleaning {
    baseProcessor;
    cleaningOrchestrator;
    constructor(baseProcessor, orchestrator) {
        this.baseProcessor = baseProcessor;
        if (!orchestrator) {
            // Initialize with default configuration
            const registry = TextCleanerRegistry_1.TextCleanerRegistry.getInstance();
            registry.initializeDefaultCleaners();
            const configManager = new TextCleanerConfigManager_1.TextCleanerConfigManager();
            orchestrator = new TextCleaningOrchestrator_1.TextCleaningOrchestrator(registry, configManager);
        }
        this.cleaningOrchestrator = orchestrator;
    }
    /**
     * Get supported content types (delegates to base processor)
     */
    getSupportedTypes() {
        return this.baseProcessor.getSupportedTypes();
    }
    /**
     * Check if can process content type (delegates to base processor)
     */
    canProcess(contentType) {
        return this.baseProcessor.canProcess(contentType);
    }
    /**
     * Process content with optional text cleaning
     */
    async process(content, contentType, options) {
        // First, process with base processor
        const baseResult = await this.baseProcessor.process(content, contentType, options);
        // Check if text cleaning is enabled
        if (!options?.textCleaning?.enabled) {
            return baseResult;
        }
        // Determine text format based on content type
        const textFormat = this.mapContentTypeToTextFormat(contentType, options.textCleaning.format);
        // Store original text if requested
        const result = { ...baseResult };
        if (options.textCleaning.preserveOriginal) {
            result.originalText = baseResult.text;
        }
        try {
            let cleaningResult;
            if (options.textCleaning.cleanerNames && options.textCleaning.cleanerNames.length > 0) {
                // Use specific cleaners
                cleaningResult = await this.cleaningOrchestrator.cleanWithCleaners(baseResult.text, options.textCleaning.cleanerNames, textFormat, options.textCleaning.url);
            }
            else if (options.textCleaning.autoSelect !== false) {
                // Auto-select cleaners based on format
                cleaningResult = await this.cleaningOrchestrator.cleanAuto(baseResult.text, textFormat, options.textCleaning.url);
            }
            else {
                // No cleaning specified, return base result
                return result;
            }
            // Update result with cleaned text
            result.text = cleaningResult.finalText;
            // Add cleaning metadata if requested
            if (options.textCleaning.storeMetadata) {
                result.cleaningResult = cleaningResult;
                // Add cleaning info to metadata
                result.metadata = {
                    ...result.metadata,
                    textCleaning: {
                        cleanersUsed: cleaningResult.cleanerResults.map(r => r.metadata.cleanerName),
                        totalProcessingTime: cleaningResult.totalProcessingTime,
                        originalLength: baseResult.text.length,
                        cleanedLength: cleaningResult.finalText.length,
                        compressionRatio: (1 - cleaningResult.finalText.length / baseResult.text.length).toFixed(2),
                        warnings: cleaningResult.cleanerResults
                            .flatMap(r => r.warnings || [])
                            .filter((w, i, arr) => arr.indexOf(w) === i) // Unique warnings
                    }
                };
            }
            console.log(`Text cleaning applied: ${baseResult.text.length} -> ${result.text.length} characters`);
        }
        catch (error) {
            console.error('Text cleaning failed, using uncleaned text:', error);
            // Add error to metadata
            result.metadata = {
                ...result.metadata,
                textCleaningError: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        return result;
    }
    /**
     * Map content type to text format
     */
    mapContentTypeToTextFormat(contentType, override) {
        if (override) {
            return override;
        }
        switch (contentType) {
            case IUrlDetector_1.ContentType.HTML:
            case IUrlDetector_1.ContentType.WEBPAGE:
                return ITextCleaner_1.TextFormat.HTML;
            case IUrlDetector_1.ContentType.MARKDOWN:
                return ITextCleaner_1.TextFormat.MARKDOWN;
            case IUrlDetector_1.ContentType.JSON:
            case IUrlDetector_1.ContentType.XML:
                return ITextCleaner_1.TextFormat.PLAIN_TEXT;
            case IUrlDetector_1.ContentType.PDF:
            case IUrlDetector_1.ContentType.DOC:
            case IUrlDetector_1.ContentType.DOCX:
            case IUrlDetector_1.ContentType.TEXT:
            case IUrlDetector_1.ContentType.RTF:
                return ITextCleaner_1.TextFormat.PLAIN_TEXT;
            default:
                return ITextCleaner_1.TextFormat.MIXED;
        }
    }
    /**
     * Configure cleaners for a specific URL
     */
    async configureCleanersForUrl(url, cleanerConfigs) {
        await this.cleaningOrchestrator.configureForUrl(url, cleanerConfigs);
    }
    /**
     * Batch configure cleaners for multiple URLs
     */
    async batchConfigureCleaners(urls, cleanerName, config) {
        await this.cleaningOrchestrator.batchConfigureUrls(urls, cleanerName, config);
    }
    /**
     * Get cleaning configuration for a URL
     */
    async getUrlCleaningConfig(url) {
        return await this.cleaningOrchestrator.getUrlConfiguration(url);
    }
    /**
     * Apply configuration template to URLs matching pattern
     */
    async applyCleaningTemplate(urlPattern, cleanerName, config) {
        return await this.cleaningOrchestrator.applyConfigurationTemplate(urlPattern, cleanerName, config);
    }
    /**
     * Get statistics about text cleaning
     */
    getCleaningStats() {
        return this.cleaningOrchestrator.getStats();
    }
    /**
     * Export cleaning configurations
     */
    exportCleaningConfigurations() {
        return this.cleaningOrchestrator.exportConfigurations();
    }
}
exports.ContentProcessorWithCleaning = ContentProcessorWithCleaning;
//# sourceMappingURL=ContentProcessorWithCleaning.js.map