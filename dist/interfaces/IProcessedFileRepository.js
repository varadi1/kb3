"use strict";
/**
 * Interface for managing processed/cleaned file records
 * Interface Segregation Principle: Separate interface for processed files
 * Single Responsibility: Only manages processed file metadata
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessedFileStatus = exports.ProcessingType = void 0;
/**
 * Types of processing that can be applied
 */
var ProcessingType;
(function (ProcessingType) {
    ProcessingType["CLEANED"] = "cleaned";
    ProcessingType["EXTRACTED"] = "extracted";
    ProcessingType["SUMMARIZED"] = "summarized";
    ProcessingType["TRANSLATED"] = "translated";
    ProcessingType["NORMALIZED"] = "normalized";
    ProcessingType["COMBINED"] = "combined"; // Multiple processing types
})(ProcessingType || (exports.ProcessingType = ProcessingType = {}));
/**
 * Status of processed files
 */
var ProcessedFileStatus;
(function (ProcessedFileStatus) {
    ProcessedFileStatus["ACTIVE"] = "active";
    ProcessedFileStatus["ARCHIVED"] = "archived";
    ProcessedFileStatus["DELETED"] = "deleted";
    ProcessedFileStatus["PROCESSING"] = "processing";
    ProcessedFileStatus["ERROR"] = "error";
})(ProcessedFileStatus || (exports.ProcessedFileStatus = ProcessedFileStatus = {}));
//# sourceMappingURL=IProcessedFileRepository.js.map