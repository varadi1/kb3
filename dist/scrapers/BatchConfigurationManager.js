"use strict";
/**
 * Batch configuration manager for scraper parameters
 * Single Responsibility: Manages batch configuration operations
 * Open/Closed Principle: Extensible for new configuration strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationBuilder = exports.BatchConfigurationManager = void 0;
class BatchConfigurationManager {
    parameterManager;
    scraperSelector;
    presets = new Map();
    constructor(parameterManager, scraperSelector) {
        this.parameterManager = parameterManager;
        this.scraperSelector = scraperSelector;
        this.initializePresets();
    }
    /**
     * Execute a batch operation
     */
    executeBatchOperation(operation) {
        const result = {
            successful: [],
            failed: [],
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0
        };
        // Determine URLs to process
        const urls = this.resolveUrls(operation);
        switch (operation.type) {
            case 'set':
                if (!operation.configuration) {
                    throw new Error('Configuration required for set operation');
                }
                return this.batchSet(urls, operation.configuration);
            case 'update':
                if (!operation.updateFn) {
                    throw new Error('Update function required for update operation');
                }
                return this.batchUpdate(urls, operation.updateFn);
            case 'remove':
                return this.batchRemove(urls);
            case 'clear':
                this.parameterManager.clearParameters();
                result.totalProcessed = 1;
                result.totalSuccessful = 1;
                return result;
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }
    /**
     * Apply a preset configuration
     */
    applyPreset(presetName, urls) {
        const preset = this.presets.get(presetName);
        if (!preset) {
            throw new Error(`Preset not found: ${presetName}`);
        }
        // Apply the preset configuration to all URLs
        return this.batchSet(urls, preset.configuration);
    }
    /**
     * Configure URLs by domain
     */
    configureByDomain(domain, configuration) {
        // Get all URLs currently tracked
        const allParams = this.parameterManager.exportParameters();
        const domainUrls = [];
        for (const [url] of allParams) {
            try {
                const urlObj = new URL(url);
                if (urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)) {
                    domainUrls.push(url);
                }
            }
            catch {
                // Invalid URL, skip
            }
        }
        if (domainUrls.length === 0) {
            // No existing URLs for this domain, set up a rule instead
            this.scraperSelector.addRule({
                pattern: domain,
                scraperName: configuration.scraperType,
                priority: configuration.priority || 10
            });
            return {
                successful: [domain],
                failed: [],
                totalProcessed: 1,
                totalSuccessful: 1,
                totalFailed: 0
            };
        }
        return this.batchSet(domainUrls, configuration);
    }
    /**
     * Configure URLs by file extension
     */
    configureByExtension(extension, configuration) {
        const pattern = extension.startsWith('.') ? `*${extension}` : `*.${extension}`;
        // Add rule for future URLs
        this.scraperSelector.addRule({
            pattern: new RegExp(`\\${extension.startsWith('.') ? extension : '.' + extension}$`, 'i'),
            scraperName: configuration.scraperType,
            priority: configuration.priority || 15
        });
        // Find and configure existing URLs
        const allParams = this.parameterManager.exportParameters();
        const matchingUrls = [];
        for (const [url] of allParams) {
            if (url.toLowerCase().includes(extension)) {
                matchingUrls.push(url);
            }
        }
        if (matchingUrls.length > 0) {
            return this.batchSet(matchingUrls, configuration);
        }
        return {
            successful: [pattern],
            failed: [],
            totalProcessed: 1,
            totalSuccessful: 1,
            totalFailed: 0
        };
    }
    /**
     * Create a configuration builder for fluent API
     */
    createConfigurationBuilder() {
        return new ConfigurationBuilder(this);
    }
    /**
     * Get all configured URLs with their configurations
     */
    getAllConfigurations() {
        return this.parameterManager.exportParameters();
    }
    /**
     * Import configurations from a Map
     */
    importConfigurations(configs) {
        const result = {
            successful: [],
            failed: [],
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0
        };
        for (const [url, config] of configs) {
            try {
                this.parameterManager.setParameters(url, config);
                result.successful.push(url);
                result.totalSuccessful++;
            }
            catch (error) {
                result.failed.push({ url, error: error.message });
                result.totalFailed++;
            }
            result.totalProcessed++;
        }
        return result;
    }
    /**
     * Export configurations to JSON
     */
    exportToJSON() {
        const configs = this.parameterManager.exportParameters();
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            configurations: Array.from(configs.entries()).map(([url, config]) => ({
                url,
                ...config
            })),
            rules: this.scraperSelector.getRules()
        };
        return JSON.stringify(exportData, null, 2);
    }
    /**
     * Import configurations from JSON
     */
    importFromJSON(json) {
        const importData = JSON.parse(json);
        const result = {
            successful: [],
            failed: [],
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0
        };
        // Import configurations
        if (importData.configurations) {
            for (const item of importData.configurations) {
                const { url, ...config } = item;
                try {
                    this.parameterManager.setParameters(url, config);
                    result.successful.push(url);
                    result.totalSuccessful++;
                }
                catch (error) {
                    result.failed.push({ url, error: error.message });
                    result.totalFailed++;
                }
                result.totalProcessed++;
            }
        }
        // Import rules
        if (importData.rules) {
            this.scraperSelector.clearRules();
            this.scraperSelector.addRules(importData.rules);
        }
        return result;
    }
    batchSet(urls, configuration) {
        const result = {
            successful: [],
            failed: [],
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0
        };
        for (const url of urls) {
            try {
                this.parameterManager.setParameters(url, configuration);
                result.successful.push(url);
                result.totalSuccessful++;
            }
            catch (error) {
                result.failed.push({ url, error: error.message });
                result.totalFailed++;
            }
            result.totalProcessed++;
        }
        return result;
    }
    batchUpdate(urls, updateFn) {
        const result = {
            successful: [],
            failed: [],
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0
        };
        for (const url of urls) {
            try {
                const current = this.parameterManager.getParameters(url);
                if (current) {
                    const updated = updateFn(current);
                    this.parameterManager.setParameters(url, updated);
                    result.successful.push(url);
                    result.totalSuccessful++;
                }
                else {
                    result.failed.push({ url, error: 'No existing configuration' });
                    result.totalFailed++;
                }
            }
            catch (error) {
                result.failed.push({ url, error: error.message });
                result.totalFailed++;
            }
            result.totalProcessed++;
        }
        return result;
    }
    batchRemove(urls) {
        const result = {
            successful: [],
            failed: [],
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0
        };
        for (const url of urls) {
            try {
                this.parameterManager.clearParameters(url);
                result.successful.push(url);
                result.totalSuccessful++;
            }
            catch (error) {
                result.failed.push({ url, error: error.message });
                result.totalFailed++;
            }
            result.totalProcessed++;
        }
        return result;
    }
    resolveUrls(operation) {
        const urls = operation.urls || [];
        if (operation.patterns) {
            // Get all configured URLs and filter by patterns
            const allParams = this.parameterManager.exportParameters();
            for (const [url] of allParams) {
                for (const pattern of operation.patterns) {
                    if (this.matchesPattern(url, pattern)) {
                        urls.push(url);
                    }
                }
            }
        }
        return [...new Set(urls)]; // Remove duplicates
    }
    matchesPattern(url, pattern) {
        // Convert wildcard pattern to regex
        const regexPattern = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');
        return new RegExp(regexPattern).test(url);
    }
    initializePresets() {
        // Preset for aggressive crawling
        this.presets.set('aggressive-crawl', {
            name: 'aggressive-crawl',
            description: 'Aggressive crawling with JavaScript execution and full content extraction',
            configuration: {
                scraperType: 'crawl4ai',
                parameters: {
                    maxDepth: 3,
                    jsExecution: true,
                    magic: true,
                    extractionStrategy: 'llm',
                    onlyMainContent: true,
                    screenshot: true,
                    wordCountThreshold: 100,
                    antiBot: true,
                    cacheMode: 'bypass'
                },
                enabled: true
            }
        });
        // Preset for document extraction
        this.presets.set('document-extraction', {
            name: 'document-extraction',
            description: 'Optimized for PDF and document extraction with OCR',
            configuration: {
                scraperType: 'docling',
                parameters: {
                    format: 'markdown',
                    ocr: true,
                    ocrEngine: 'tesseract',
                    tableStructure: true,
                    exportFigures: true,
                    exportTables: true,
                    extractAnnotations: true,
                    extractBookmarks: true
                },
                enabled: true
            }
        });
        // Preset for SPA rendering
        this.presets.set('spa-rendering', {
            name: 'spa-rendering',
            description: 'Optimized for Single Page Applications with full JavaScript rendering',
            configuration: {
                scraperType: 'playwright',
                parameters: {
                    headless: true,
                    viewport: { width: 1920, height: 1080 },
                    waitUntil: 'networkidle',
                    javaScriptEnabled: true,
                    scrollToBottom: true,
                    screenshot: true,
                    timeout: 60000
                },
                enabled: true
            }
        });
        // Preset for fast extraction
        this.presets.set('fast-extraction', {
            name: 'fast-extraction',
            description: 'Fast extraction without JavaScript rendering',
            configuration: {
                scraperType: 'http',
                parameters: {
                    timeout: 10000,
                    retries: 2
                },
                enabled: true
            }
        });
    }
}
exports.BatchConfigurationManager = BatchConfigurationManager;
/**
 * Fluent configuration builder
 */
