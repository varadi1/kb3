"use strict";
/**
 * Central export for all storage implementations
 * Facilitates easy import and dependency injection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageWithTracking = exports.ProcessedFileStorageWithTracking = exports.SqlProcessedFileRepository = exports.SqlOriginalFileRepository = exports.SqlUrlTagRepository = exports.SqlTagManager = exports.SqlUrlRepositoryWithTags = exports.SqlUrlRepository = exports.LocalFileStorage = exports.BaseFileStorage = exports.SqlKnowledgeStore = exports.FileKnowledgeStore = exports.MemoryKnowledgeStore = exports.BaseKnowledgeStore = void 0;
exports.createDefaultKnowledgeStore = createDefaultKnowledgeStore;
exports.createDefaultFileStorage = createDefaultFileStorage;
// Knowledge stores
var BaseKnowledgeStore_1 = require("./BaseKnowledgeStore");
Object.defineProperty(exports, "BaseKnowledgeStore", { enumerable: true, get: function () { return BaseKnowledgeStore_1.BaseKnowledgeStore; } });
var MemoryKnowledgeStore_1 = require("./MemoryKnowledgeStore");
Object.defineProperty(exports, "MemoryKnowledgeStore", { enumerable: true, get: function () { return MemoryKnowledgeStore_1.MemoryKnowledgeStore; } });
var FileKnowledgeStore_1 = require("./FileKnowledgeStore");
Object.defineProperty(exports, "FileKnowledgeStore", { enumerable: true, get: function () { return FileKnowledgeStore_1.FileKnowledgeStore; } });
var SqlKnowledgeStore_1 = require("./SqlKnowledgeStore");
Object.defineProperty(exports, "SqlKnowledgeStore", { enumerable: true, get: function () { return SqlKnowledgeStore_1.SqlKnowledgeStore; } });
// File storage
var BaseFileStorage_1 = require("./BaseFileStorage");
Object.defineProperty(exports, "BaseFileStorage", { enumerable: true, get: function () { return BaseFileStorage_1.BaseFileStorage; } });
var LocalFileStorage_1 = require("./LocalFileStorage");
Object.defineProperty(exports, "LocalFileStorage", { enumerable: true, get: function () { return LocalFileStorage_1.LocalFileStorage; } });
// URL Repository
var SqlUrlRepository_1 = require("./SqlUrlRepository");
Object.defineProperty(exports, "SqlUrlRepository", { enumerable: true, get: function () { return SqlUrlRepository_1.SqlUrlRepository; } });
// SqlUrlRepositoryWithTags is now integrated into SqlUrlRepository
var SqlUrlRepository_2 = require("./SqlUrlRepository"); // Backward compatibility
Object.defineProperty(exports, "SqlUrlRepositoryWithTags", { enumerable: true, get: function () { return SqlUrlRepository_2.SqlUrlRepository; } });
// Tag Management
var SqlTagManager_1 = require("./SqlTagManager");
Object.defineProperty(exports, "SqlTagManager", { enumerable: true, get: function () { return SqlTagManager_1.SqlTagManager; } });
var SqlUrlTagRepository_1 = require("./SqlUrlTagRepository");
Object.defineProperty(exports, "SqlUrlTagRepository", { enumerable: true, get: function () { return SqlUrlTagRepository_1.SqlUrlTagRepository; } });
// Original File Repository
var SqlOriginalFileRepository_1 = require("./SqlOriginalFileRepository");
Object.defineProperty(exports, "SqlOriginalFileRepository", { enumerable: true, get: function () { return SqlOriginalFileRepository_1.SqlOriginalFileRepository; } });
// Processed File Repository and Storage
var SqlProcessedFileRepository_1 = require("./SqlProcessedFileRepository");
Object.defineProperty(exports, "SqlProcessedFileRepository", { enumerable: true, get: function () { return SqlProcessedFileRepository_1.SqlProcessedFileRepository; } });
var ProcessedFileStorageWithTracking_1 = require("./ProcessedFileStorageWithTracking");
Object.defineProperty(exports, "ProcessedFileStorageWithTracking", { enumerable: true, get: function () { return ProcessedFileStorageWithTracking_1.ProcessedFileStorageWithTracking; } });
var FileStorageWithTracking_1 = require("./FileStorageWithTracking");
Object.defineProperty(exports, "FileStorageWithTracking", { enumerable: true, get: function () { return FileStorageWithTracking_1.FileStorageWithTracking; } });
const MemoryKnowledgeStore_2 = require("./MemoryKnowledgeStore");
const FileKnowledgeStore_2 = require("./FileKnowledgeStore");
const LocalFileStorage_2 = require("./LocalFileStorage");
// Factory functions for creating default storage implementations
function createDefaultKnowledgeStore(storePath) {
    if (storePath) {
        return new FileKnowledgeStore_2.FileKnowledgeStore(storePath);
    }
    return new MemoryKnowledgeStore_2.MemoryKnowledgeStore();
}
function createDefaultFileStorage(basePath) {
    return new LocalFileStorage_2.LocalFileStorage(basePath);
}
//# sourceMappingURL=index.js.map