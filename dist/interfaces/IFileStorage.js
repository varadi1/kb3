"use strict";
/**
 * Interface Segregation Principle: Focused interface for file storage
 * Single Responsibility Principle: Only responsible for file operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortOrder = exports.FileSort = void 0;
var FileSort;
(function (FileSort) {
    FileSort["NAME"] = "name";
    FileSort["SIZE"] = "size";
    FileSort["CREATED_AT"] = "createdAt";
    FileSort["UPDATED_AT"] = "updatedAt";
})(FileSort || (exports.FileSort = FileSort = {}));
var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "asc";
    SortOrder["DESC"] = "desc";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
//# sourceMappingURL=IFileStorage.js.map