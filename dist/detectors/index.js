"use strict";
/**
 * Central export for all URL detectors
 * Facilitates easy import and dependency injection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlDetectorRegistry = exports.ContentBasedDetector = exports.HeaderBasedDetector = exports.ExtensionBasedDetector = exports.BaseUrlDetector = void 0;
exports.createDefaultDetectorRegistry = createDefaultDetectorRegistry;
var BaseUrlDetector_1 = require("./BaseUrlDetector");
Object.defineProperty(exports, "BaseUrlDetector", { enumerable: true, get: function () { return BaseUrlDetector_1.BaseUrlDetector; } });
var ExtensionBasedDetector_1 = require("./ExtensionBasedDetector");
Object.defineProperty(exports, "ExtensionBasedDetector", { enumerable: true, get: function () { return ExtensionBasedDetector_1.ExtensionBasedDetector; } });
var HeaderBasedDetector_1 = require("./HeaderBasedDetector");
Object.defineProperty(exports, "HeaderBasedDetector", { enumerable: true, get: function () { return HeaderBasedDetector_1.HeaderBasedDetector; } });
var ContentBasedDetector_1 = require("./ContentBasedDetector");
Object.defineProperty(exports, "ContentBasedDetector", { enumerable: true, get: function () { return ContentBasedDetector_1.ContentBasedDetector; } });
var UrlDetectorRegistry_1 = require("./UrlDetectorRegistry");
Object.defineProperty(exports, "UrlDetectorRegistry", { enumerable: true, get: function () { return UrlDetectorRegistry_1.UrlDetectorRegistry; } });
const UrlDetectorRegistry_2 = require("./UrlDetectorRegistry");
const ExtensionBasedDetector_2 = require("./ExtensionBasedDetector");
const HeaderBasedDetector_2 = require("./HeaderBasedDetector");
const ContentBasedDetector_2 = require("./ContentBasedDetector");
// Factory function for creating default detector registry
function createDefaultDetectorRegistry() {
    const registry = new UrlDetectorRegistry_2.UrlDetectorRegistry();
    // Add detectors in priority order (lower number = higher priority)
    registry.addDetector(new ExtensionBasedDetector_2.ExtensionBasedDetector()); // Priority 1
    registry.addDetector(new HeaderBasedDetector_2.HeaderBasedDetector()); // Priority 2
    registry.addDetector(new ContentBasedDetector_2.ContentBasedDetector()); // Priority 3
    return registry;
}
//# sourceMappingURL=index.js.map