"use strict";
/**
 * Text Cleaner Registry - Singleton Pattern
 * Single Responsibility: Manage registration and retrieval of text cleaners
 * Open/Closed: New cleaners can be added without modifying the registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextCleanerRegistry = void 0;
class TextCleanerRegistry {
    static instance;
    cleaners;
    constructor() {
        this.cleaners = new Map();
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!TextCleanerRegistry.instance) {
            TextCleanerRegistry.instance = new TextCleanerRegistry();
        }
        return TextCleanerRegistry.instance;
    }
    /**
     * Register a new cleaner
     */
    register(cleaner) {
        if (!cleaner || !cleaner.name) {
            throw new Error('Invalid cleaner: must have a name');
        }
        if (this.cleaners.has(cleaner.name)) {
            console.warn(`Cleaner '${cleaner.name}' is already registered. Overwriting...`);
        }
        this.cleaners.set(cleaner.name, cleaner);
        // Successfully registered cleaner
    }
    /**
     * Unregister a cleaner
     */
    unregister(cleanerName) {
        if (!this.cleaners.has(cleanerName)) {
            console.warn(`Cleaner '${cleanerName}' is not registered`);
            return;
        }
        this.cleaners.delete(cleanerName);
        // Successfully unregistered cleaner
    }
    /**
     * Get a cleaner by name
     */
    getCleaner(cleanerName) {
        return this.cleaners.get(cleanerName);
    }
    /**
     * Get all registered cleaners
     */
    getAllCleaners() {
        return Array.from(this.cleaners.values());
    }
    /**
     * Get cleaners that support a specific format
     */
    getCleanersForFormat(format) {
        return this.getAllCleaners().filter(cleaner => cleaner.supportedFormats.includes(format));
    }
    /**
     * Check if a cleaner is registered
     */
    hasClleaner(cleanerName) {
        return this.cleaners.has(cleanerName);
    }
    /**
     * Clear all registered cleaners
     */
    clear() {
        this.cleaners.clear();
        // Successfully cleared all cleaners
    }
    /**
     * Get registry statistics
     */
    getStats() {
        const cleanersByFormat = new Map();
        let enabledCleaners = 0;
        for (const cleaner of this.cleaners.values()) {
            if (cleaner.getConfig().enabled) {
                enabledCleaners++;
            }
            for (const format of cleaner.supportedFormats) {
                cleanersByFormat.set(format, (cleanersByFormat.get(format) || 0) + 1);
            }
        }
        return {
            totalCleaners: this.cleaners.size,
            cleanersByFormat,
            enabledCleaners
        };
    }
    /**
     * Initialize with default cleaners
     */
    initializeDefaultCleaners() {
        // Import all cleaner implementations
        const { SanitizeHtmlCleaner } = require('./SanitizeHtmlCleaner');
        const { ReadabilityCleaner } = require('./ReadabilityCleaner');
        const { XssCleaner } = require('./XssCleaner');
        const { VocaCleaner } = require('./VocaCleaner');
        const { StringJsCleaner } = require('./StringJsCleaner');
        const { RemarkCleaner } = require('./RemarkCleaner');
        // Register default cleaners
        this.register(new SanitizeHtmlCleaner());
        this.register(new ReadabilityCleaner());
        this.register(new XssCleaner());
        this.register(new VocaCleaner());
        this.register(new StringJsCleaner());
        this.register(new RemarkCleaner());
        // Successfully initialized default cleaners
    }
    /**
     * Get cleaners sorted by priority
     */
    getCleanersByPriority(ascending = false) {
        const cleaners = this.getAllCleaners();
        return cleaners.sort((a, b) => {
            const priorityA = a.getConfig().priority || 0;
            const priorityB = b.getConfig().priority || 0;
            return ascending
                ? priorityA - priorityB
                : priorityB - priorityA;
        });
    }
    /**
     * Export registry configuration
     */
    exportConfiguration() {
        const config = {};
        for (const [name, cleaner] of this.cleaners.entries()) {
            config[name] = {
                description: cleaner.description,
                supportedFormats: cleaner.supportedFormats,
                config: cleaner.getConfig()
            };
        }
        return config;
    }
    /**
     * Import registry configuration
     */
    importConfiguration(config) {
        for (const [name, settings] of Object.entries(config)) {
            const cleaner = this.cleaners.get(name);
            if (cleaner && settings.config) {
                cleaner.updateConfig(settings.config);
                // Successfully updated configuration
            }
        }
    }
}
exports.TextCleanerRegistry = TextCleanerRegistry;
//# sourceMappingURL=TextCleanerRegistry.js.map