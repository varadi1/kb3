"use strict";
/**
 * Main entry point for the Knowledge Base System
 * Provides convenient access to all system components
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlUrlRepository = exports.SqlKnowledgeStore = exports.LocalFileStorage = exports.FileKnowledgeStore = exports.BaseKnowledgeStore = exports.BaseFileStorage = exports.validateConfiguration = exports.createUnifiedConfiguration = exports.createSqlConfiguration = exports.createDevelopmentConfiguration = exports.createProductionConfiguration = exports.createDefaultConfiguration = exports.KnowledgeBaseFactory = exports.KnowledgeBaseOrchestrator = void 0;
exports.createKnowledgeBase = createKnowledgeBase;
// Main orchestrator and factory
var orchestrator_1 = require("./orchestrator");
Object.defineProperty(exports, "KnowledgeBaseOrchestrator", { enumerable: true, get: function () { return orchestrator_1.KnowledgeBaseOrchestrator; } });
var factory_1 = require("./factory");
Object.defineProperty(exports, "KnowledgeBaseFactory", { enumerable: true, get: function () { return factory_1.KnowledgeBaseFactory; } });
// Configuration
var config_1 = require("./config");
Object.defineProperty(exports, "createDefaultConfiguration", { enumerable: true, get: function () { return config_1.createDefaultConfiguration; } });
Object.defineProperty(exports, "createProductionConfiguration", { enumerable: true, get: function () { return config_1.createProductionConfiguration; } });
Object.defineProperty(exports, "createDevelopmentConfiguration", { enumerable: true, get: function () { return config_1.createDevelopmentConfiguration; } });
Object.defineProperty(exports, "createSqlConfiguration", { enumerable: true, get: function () { return config_1.createSqlConfiguration; } });
Object.defineProperty(exports, "createUnifiedConfiguration", { enumerable: true, get: function () { return config_1.createUnifiedConfiguration; } });
Object.defineProperty(exports, "validateConfiguration", { enumerable: true, get: function () { return config_1.validateConfiguration; } });
// Core interfaces
__exportStar(require("./interfaces"), exports);
// Component implementations
__exportStar(require("./detectors"), exports);
__exportStar(require("./fetchers"), exports);
__exportStar(require("./processors"), exports);
var storage_1 = require("./storage");
Object.defineProperty(exports, "BaseFileStorage", { enumerable: true, get: function () { return storage_1.BaseFileStorage; } });
Object.defineProperty(exports, "BaseKnowledgeStore", { enumerable: true, get: function () { return storage_1.BaseKnowledgeStore; } });
Object.defineProperty(exports, "FileKnowledgeStore", { enumerable: true, get: function () { return storage_1.FileKnowledgeStore; } });
Object.defineProperty(exports, "LocalFileStorage", { enumerable: true, get: function () { return storage_1.LocalFileStorage; } });
Object.defineProperty(exports, "SqlKnowledgeStore", { enumerable: true, get: function () { return storage_1.SqlKnowledgeStore; } });
Object.defineProperty(exports, "SqlUrlRepository", { enumerable: true, get: function () { return storage_1.SqlUrlRepository; } });
// Utilities
__exportStar(require("./utils"), exports);
// Import for the convenience function
const factory_2 = require("./factory");
const config_2 = require("./config");
// Convenience function for quick setup
function createKnowledgeBase(config) {
    if (config) {
        const fullConfig = (0, config_2.createDefaultConfiguration)(config);
        return factory_2.KnowledgeBaseFactory.createKnowledgeBase(fullConfig);
    }
    return factory_2.KnowledgeBaseFactory.createDefaultKnowledgeBase();
}
//# sourceMappingURL=index.js.map