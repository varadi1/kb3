"use strict";
/**
 * Document processor for Word documents (DOCX)
 * Single Responsibility: Processes Microsoft Word documents
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessor = void 0;
const mammoth = __importStar(require("mammoth"));
const BaseProcessor_1 = require("./BaseProcessor");
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
class DocumentProcessor extends BaseProcessor_1.BaseProcessor {
    constructor(maxTextLength = 1000000) {
        super([IUrlDetector_1.ContentType.DOCX], maxTextLength);
    }
    async performProcessing(content, _contentType, options) {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        try {
            const result = await mammoth.extractRawText(buffer);
            const text = this.cleanText(result.value);
            // Also extract with styles for better structure analysis
            const htmlResult = await mammoth.convertToHtml(buffer);
            const structuredData = this.processHtmlContent(htmlResult.value, options);
            const title = options.extractMetadata ? this.extractTitle(text) : undefined;
            const links = options.extractLinks ? this.extractLinks(text) : [];
            const tables = structuredData.tables;
            const structure = options.extractMetadata ? this.extractStructure(text) : undefined;
            const metadata = this.extractDocumentMetadata(result, htmlResult, options);
            return this.createProcessedContent(text, title, metadata, structuredData.images, links, tables, structure);
        }
        catch (error) {
            throw new Error(`Document processing failed: ${error.message}`);
        }
    }
    processHtmlContent(html, options) {
        // Use a simple HTML parser since mammoth generates clean HTML
        const images = options.extractImages ? this.extractImagesFromHtml(html) : [];
        const tables = this.extractTablesFromHtml(html);
        return {
            images,
            tables
        };
    }
    extractImagesFromHtml(html) {
        const images = [];
        const imgRegex = /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi;
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
            const src = match[1];
            const alt = match[2];
            images.push({
                src,
                alt,
                caption: alt
            });
        }
        return images;
    }
    extractTablesFromHtml(html) {
        const tables = [];
        // Simple table extraction from mammoth-generated HTML
        const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
        let tableMatch;
        while ((tableMatch = tableRegex.exec(html)) !== null) {
            const tableHtml = tableMatch[1];
            const table = this.parseTableFromHtml(tableHtml);
            if (table) {
                tables.push(table);
            }
        }
        return tables;
    }
    parseTableFromHtml(tableHtml) {
        const rows = [];
        const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
            const rowHtml = rowMatch[1];
            const cells = [];
            const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                const cellText = cellMatch[1]
                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
                    .trim();
                cells.push(cellText);
            }
            if (cells.length > 0) {
                rows.push(cells);
            }
        }
        if (rows.length === 0)
            return null;
        // Assume first row is headers
        const headers = rows[0];
        const dataRows = rows.slice(1);
        return {
            headers,
            rows: dataRows
        };
    }
    extractDocumentMetadata(textResult, htmlResult, _options) {
        const metadata = {
            contentType: IUrlDetector_1.ContentType.DOCX,
            characterCount: textResult.value.length,
            wordCount: this.countWords(textResult.value)
        };
        // Add conversion messages/warnings from mammoth
        if (textResult.messages && textResult.messages.length > 0) {
            metadata.conversionMessages = textResult.messages.map((msg) => ({
                type: msg.type,
                message: msg.message
            }));
        }
        if (htmlResult.messages && htmlResult.messages.length > 0) {
            metadata.htmlConversionMessages = htmlResult.messages.map((msg) => ({
                type: msg.type,
                message: msg.message
            }));
        }
        // Analyze document structure from HTML
        const structureInfo = this.analyzeDocumentStructure(htmlResult.value);
        metadata.structure = structureInfo;
        return metadata;
    }
    analyzeDocumentStructure(html) {
        return {
            hasHeadings: /<h[1-6][^>]*>/i.test(html),
            headingCount: (html.match(/<h[1-6][^>]*>/gi) || []).length,
            paragraphCount: (html.match(/<p[^>]*>/gi) || []).length,
            tableCount: (html.match(/<table[^>]*>/gi) || []).length,
            listCount: (html.match(/<[ou]l[^>]*>/gi) || []).length,
            imageCount: (html.match(/<img[^>]*>/gi) || []).length,
            hasFormatting: this.hasRichFormatting(html)
        };
    }
    hasRichFormatting(html) {
        const formattingTags = ['<strong>', '<em>', '<u>', '<b>', '<i>', '<sup>', '<sub>'];
        return formattingTags.some(tag => html.includes(tag));
    }
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
}
exports.DocumentProcessor = DocumentProcessor;
//# sourceMappingURL=DocumentProcessor.js.map