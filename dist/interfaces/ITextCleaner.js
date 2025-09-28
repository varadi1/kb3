"use strict";
/**
 * Text Cleaner Interface - SOLID Principles:
 * - Interface Segregation: Focused interface for text cleaning operations
 * - Single Responsibility: Only responsible for text cleaning
 * - Dependency Inversion: Abstracts text cleaning implementation details
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextFormat = void 0;
/**
 * Supported text formats
 */
var TextFormat;
(function (TextFormat) {
    TextFormat["HTML"] = "html";
    TextFormat["MARKDOWN"] = "markdown";
    TextFormat["PLAIN_TEXT"] = "plain_text";
    TextFormat["RICH_TEXT"] = "rich_text";
    TextFormat["XML"] = "xml";
    TextFormat["MIXED"] = "mixed";
})(TextFormat || (exports.TextFormat = TextFormat = {}));
//# sourceMappingURL=ITextCleaner.js.map