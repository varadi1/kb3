"use strict";
/**
 * Interface Segregation Principle: Small, focused interface for URL detection
 * Single Responsibility Principle: Only responsible for URL classification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentType = void 0;
var ContentType;
(function (ContentType) {
    ContentType["PDF"] = "pdf";
    ContentType["HTML"] = "html";
    ContentType["WEBPAGE"] = "webpage";
    ContentType["MARKDOWN"] = "markdown";
    ContentType["DOC"] = "doc";
    ContentType["DOCX"] = "docx";
    ContentType["RTF"] = "rtf";
    ContentType["XLSX"] = "xlsx";
    ContentType["CSV"] = "csv";
    ContentType["TXT"] = "txt";
    ContentType["TEXT"] = "text";
    ContentType["JSON"] = "json";
    ContentType["XML"] = "xml";
    ContentType["IMAGE"] = "image";
    ContentType["VIDEO"] = "video";
    ContentType["AUDIO"] = "audio";
    ContentType["ARCHIVE"] = "archive";
    ContentType["UNKNOWN"] = "unknown";
})(ContentType || (exports.ContentType = ContentType = {}));
//# sourceMappingURL=IUrlDetector.js.map