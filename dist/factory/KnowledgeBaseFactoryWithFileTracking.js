"use strict";
/**
 * Factory for creating knowledge base with original file tracking
 * Dependency Inversion Principle: Depends on abstractions, not concretions
 * Open/Closed Principle: Extends existing factory without modifying it
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseFactoryWithFileTracking = void 0;
const Configuration_1 = require("../config/Configuration");
const SqlOriginalFileRepository_1 = require("../storage/SqlOriginalFileRepository");
const FileStorageWithTracking_1 = require("../storage/FileStorageWithTracking");
const KnowledgeBaseFactory_1 = require("./KnowledgeBaseFactory");
const path = __importStar(require("path"));
class KnowledgeBaseFactoryWithFileTracking {
    /**
     * Creates a knowledge base with original file tracking capability
     * Wraps the file storage to track original files
     */
    static async createKnowledgeBaseWithFileTracking(config) {
        // Initialize original file repository
        const originalFilePath = config.storage.originalFileStore?.path ||
            path.join(path.dirname(config.storage.knowledgeStore.dbPath || config.storage.knowledgeStore.path || './data'), 'original_files.db');
        const originalFileRepository = new SqlOriginalFileRepository_1.SqlOriginalFileRepository(originalFilePath);
        await originalFileRepository.initialize();
        // Create the standard knowledge base using the existing factory
        const standardKb = KnowledgeBaseFactory_1.KnowledgeBaseFactory.createKnowledgeBase(config);
        // Get the file storage from the orchestrator (using type assertion to access private member)
        const originalFileStorage = standardKb.fileStorage;
        // Wrap the file storage with tracking capability
        const fileStorageWithTracking = new FileStorageWithTracking_1.FileStorageWithTracking(originalFileStorage, originalFileRepository);
        // Replace the file storage in the orchestrator
        standardKb.fileStorage = fileStorageWithTracking;
        // Add the getOriginalFileRepository method to the orchestrator
        standardKb.getOriginalFileRepository = () => originalFileRepository;
        return standardKb;
    }
    /**
     * Creates with default SQL configuration
     */
    static async createDefault() {
        const baseConfig = (0, Configuration_1.createSqlConfiguration)();
        const defaultConfig = {
            ...baseConfig,
            storage: {
                ...baseConfig.storage,
                originalFileStore: {
                    type: 'sql',
                    path: path.join(process.cwd(), 'data', 'original_files.db')
                }
            }
        };
        return this.createKnowledgeBaseWithFileTracking(defaultConfig);
    }
}
exports.KnowledgeBaseFactoryWithFileTracking = KnowledgeBaseFactoryWithFileTracking;
//# sourceMappingURL=KnowledgeBaseFactoryWithFileTracking.js.map