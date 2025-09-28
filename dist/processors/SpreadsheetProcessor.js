"use strict";
/**
 * Spreadsheet processor for Excel documents (XLSX, XLS)
 * Single Responsibility: Processes Microsoft Excel spreadsheets
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
exports.SpreadsheetProcessor = void 0;
const XLSX = __importStar(require("node-xlsx"));
const BaseProcessor_1 = require("./BaseProcessor");
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
class SpreadsheetProcessor extends BaseProcessor_1.BaseProcessor {
    constructor(maxTextLength = 1000000) {
        super([IUrlDetector_1.ContentType.XLSX], maxTextLength);
    }
    async performProcessing(content, _contentType, options) {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        try {
            const workbook = XLSX.parse(buffer);
            const processedData = this.processWorkbook(workbook);
            const text = this.generateTextFromWorkbook(processedData);
            const title = options.extractMetadata ? this.extractTitleFromWorkbook(processedData) : undefined;
            const links = options.extractLinks ? this.extractLinks(text) : [];
            const tables = processedData.tables;
            const structure = options.extractMetadata ? this.createWorkbookStructure(processedData) : undefined;
            const metadata = this.extractSpreadsheetMetadata(processedData, workbook, options);
            return this.createProcessedContent(text, title, metadata, [], // No images in basic spreadsheet processing
            links, tables, structure);
        }
        catch (error) {
            throw new Error(`Spreadsheet processing failed: ${error.message}`);
        }
    }
    processWorkbook(workbook) {
        const sheets = [];
        const tables = [];
        for (const sheet of workbook) {
            const processedSheet = this.processSheet(sheet);
            sheets.push(processedSheet);
            if (processedSheet.table) {
                tables.push({
                    ...processedSheet.table,
                    caption: `Sheet: ${sheet.name}`
                });
            }
        }
        return {
            sheets,
            tables,
            sheetNames: workbook.map(sheet => sheet.name)
        };
    }
    processSheet(sheet) {
        const data = sheet.data;
        if (!data || data.length === 0) {
            return {
                name: sheet.name,
                rowCount: 0,
                columnCount: 0,
                hasData: false,
                text: ''
            };
        }
        // Find the actual data bounds (excluding empty rows/columns)
        const bounds = this.findDataBounds(data);
        const trimmedData = this.trimData(data, bounds);
        // Convert to table if it has structure
        const table = this.createTableFromSheet(trimmedData, sheet.name);
        const text = this.generateTextFromSheet(trimmedData, sheet.name);
        return {
            name: sheet.name,
            rowCount: bounds.maxRow - bounds.minRow + 1,
            columnCount: bounds.maxCol - bounds.minCol + 1,
            hasData: trimmedData.length > 0,
            text,
            table,
            cellTypes: this.analyzeCellTypes(trimmedData)
        };
    }
    findDataBounds(data) {
        let minRow = -1, maxRow = -1, minCol = -1, maxCol = -1;
        for (let row = 0; row < data.length; row++) {
            const rowData = data[row];
            if (!rowData)
                continue;
            let hasData = false;
            for (let col = 0; col < rowData.length; col++) {
                const cell = rowData[col];
                if (cell !== null && cell !== undefined && cell !== '') {
                    hasData = true;
                    if (minCol === -1 || col < minCol)
                        minCol = col;
                    if (col > maxCol)
                        maxCol = col;
                }
            }
            if (hasData) {
                if (minRow === -1)
                    minRow = row;
                maxRow = row;
            }
        }
        return {
            minRow: minRow === -1 ? 0 : minRow,
            maxRow: maxRow === -1 ? 0 : maxRow,
            minCol: minCol === -1 ? 0 : minCol,
            maxCol: maxCol === -1 ? 0 : maxCol
        };
    }
    trimData(data, bounds) {
        const trimmed = [];
        for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
            const rowData = data[row] || [];
            const trimmedRow = [];
            for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                const cell = rowData[col];
                trimmedRow.push(cell === null || cell === undefined ? '' : String(cell));
            }
            trimmed.push(trimmedRow);
        }
        return trimmed;
    }
    createTableFromSheet(data, sheetName) {
        if (data.length === 0)
            return undefined;
        // Assume first row contains headers if it looks different from data rows
        const firstRow = data[0];
        const hasHeaders = this.looksLikeHeaders(data);
        if (hasHeaders && data.length > 1) {
            return {
                headers: firstRow.map(cell => String(cell || '')),
                rows: data.slice(1).map(row => row.map(cell => String(cell || ''))),
                caption: `Sheet: ${sheetName}`
            };
        }
        else {
            // No clear headers, treat first row as data
            const headers = firstRow.map((_, index) => `Column ${index + 1}`);
            return {
                headers,
                rows: data.map(row => row.map(cell => String(cell || ''))),
                caption: `Sheet: ${sheetName}`
            };
        }
    }
    looksLikeHeaders(data) {
        if (data.length < 2)
            return false;
        const firstRow = data[0];
        const secondRow = data[1];
        // Check if first row has text while second row has different data types
        let textInFirst = 0;
        let numbersInSecond = 0;
        for (let col = 0; col < Math.min(firstRow.length, secondRow.length); col++) {
            const firstCell = firstRow[col];
            const secondCell = secondRow[col];
            if (firstCell && typeof firstCell === 'string' && isNaN(Number(firstCell))) {
                textInFirst++;
            }
            if (secondCell && !isNaN(Number(secondCell))) {
                numbersInSecond++;
            }
        }
        // Heuristic: if first row has more text and second row has more numbers
        return textInFirst > firstRow.length * 0.5 && numbersInSecond > 0;
    }
    generateTextFromSheet(data, sheetName) {
        if (data.length === 0)
            return '';
        const lines = [`=== ${sheetName} ===`];
        for (const row of data) {
            const rowText = row
                .map(cell => String(cell || ''))
                .filter(cell => cell.length > 0)
                .join(' | ');
            if (rowText.length > 0) {
                lines.push(rowText);
            }
        }
        return lines.join('\n');
    }
    generateTextFromWorkbook(workbook) {
        const textParts = [];
        for (const sheet of workbook.sheets) {
            if (sheet.hasData) {
                textParts.push(sheet.text);
                textParts.push(''); // Add spacing between sheets
            }
        }
        return textParts.join('\n');
    }
    extractTitleFromWorkbook(workbook) {
        // Try to extract title from sheet names or first sheet data
        if (workbook.sheetNames.length === 1) {
            return workbook.sheetNames[0];
        }
        // Look for a sheet that might contain title information
        for (const sheet of workbook.sheets) {
            if (sheet.name.toLowerCase().includes('summary') ||
                sheet.name.toLowerCase().includes('overview') ||
                sheet.name.toLowerCase().includes('title')) {
                return sheet.name;
            }
        }
        return workbook.sheetNames.join(', ');
    }
    createWorkbookStructure(workbook) {
        const sections = workbook.sheets
            .filter(sheet => sheet.hasData)
            .map(sheet => ({
            title: sheet.name,
            content: sheet.text
        }));
        return {
            headings: workbook.sheetNames.map(name => ({
                level: 1,
                text: name,
                id: this.generateSheetId(name)
            })),
            sections
        };
    }
    analyzeCellTypes(data) {
        const analysis = {
            text: 0,
            number: 0,
            date: 0,
            boolean: 0,
            empty: 0,
            formula: 0
        };
        for (const row of data) {
            for (const cell of row) {
                if (cell === null || cell === undefined || cell === '') {
                    analysis.empty++;
                }
                else if (typeof cell === 'boolean') {
                    analysis.boolean++;
                }
                else if (typeof cell === 'number') {
                    analysis.number++;
                }
                else if (this.looksLikeDate(String(cell))) {
                    analysis.date++;
                }
                else if (String(cell).startsWith('=')) {
                    analysis.formula++;
                }
                else {
                    analysis.text++;
                }
            }
        }
        return analysis;
    }
    looksLikeDate(value) {
        const datePatterns = [
            /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY
            /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
            /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-DD-YYYY
        ];
        return datePatterns.some(pattern => pattern.test(value));
    }
    extractSpreadsheetMetadata(workbook, _rawWorkbook, _options) {
        const totalCells = workbook.sheets.reduce((sum, sheet) => sum + (sheet.rowCount * sheet.columnCount), 0);
        const metadata = {
            contentType: IUrlDetector_1.ContentType.XLSX,
            sheetCount: workbook.sheets.length,
            sheetNames: workbook.sheetNames,
            totalRows: workbook.sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0),
            totalCells,
            hasMultipleSheets: workbook.sheets.length > 1
        };
        // Aggregate cell type analysis
        const totalCellTypes = {
            text: 0, number: 0, date: 0, boolean: 0, empty: 0, formula: 0
        };
        for (const sheet of workbook.sheets) {
            if (sheet.cellTypes) {
                totalCellTypes.text += sheet.cellTypes.text;
                totalCellTypes.number += sheet.cellTypes.number;
                totalCellTypes.date += sheet.cellTypes.date;
                totalCellTypes.boolean += sheet.cellTypes.boolean;
                totalCellTypes.empty += sheet.cellTypes.empty;
                totalCellTypes.formula += sheet.cellTypes.formula;
            }
        }
        metadata.cellTypes = totalCellTypes;
        // Sheet-specific information
        metadata.sheets = workbook.sheets.map(sheet => ({
            name: sheet.name,
            rowCount: sheet.rowCount,
            columnCount: sheet.columnCount,
            hasData: sheet.hasData,
            cellTypes: sheet.cellTypes
        }));
        return metadata;
    }
    generateSheetId(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }
}
exports.SpreadsheetProcessor = SpreadsheetProcessor;
//# sourceMappingURL=SpreadsheetProcessor.js.map