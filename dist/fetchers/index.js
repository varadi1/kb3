"use strict";
/**
 * Central export for all content fetchers
 * Facilitates easy import and dependency injection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetcherRegistry = exports.FileFetcher = exports.SmartHttpFetcher = exports.HttpFetcher = exports.BaseFetcher = void 0;
exports.createDefaultFetcherRegistry = createDefaultFetcherRegistry;
var BaseFetcher_1 = require("./BaseFetcher");
Object.defineProperty(exports, "BaseFetcher", { enumerable: true, get: function () { return BaseFetcher_1.BaseFetcher; } });
var HttpFetcher_1 = require("./HttpFetcher");
Object.defineProperty(exports, "HttpFetcher", { enumerable: true, get: function () { return HttpFetcher_1.HttpFetcher; } });
var SmartHttpFetcher_1 = require("./SmartHttpFetcher");
Object.defineProperty(exports, "SmartHttpFetcher", { enumerable: true, get: function () { return SmartHttpFetcher_1.SmartHttpFetcher; } });
var FileFetcher_1 = require("./FileFetcher");
Object.defineProperty(exports, "FileFetcher", { enumerable: true, get: function () { return FileFetcher_1.FileFetcher; } });
var FetcherRegistry_1 = require("./FetcherRegistry");
Object.defineProperty(exports, "FetcherRegistry", { enumerable: true, get: function () { return FetcherRegistry_1.FetcherRegistry; } });
// Import required classes for the factory function
const FetcherRegistry_2 = require("./FetcherRegistry");
const SmartHttpFetcher_2 = require("./SmartHttpFetcher");
const FileFetcher_2 = require("./FileFetcher");
// Factory function for creating default fetcher registry
function createDefaultFetcherRegistry() {
    const registry = new FetcherRegistry_2.FetcherRegistry();
    // Add standard fetchers
    // Use SmartHttpFetcher instead of HttpFetcher to handle JavaScript redirects
    registry.addFetcher(new SmartHttpFetcher_2.SmartHttpFetcher());
    registry.addFetcher(new FileFetcher_2.FileFetcher());
    return registry;
}
//# sourceMappingURL=index.js.map