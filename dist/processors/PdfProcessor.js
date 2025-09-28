"use strict";
/**
 * PDF content processor
 * Single Responsibility: Processes PDF documents and extracts text content
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfProcessor = void 0;
const pdfParse = require('pdf-parse');
const BaseProcessor_1 = require("./BaseProcessor");
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
class PdfProcessor extends BaseProcessor_1.BaseProcessor {
    constructor(maxTextLength = 1000000) {
        super([IUrlDetector_1.ContentType.PDF], maxTextLength);
    }
    async performProcessing(content, _contentType, options) {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        try {
            const pdfData = await pdfParse(buffer);
            const text = this.cleanText(pdfData.text);
            const title = this.extractTitleFromPdf(pdfData) || (options.extractMetadata ? this.extractTitle(text) : undefined);
            const links = options.extractLinks ? this.extractLinks(text) : [];
            const tables = this.extractTablesFromPdfText(text);
            const structure = options.extractMetadata ? this.extractStructure(text) : undefined;
            const metadata = this.extractPdfMetadata(pdfData, options);
            return this.createProcessedContent(text, title, metadata, [], // PDF image extraction would require additional libraries
            links, tables, structure);
        }
        catch (error) {
            throw new Error(`PDF processing failed: ${error.message}`);
        }
    }
    extractTitleFromPdf(pdfData) {
        // Try to extract title from PDF metadata
        if (pdfData.info && pdfData.info.Title) {
            const title = pdfData.info.Title.trim();
            if (title && title.length > 0 && title.length < 200) {
                return title;
            }
        }
        return undefined;
    }
    extractTablesFromPdfText(text) {
        const tables = [];
        const lines = text.split('\n');
        // Look for table-like structures in PDF text
        // PDFs often have tabular data that becomes space-separated when extracted
        for (let i = 0; i < lines.length - 2; i++) {
            const potentialTable = this.detectTableInLines(lines.slice(i, i + 20));
            if (potentialTable) {
                tables.push(potentialTable);
                i += potentialTable.rows.length + 1; // Skip processed lines
            }
        }
        return tables;
    }
    detectTableInLines(lines) {
        if (lines.length < 3)
            return null;
        // Look for lines with similar column structures
        const columnPatterns = [];
        for (const line of lines.slice(0, 5)) { // Check first 5 lines
            if (line.trim().length === 0)
                continue;
            const pattern = this.analyzeColumnStructure(line);
            if (pattern.length > 1) { // Must have at least 2 columns
                columnPatterns.push(pattern);
            }
        }
        if (columnPatterns.length < 2)
            return null;
        // Check if patterns are similar (indicating table structure)
        const firstPattern = columnPatterns[0];
        const similarPatterns = columnPatterns.filter(pattern => this.arePatternsSimilar(firstPattern, pattern));
        if (similarPatterns.length < 2)
            return null;
        // Extract table data
        const headers = this.extractColumnsFromLine(lines[0], firstPattern);
        const rows = [];
        for (let i = 1; i < Math.min(lines.length, 20); i++) {
            const line = lines[i];
            if (line.trim().length === 0)
                break;
            const pattern = this.analyzeColumnStructure(line);
            if (this.arePatternsSimilar(firstPattern, pattern)) {
                const columns = this.extractColumnsFromLine(line, pattern);
                if (columns.length === headers.length) {
                    rows.push(columns);
                }
            }
            else {
                break; // End of table
            }
        }
        if (rows.length === 0)
            return null;
        return {
            headers,
            rows
        };
    }
    analyzeColumnStructure(line) {
        // Find positions where text starts after whitespace (potential column starts)
        const positions = [];
        let inWhitespace = true;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const isWhitespace = char === ' ' || char === '\t';
            if (inWhitespace && !isWhitespace) {
                positions.push(i);
            }
            inWhitespace = isWhitespace;
        }
        return positions;
    }
    arePatternsSimilar(pattern1, pattern2) {
        if (Math.abs(pattern1.length - pattern2.length) > 1)
            return false;
        const minLength = Math.min(pattern1.length, pattern2.length);
        let matches = 0;
        for (let i = 0; i < minLength; i++) {
            // Allow small variance in column positions
            if (Math.abs(pattern1[i] - pattern2[i]) <= 3) {
                matches++;
            }
        }
        return matches / minLength >= 0.7; // 70% similarity threshold
    }
    extractColumnsFromLine(line, positions) {
        const columns = [];
        for (let i = 0; i < positions.length; i++) {
            const start = positions[i];
            const end = i + 1 < positions.length ? positions[i + 1] : line.length;
            const column = line.substring(start, end).trim();
            columns.push(column);
        }
        return columns.filter(col => col.length > 0);
    }
    extractPdfMetadata(pdfData, _options) {
        const metadata = {
            contentType: IUrlDetector_1.ContentType.PDF,
            pageCount: pdfData.numpages,
            characterCount: pdfData.text.length,
            wordCount: this.countWords(pdfData.text)
        };
        // Extract PDF info if available
        if (pdfData.info) {
            const pdfInfo = {};
            // Standard PDF metadata fields
            const standardFields = [
                'Title', 'Author', 'Subject', 'Creator', 'Producer',
                'CreationDate', 'ModDate', 'Keywords'
            ];
            for (const field of standardFields) {
                if (pdfData.info[field]) {
                    pdfInfo[field.toLowerCase()] = pdfData.info[field];
                }
            }
            if (Object.keys(pdfInfo).length > 0) {
                metadata.pdfInfo = pdfInfo;
            }
        }
        // Analyze document structure
        const text = pdfData.text;
        metadata.structure = {
            estimatedParagraphs: text.split('\n\n').length,
            estimatedSentences: (text.match(/[.!?]+/g) || []).length,
            hasTableStructures: this.detectTablePresence(text),
            averageLineLength: this.calculateAverageLineLength(text)
        };
        return metadata;
    }
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    detectTablePresence(text) {
        const lines = text.split('\n');
        let tableIndicators = 0;
        for (const line of lines) {
            // Look for common table indicators
            if (line.includes('\t') ||
                (line.match(/\s{2,}/g) || []).length >= 2 || // Multiple spaces (columns)
                line.match(/^\s*\d+[\s.]+/) || // Numbered lists
                line.match(/[|\u2502\u2503]/) // Table border characters
            ) {
                tableIndicators++;
            }
        }
        return tableIndicators / lines.length > 0.1; // More than 10% of lines suggest tables
    }
    calculateAverageLineLength(text) {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length === 0)
            return 0;
        const totalLength = lines.reduce((sum, line) => sum + line.length, 0);
        return Math.round(totalLength / lines.length);
    }
}
exports.PdfProcessor = PdfProcessor;
//# sourceMappingURL=PdfProcessor.js.map