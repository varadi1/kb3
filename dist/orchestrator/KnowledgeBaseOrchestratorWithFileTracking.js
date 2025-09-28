"use strict";
/**
 * Open/Closed Principle: Extends base orchestrator without modifying it
 * Single Responsibility: Adds original file tracking to the orchestration process
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
exports.KnowledgeBaseOrchestratorWithFileTracking = void 0;
const KnowledgeBaseOrchestrator_1 = require("./KnowledgeBaseOrchestrator");
const crypto = __importStar(require("crypto"));
class KnowledgeBaseOrchestratorWithFileTracking extends KnowledgeBaseOrchestrator_1.KnowledgeBaseOrchestrator {
    originalFileRepository;
    constructor(urlDetector, contentFetcher, contentProcessor, knowledgeStore, fileStorage, urlRepository, contentChangeDetector, originalFileRepository) {
        super(urlDetector, contentFetcher, contentProcessor, knowledgeStore, fileStorage, urlRepository, contentChangeDetector);
        this.originalFileRepository = originalFileRepository;
    }
    /**
     * Override processUrl to add file tracking
     */
    async processUrl(url, options = {}) {
        // Call the parent processUrl method
        const result = await super.processUrl(url, options);
        // If processing was successful and we have a storage path, track the original file
        if (result.success && result.storagePath) {
            try {
                // Get the fetched content metadata from the result
                const fetchedContent = result.metadata?.fetchedContent || {};
                // Calculate checksum if we have content
                const content = fetchedContent.content;
                const checksum = content
                    ? crypto.createHash('sha256').update(Buffer.isBuffer(content) ? content : Buffer.from(content)).digest('hex')
                    : 'unknown';
                const fileInfo = {
                    url,
                    filePath: result.storagePath,
                    mimeType: fetchedContent.mimeType || result.contentType || 'unknown',
                    size: fetchedContent.size || 0,
                    checksum,
                    scraperUsed: result.metadata?.scraperUsed,
                    metadata: {
                        headers: fetchedContent.headers,
                        scraperConfig: result.metadata?.scraperConfig,
                        scraperMetadata: result.metadata?.scraperMetadata,
                        fetchedAt: new Date().toISOString(),
                        processingResult: {
                            entryId: result.entryId,
                            contentType: result.contentType
                        }
                    }
                };
                const fileId = await this.originalFileRepository.recordOriginalFile(fileInfo);
                // Add the original file ID to the result metadata
                result.metadata = {
                    ...result.metadata,
                    originalFileId: fileId
                };
            }
            catch (error) {
                // Log error but don't fail the entire process
                console.error('Failed to track original file:', error);
                result.metadata = {
                    ...result.metadata,
                    originalFileTrackingError: error
                };
            }
        }
        return result;
    }
    /**
     * Get the original file repository for direct access
     */
    getOriginalFileRepository() {
        return this.originalFileRepository;
    }
}
exports.KnowledgeBaseOrchestratorWithFileTracking = KnowledgeBaseOrchestratorWithFileTracking;
//# sourceMappingURL=KnowledgeBaseOrchestratorWithFileTracking.js.map