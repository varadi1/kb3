"use strict";
/**
 * Text content processor
 * Single Responsibility: Processes plain text and text-based formats
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextProcessor = void 0;
const BaseProcessor_1 = require("./BaseProcessor");
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
class TextProcessor extends BaseProcessor_1.BaseProcessor {
    constructor(maxTextLength = 1000000) {
        super([
            IUrlDetector_1.ContentType.TXT,
            IUrlDetector_1.ContentType.CSV,
            IUrlDetector_1.ContentType.JSON,
            IUrlDetector_1.ContentType.XML,
            IUrlDetector_1.ContentType.MARKDOWN
        ], maxTextLength);
    }
    async performProcessing(content, contentType, options) {
        const text = this.extractTextContent(content, contentType);
        const cleanedText = this.cleanText(text);
        const title = options.extractMetadata ? this.extractTitle(cleanedText) : undefined;
        const links = options.extractLinks ? this.extractLinks(cleanedText) : [];
        const tables = this.extractTables(cleanedText, contentType);
        const structure = options.extractMetadata ? this.extractStructure(cleanedText) : undefined;
        const metadata = this.extractMetadata(text, contentType, options);
        return this.createProcessedContent(cleanedText, title, metadata, [], // No images in text content
        links, tables, structure);
    }
    extractTextContent(content, contentType) {
        let text;
        if (Buffer.isBuffer(content)) {
            const encoding = this.detectEncoding(content);
            text = content.toString(encoding === 'binary' ? 'latin1' : 'utf8');
        }
        else {
            text = content;
        }
        // Handle specific content types
        switch (contentType) {
            case IUrlDetector_1.ContentType.JSON:
                return this.processJsonContent(text);
            case IUrlDetector_1.ContentType.XML:
                return this.processXmlContent(text);
            case IUrlDetector_1.ContentType.CSV:
                return this.processCsvContent(text);
            case IUrlDetector_1.ContentType.MARKDOWN:
                // Markdown is returned as-is since it's already readable text
                return text;
            default:
                return text;
        }
    }
    processJsonContent(text) {
        try {
            const jsonObject = JSON.parse(text);
            return this.formatJsonForReading(jsonObject);
        }
        catch (error) {
            // If parsing fails, return original text
            return text;
        }
    }
    formatJsonForReading(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        if (typeof obj === 'string') {
            return obj;
        }
        else if (typeof obj === 'number' || typeof obj === 'boolean') {
            return String(obj);
        }
        else if (obj === null) {
            return 'null';
        }
        else if (Array.isArray(obj)) {
            if (obj.length === 0)
                return '[]';
            const items = obj.map(item => `${spaces}- ${this.formatJsonForReading(item, indent + 1)}`);
            return items.join('\n');
        }
        else if (typeof obj === 'object') {
            const entries = Object.entries(obj);
            if (entries.length === 0)
                return '{}';
            const lines = entries.map(([key, value]) => {
                const formattedValue = this.formatJsonForReading(value, indent + 1);
                return `${spaces}${key}: ${formattedValue}`;
            });
            return lines.join('\n');
        }
        return String(obj);
    }
    processXmlContent(text) {
        // Simple XML to readable text conversion
        return text
            .replace(/<[^>]*>/g, '') // Remove XML tags
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n\s*\n/g, '\n') // Remove empty lines
            .trim();
    }
    processCsvContent(text) {
        // Convert CSV to readable text format
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0)
            return text;
        const rows = lines.map(line => this.parseCsvLine(line));
        const headers = rows[0];
        const dataRows = rows.slice(1);
        if (dataRows.length === 0)
            return headers.join(', ');
        // Format as readable text
        const formattedRows = dataRows.map(row => {
            return headers.map((header, index) => `${header}: ${row[index] || ''}`).join(', ');
        });
        return formattedRows.join('\n');
    }
    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    extractTables(text, contentType) {
        const tables = [];
        if (contentType === IUrlDetector_1.ContentType.CSV) {
            const csvTable = this.extractCsvTable(text);
            if (csvTable) {
                tables.push(csvTable);
            }
        }
        else {
            // Extract Markdown-style tables
            const markdownTables = this.extractMarkdownTables(text);
            tables.push(...markdownTables);
        }
        return tables;
    }
    extractCsvTable(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2)
            return null;
        const rows = lines.map(line => this.parseCsvLine(line));
        const headers = rows[0];
        const dataRows = rows.slice(1);
        return {
            headers,
            rows: dataRows
        };
    }
    extractMarkdownTables(text) {
        const tables = [];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            const nextLine = lines[i + 1].trim();
            // Check if this looks like a markdown table header
            if (line.includes('|') && nextLine.match(/^[\s\-|:]+$/)) {
                const table = this.parseMarkdownTable(lines, i);
                if (table) {
                    tables.push(table);
                }
            }
        }
        return tables;
    }
    parseMarkdownTable(lines, startIndex) {
        const headers = this.parseTableRow(lines[startIndex]);
        if (!headers || headers.length === 0)
            return null;
        const rows = [];
        // Skip the separator line
        for (let i = startIndex + 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.includes('|'))
                break;
            const row = this.parseTableRow(line);
            if (row && row.length > 0) {
                rows.push(row);
            }
            else {
                break;
            }
        }
        return {
            headers,
            rows
        };
    }
    parseTableRow(line) {
        if (!line.includes('|'))
            return null;
        const cells = line.split('|').map(cell => cell.trim());
        // Remove empty cells at start and end (common in markdown tables)
        if (cells[0] === '')
            cells.shift();
        if (cells[cells.length - 1] === '')
            cells.pop();
        return cells.length > 0 ? cells : null;
    }
    extractMetadata(text, contentType, _options) {
        const metadata = {
            contentType,
            characterCount: text.length,
            wordCount: this.countWords(text),
            lineCount: text.split('\n').length,
            encoding: this.detectTextEncoding(text)
        };
        if (contentType === IUrlDetector_1.ContentType.JSON) {
            try {
                const jsonObject = JSON.parse(text);
                metadata.jsonStructure = this.analyzeJsonStructure(jsonObject);
            }
            catch {
                metadata.jsonValid = false;
            }
        }
        if (contentType === IUrlDetector_1.ContentType.CSV) {
            const csvInfo = this.analyzeCsvStructure(text);
            metadata.csvInfo = csvInfo;
        }
        return metadata;
    }
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    detectTextEncoding(text) {
        // Simple heuristics for text encoding detection
        const hasExtendedAscii = /[\u0080-\u00FF]/.test(text);
        const hasUnicode = /[\u0100-\uFFFF]/.test(text);
        if (hasUnicode)
            return 'utf8-unicode';
        if (hasExtendedAscii)
            return 'utf8-extended';
        return 'ascii';
    }
    analyzeJsonStructure(obj) {
        if (Array.isArray(obj)) {
            return {
                type: 'array',
                length: obj.length,
                itemTypes: [...new Set(obj.map(item => typeof item))]
            };
        }
        else if (typeof obj === 'object' && obj !== null) {
            return {
                type: 'object',
                keys: Object.keys(obj),
                keyCount: Object.keys(obj).length
            };
        }
        else {
            return {
                type: typeof obj,
                value: obj
            };
        }
    }
    analyzeCsvStructure(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0)
            return null;
        const firstRow = this.parseCsvLine(lines[0]);
        const columnCount = firstRow.length;
        const rowCount = lines.length;
        return {
            columnCount,
            rowCount: rowCount - 1, // Excluding header
            hasHeader: rowCount > 1,
            columns: firstRow
        };
    }
}
exports.TextProcessor = TextProcessor;
//# sourceMappingURL=TextProcessor.js.map