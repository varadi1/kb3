"use strict";
/**
 * Interface Segregation Principle: Focused interface for orchestration
 * Single Responsibility Principle: Only responsible for coordinating the processing pipeline
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.ProcessingStage = void 0;
var ProcessingStage;
(function (ProcessingStage) {
    ProcessingStage["DETECTING"] = "detecting";
    ProcessingStage["FETCHING"] = "fetching";
    ProcessingStage["PROCESSING"] = "processing";
    ProcessingStage["STORING"] = "storing";
    ProcessingStage["INDEXING"] = "indexing";
})(ProcessingStage || (exports.ProcessingStage = ProcessingStage = {}));
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["INVALID_URL"] = "INVALID_URL";
    ErrorCode["UNSUPPORTED_TYPE"] = "UNSUPPORTED_TYPE";
    ErrorCode["FETCH_FAILED"] = "FETCH_FAILED";
    ErrorCode["PROCESSING_FAILED"] = "PROCESSING_FAILED";
    ErrorCode["STORAGE_FAILED"] = "STORAGE_FAILED";
    ErrorCode["TIMEOUT"] = "TIMEOUT";
    ErrorCode["ACCESS_DENIED"] = "ACCESS_DENIED";
    ErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
    ErrorCode["DUPLICATE_URL"] = "DUPLICATE_URL";
    ErrorCode["DUPLICATE_CONTENT"] = "DUPLICATE_CONTENT";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
//# sourceMappingURL=IOrchestrator.js.map