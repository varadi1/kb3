"use strict";
/**
 * Central export for all content processors
 * Facilitates easy import and dependency injection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessorRegistry = exports.RtfProcessor = exports.SpreadsheetProcessor = exports.DocumentProcessor = exports.DocProcessor = exports.PdfProcessor = exports.HtmlProcessor = exports.TextProcessor = exports.BaseProcessor = void 0;
exports.createDefaultProcessorRegistry = createDefaultProcessorRegistry;
var BaseProcessor_1 = require("./BaseProcessor");
Object.defineProperty(exports, "BaseProcessor", { enumerable: true, get: function () { return BaseProcessor_1.BaseProcessor; } });
var TextProcessor_1 = require("./TextProcessor");
Object.defineProperty(exports, "TextProcessor", { enumerable: true, get: function () { return TextProcessor_1.TextProcessor; } });
var HtmlProcessor_1 = require("./HtmlProcessor");
Object.defineProperty(exports, "HtmlProcessor", { enumerable: true, get: function () { return HtmlProcessor_1.HtmlProcessor; } });
var PdfProcessor_1 = require("./PdfProcessor");
Object.defineProperty(exports, "PdfProcessor", { enumerable: true, get: function () { return PdfProcessor_1.PdfProcessor; } });
var DocProcessor_1 = require("./DocProcessor");
Object.defineProperty(exports, "DocProcessor", { enumerable: true, get: function () { return DocProcessor_1.DocProcessor; } });
var DocumentProcessor_1 = require("./DocumentProcessor");
Object.defineProperty(exports, "DocumentProcessor", { enumerable: true, get: function () { return DocumentProcessor_1.DocumentProcessor; } });
var SpreadsheetProcessor_1 = require("./SpreadsheetProcessor");
Object.defineProperty(exports, "SpreadsheetProcessor", { enumerable: true, get: function () { return SpreadsheetProcessor_1.SpreadsheetProcessor; } });
var RtfProcessor_1 = require("./RtfProcessor");
Object.defineProperty(exports, "RtfProcessor", { enumerable: true, get: function () { return RtfProcessor_1.RtfProcessor; } });
var ProcessorRegistry_1 = require("./ProcessorRegistry");
Object.defineProperty(exports, "ProcessorRegistry", { enumerable: true, get: function () { return ProcessorRegistry_1.ProcessorRegistry; } });
// Import required classes for the factory function
const ProcessorRegistry_2 = require("./ProcessorRegistry");
const TextProcessor_2 = require("./TextProcessor");
const HtmlProcessor_2 = require("./HtmlProcessor");
const PdfProcessor_2 = require("./PdfProcessor");
const DocProcessor_2 = require("./DocProcessor");
const DocumentProcessor_2 = require("./DocumentProcessor");
const SpreadsheetProcessor_2 = require("./SpreadsheetProcessor");
const RtfProcessor_2 = require("./RtfProcessor");
// Factory function for creating default processor registry
function createDefaultProcessorRegistry() {
    const registry = new ProcessorRegistry_2.ProcessorRegistry();
    // Add all standard processors
    registry.addProcessor(new TextProcessor_2.TextProcessor());
    registry.addProcessor(new HtmlProcessor_2.HtmlProcessor());
    registry.addProcessor(new PdfProcessor_2.PdfProcessor());
    registry.addProcessor(new DocProcessor_2.DocProcessor());
    registry.addProcessor(new DocumentProcessor_2.DocumentProcessor());
    registry.addProcessor(new SpreadsheetProcessor_2.SpreadsheetProcessor());
    registry.addProcessor(new RtfProcessor_2.RtfProcessor());
    // Set text processor as fallback for unknown types
    registry.setFallbackProcessor(new TextProcessor_2.TextProcessor());
    return registry;
}
//# sourceMappingURL=index.js.map