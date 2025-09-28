"use strict";
/**
 * Configuration interface and default implementation
 * Single Responsibility: Manages system configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultConfiguration = createDefaultConfiguration;
exports.createProductionConfiguration = createProductionConfiguration;
exports.createDevelopmentConfiguration = createDevelopmentConfiguration;
exports.createSqlConfiguration = createSqlConfiguration;
exports.validateConfiguration = validateConfiguration;
function createDefaultConfiguration(overrides) {
    const defaultConfig = {
        storage: {
            knowledgeStore: {
                type: 'memory',
                indexedFields: ['url', 'contentType', 'tags', 'title'],
                backupEnabled: false
            },
            fileStorage: {
                basePath: './data/files',
                compressionEnabled: false,
                encryptionEnabled: false
            },
            fileStore: {
                path: './data/files'
            },
            enableDuplicateDetection: false,
            enableUrlTracking: true,
            urlRepositoryPath: './data/urls.db'
        },
        processing: {
            maxTextLength: 1000000,
            defaultOptions: {
                extractImages: false,
                extractLinks: true,
                extractMetadata: true,
                preserveFormatting: false
            },
            concurrency: 5,
            timeout: 30000,
            textExtraction: true,
            metadataExtraction: true,
            skipUnchangedContent: false
        },
        network: {
            timeout: 30000,
            maxSize: 100 * 1024 * 1024, // 100MB
            userAgent: 'KnowledgeBase-System/1.0',
            followRedirects: true,
            maxRedirects: 10
        },
        detection: {
            enableExtensionDetection: true,
            enableHeaderDetection: true,
            enableContentDetection: true,
            contentSampleSize: 2048
        },
        logging: {
            level: 'info',
            enableConsole: true
        }
    };
    return mergeConfig(defaultConfig, overrides);
}
function createProductionConfiguration() {
    return createDefaultConfiguration({
        storage: {
            knowledgeStore: {
                type: 'file',
                path: './data/knowledge',
                backupEnabled: true
            },
            fileStorage: {
                basePath: './data/files',
                compressionEnabled: true
            },
            fileStore: {
                path: './data/files'
            }
        },
        processing: {
            concurrency: 10
        },
        logging: {
            level: 'warn',
            logFile: './logs/knowledgebase.log'
        }
    });
}
function createDevelopmentConfiguration() {
    return createDefaultConfiguration({
        storage: {
            knowledgeStore: {
                type: 'memory'
            },
            fileStorage: {
                basePath: './dev-data/files'
            },
            fileStore: {
                path: './dev-data/files'
            }
        },
        processing: {
            concurrency: 2
        },
        network: {
            timeout: 10000,
            maxSize: 10 * 1024 * 1024 // 10MB for development
        },
        logging: {
            level: 'debug'
        }
    });
}
function createSqlConfiguration(overrides) {
    const baseConfig = createDefaultConfiguration({
        storage: {
            knowledgeStore: {
                type: 'sql',
                dbPath: './data/knowledge.db',
                urlDbPath: './data/urls.db',
                backupEnabled: true
            },
            fileStorage: {
                basePath: './data/files',
                compressionEnabled: true
            },
            fileStore: {
                path: './data/files'
            },
            enableDuplicateDetection: true
        },
        processing: {
            concurrency: 10
        },
        logging: {
            level: 'info',
            logFile: './logs/knowledgebase.log'
        }
    });
    return mergeConfig(baseConfig, overrides);
}
function mergeConfig(base, overrides) {
    if (!overrides)
        return base;
    return {
        storage: {
            knowledgeStore: {
                ...base.storage.knowledgeStore,
                ...overrides.storage?.knowledgeStore
            },
            fileStorage: {
                ...base.storage.fileStorage,
                ...overrides.storage?.fileStorage
            },
            fileStore: {
                ...base.storage.fileStore,
                ...overrides.storage?.fileStore
            },
            enableDuplicateDetection: overrides.storage?.enableDuplicateDetection ?? base.storage.enableDuplicateDetection,
            enableUrlTracking: overrides.storage?.enableUrlTracking ?? base.storage.enableUrlTracking,
            urlRepositoryPath: overrides.storage?.urlRepositoryPath ?? base.storage.urlRepositoryPath
        },
        processing: {
            ...base.processing,
            ...overrides.processing,
            defaultOptions: {
                ...base.processing.defaultOptions,
                ...overrides.processing?.defaultOptions
            }
        },
        network: {
            ...base.network,
            ...overrides.network
        },
        detection: {
            ...base.detection,
            ...overrides.detection
        },
        logging: {
            ...base.logging,
            ...overrides.logging
        },
        scraping: {
            ...base.scraping,
            ...overrides.scraping,
            rateLimiting: {
                ...base.scraping?.rateLimiting,
                ...overrides.scraping?.rateLimiting
            },
            errorCollection: {
                ...base.scraping?.errorCollection,
                ...overrides.scraping?.errorCollection
            }
        }
    };
}
function validateConfiguration(config) {
    // Validate storage configuration
    if (!config.storage.fileStorage.basePath) {
        throw new Error('File storage base path is required');
    }
    if (config.storage.knowledgeStore.type === 'file' && !config.storage.knowledgeStore.path) {
        throw new Error('Knowledge store path is required for file storage type');
    }
    // Validate processing configuration
    if (config.processing.maxTextLength && config.processing.maxTextLength <= 0) {
        throw new Error('Max text length must be positive');
    }
    if (config.processing.concurrency && config.processing.concurrency <= 0) {
        throw new Error('Concurrency must be positive');
    }
    if (config.processing.timeout && config.processing.timeout <= 0) {
        throw new Error('Processing timeout must be positive');
    }
    // Validate network configuration
    if (config.network.timeout && config.network.timeout <= 0) {
        throw new Error('Network timeout must be positive');
    }
    if (config.network.maxSize && config.network.maxSize <= 0) {
        throw new Error('Max network size must be positive');
    }
    if (config.network.maxRedirects && config.network.maxRedirects < 0) {
        throw new Error('Max redirects cannot be negative');
    }
    // Validate detection configuration
    if (config.detection.contentSampleSize && config.detection.contentSampleSize <= 0) {
        throw new Error('Content sample size must be positive');
    }
    // Validate logging configuration
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(config.logging.level)) {
        throw new Error(`Invalid log level: ${config.logging.level}`);
    }
}
//# sourceMappingURL=Configuration.js.map