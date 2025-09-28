"use strict";
/**
 * Text Cleaning Orchestrator - Facade Pattern
 * Single Responsibility: Coordinate text cleaning operations
 * Dependency Inversion: Depends on abstractions (interfaces)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextCleaningOrchestrator = void 0;
const ITextCleaner_1 = require("../interfaces/ITextCleaner");
const TextCleanerRegistry_1 = require("./TextCleanerRegistry");
const TextCleanerChain_1 = require("./TextCleanerChain");
const TextCleanerConfigManager_1 = require("./TextCleanerConfigManager");
class TextCleaningOrchestrator {
    registry;
    configManager;
    defaultChains;
    constructor(registry, configManager) {
        this.registry = registry || TextCleanerRegistry_1.TextCleanerRegistry.getInstance();
        this.configManager = configManager || new TextCleanerConfigManager_1.TextCleanerConfigManager();
        this.defaultChains = new Map();
        // Initialize default chains for each format
        this.initializeDefaultChains();
    }
    /**
     * Clean text with specific cleaners
     */
    async cleanWithCleaners(text, cleanerNames, format, url) {
        const chain = new TextCleanerChain_1.TextCleanerChain();
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
    async cleanAuto(text, format, url) {
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
    async cleanWithChain(text, chain, format) {
        return await chain.process(text, format);
    }
    /**
     * Configure cleaners for a URL
     */
    async configureForUrl(url, cleanerConfigs) {
        for (const [cleanerName, config] of cleanerConfigs.entries()) {
            await this.configManager.setUrlConfig(url, cleanerName, config);
        }
    }
    /**
     * Get configuration for a URL
     */
    async getUrlConfiguration(url) {
        return await this.configManager.getAllUrlConfigs(url);
    }
    /**
     * Batch configure URLs
     */
    async batchConfigureUrls(urls, cleanerName, config) {
        await this.configManager.batchSetConfig(urls, cleanerName, config);
    }
    /**
     * Initialize default chains for each format
     */
    initializeDefaultChains() {
        // HTML chain: XSS -> Sanitize -> Readability -> Voca
        const htmlChain = new TextCleanerChain_1.TextCleanerChain();
        const xssCleaner = this.registry.getCleaner('xss');
        const sanitizeCleaner = this.registry.getCleaner('sanitize-html');
        const readabilityCleaner = this.registry.getCleaner('readability');
        const vocaCleaner = this.registry.getCleaner('voca');
        if (xssCleaner)
            htmlChain.addCleaner(xssCleaner);
        if (sanitizeCleaner)
            htmlChain.addCleaner(sanitizeCleaner);
        if (readabilityCleaner)
            htmlChain.addCleaner(readabilityCleaner);
        if (vocaCleaner)
            htmlChain.addCleaner(vocaCleaner);
        this.defaultChains.set(ITextCleaner_1.TextFormat.HTML, htmlChain);
        // Markdown chain: Remark -> Voca
        const markdownChain = new TextCleanerChain_1.TextCleanerChain();
        const remarkCleaner = this.registry.getCleaner('remark');
        const vocaCleanerMd = this.registry.getCleaner('voca');
        if (remarkCleaner)
            markdownChain.addCleaner(remarkCleaner);
        if (vocaCleanerMd)
            markdownChain.addCleaner(vocaCleanerMd);
        this.defaultChains.set(ITextCleaner_1.TextFormat.MARKDOWN, markdownChain);
        // Plain text chain: String.js -> Voca
        const plainTextChain = new TextCleanerChain_1.TextCleanerChain();
        const stringJsCleaner = this.registry.getCleaner('string-js');
        const vocaCleanerText = this.registry.getCleaner('voca');
        if (stringJsCleaner)
            plainTextChain.addCleaner(stringJsCleaner);
        if (vocaCleanerText)
            plainTextChain.addCleaner(vocaCleanerText);
        this.defaultChains.set(ITextCleaner_1.TextFormat.PLAIN_TEXT, plainTextChain);
        // Mixed format chain: All cleaners with appropriate config
        const mixedChain = new TextCleanerChain_1.TextCleanerChain();
        if (xssCleaner)
            mixedChain.addCleaner(xssCleaner);
        if (sanitizeCleaner)
            mixedChain.addCleaner(sanitizeCleaner);
        if (vocaCleaner)
            mixedChain.addCleaner(vocaCleaner);
        if (stringJsCleaner)
            mixedChain.addCleaner(stringJsCleaner);
        this.defaultChains.set(ITextCleaner_1.TextFormat.MIXED, mixedChain);
    }
    /**
     * Create default chain for a format
     */
    createDefaultChainForFormat(format) {
        const chain = new TextCleanerChain_1.TextCleanerChain();
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
    async applyUrlConfigurations(chain, url) {
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
    async storeCleaningMetadata(url, result) {
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
    getRecommendedCleaners(format) {
        const chain = this.defaultChains.get(format);
        return chain ? chain.getCleaners() : [];
    }
    /**
     * Validate cleaner configuration
     */
    validateConfiguration(cleanerName, config) {
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
    getStats() {
        return {
            registeredCleaners: this.registry.getAllCleaners().length,
            defaultChains: this.defaultChains.size,
            supportedFormats: Object.keys(ITextCleaner_1.TextFormat).length / 2 // Enum has both keys and values
        };
    }
    /**
     * Apply template configuration to URLs matching a pattern
     */
    async applyConfigurationTemplate(pattern, cleanerName, config) {
        return await this.configManager.applyConfigTemplate(pattern, cleanerName, config);
    }
    /**
     * Export all configurations
     */
    exportConfigurations() {
        const defaultChains = {};
        for (const [format, chain] of this.defaultChains.entries()) {
            defaultChains[format] = chain.getConfiguration();
        }
        return {
            registry: this.registry.exportConfiguration(),
            defaultChains
        };
    }
}
exports.TextCleaningOrchestrator = TextCleaningOrchestrator;
//# sourceMappingURL=TextCleaningOrchestrator.js.map