class ConfigurationBuilder {
    manager;
    scraperType = 'http';
    parameters = {};
    priority;
    enabled = true;
    constructor(manager) {
        this.manager = manager;
    }
    forScraper(scraperType) {
        this.scraperType = scraperType;
        return this;
    }
    withParameters(parameters) {
        this.parameters = { ...this.parameters, ...parameters };
        return this;
    }
    withPriority(priority) {
        this.priority = priority;
        return this;
    }
    enabled(value) {
        this.enabled = value;
        return this;
    }
    applyTo(urls) {
        const config = {
            scraperType: this.scraperType,
            parameters: this.parameters,
            priority: this.priority,
            enabled: this.enabled
        };
        return this.manager.executeBatchOperation({
            type: 'set',
            urls,
            configuration: config
        });
    }
    applyToPattern(pattern) {
        const config = {
            scraperType: this.scraperType,
            parameters: this.parameters,
            priority: this.priority,
            enabled: this.enabled
        };
        return this.manager.executeBatchOperation({
            type: 'set',
            patterns: [pattern],
            configuration: config
        });
    }
    applyToDomain(domain) {
        const config = {
            scraperType: this.scraperType,
            parameters: this.parameters,
            priority: this.priority,
            enabled: this.enabled
        };
        return this.manager.configureByDomain(domain, config);
    }
    applyToExtension(extension) {
        const config = {
            scraperType: this.scraperType,
            parameters: this.parameters,
            priority: this.priority,
            enabled: this.enabled
        };
        return this.manager.configureByExtension(extension, config);
    }
}
exports.ConfigurationBuilder = ConfigurationBuilder;
//# sourceMappingURL=BatchConfigurationManager.js.map