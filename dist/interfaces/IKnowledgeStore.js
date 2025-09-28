"use strict";
/**
 * Interface Segregation Principle: Focused interface for knowledge storage
 * Single Responsibility Principle: Only responsible for metadata management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortOrder = exports.SortField = exports.ProcessingStatus = void 0;
var ProcessingStatus;
(function (ProcessingStatus) {
    ProcessingStatus["PENDING"] = "pending";
    ProcessingStatus["PROCESSING"] = "processing";
    ProcessingStatus["COMPLETED"] = "completed";
    ProcessingStatus["FAILED"] = "failed";
})(ProcessingStatus || (exports.ProcessingStatus = ProcessingStatus = {}));
var SortField;
(function (SortField) {
    SortField["CREATED_AT"] = "createdAt";
    SortField["UPDATED_AT"] = "updatedAt";
    SortField["TITLE"] = "title";
    SortField["SIZE"] = "size";
    SortField["RELEVANCE"] = "relevance";
})(SortField || (exports.SortField = SortField = {}));
var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "asc";
    SortOrder["DESC"] = "desc";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
//# sourceMappingURL=IKnowledgeStore.js.map