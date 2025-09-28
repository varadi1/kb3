"use strict";
/**
 * Central export for factory components
 * All factories now consolidated into KnowledgeBaseFactory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseFactoryWithFileTracking = exports.KnowledgeBaseFactoryWithTags = exports.KnowledgeBaseFactory = void 0;
var KnowledgeBaseFactory_1 = require("./KnowledgeBaseFactory");
Object.defineProperty(exports, "KnowledgeBaseFactory", { enumerable: true, get: function () { return KnowledgeBaseFactory_1.KnowledgeBaseFactory; } });
// Backward compatibility exports
Object.defineProperty(exports, "KnowledgeBaseFactoryWithTags", { enumerable: true, get: function () { return KnowledgeBaseFactory_1.KnowledgeBaseFactoryWithTags; } });
Object.defineProperty(exports, "KnowledgeBaseFactoryWithFileTracking", { enumerable: true, get: function () { return KnowledgeBaseFactory_1.KnowledgeBaseFactoryWithFileTracking; } });
//# sourceMappingURL=index.js.map