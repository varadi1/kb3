"use strict";
/**
 * Interface Segregation Principle: Focused interface for tracking original files
 * Single Responsibility: Only manages original file metadata and references
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStatus = void 0;
var FileStatus;
(function (FileStatus) {
    FileStatus["ACTIVE"] = "active";
    FileStatus["ARCHIVED"] = "archived";
    FileStatus["DELETED"] = "deleted";
    FileStatus["PROCESSING"] = "processing";
    FileStatus["ERROR"] = "error";
})(FileStatus || (exports.FileStatus = FileStatus = {}));
//# sourceMappingURL=IOriginalFileRepository.js.map