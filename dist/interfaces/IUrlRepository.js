"use strict";
/**
 * Interface for URL tracking and duplicate detection
 * Single Responsibility: Only manages URL tracking and deduplication
 * Interface Segregation: Focused interface for URL management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlStatus = void 0;
var UrlStatus;
(function (UrlStatus) {
    UrlStatus["PENDING"] = "pending";
    UrlStatus["PROCESSING"] = "processing";
    UrlStatus["COMPLETED"] = "completed";
    UrlStatus["FAILED"] = "failed";
    UrlStatus["SKIPPED"] = "skipped";
})(UrlStatus || (exports.UrlStatus = UrlStatus = {}));
//# sourceMappingURL=IUrlRepository.js.map