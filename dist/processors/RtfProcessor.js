"use strict";
/**
 * RTF (Rich Text Format) processor
 * Single Responsibility: Processes RTF documents
 * Open/Closed: Extends BaseProcessor
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtfProcessor = void 0;
const BaseProcessor_1 = require("./BaseProcessor");
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
class RtfProcessor extends BaseProcessor_1.BaseProcessor {
    constructor() {
        super([IUrlDetector_1.ContentType.RTF]);
    }
    async performProcessing(content, _contentType, _options) {
        const rtfContent = Buffer.isBuffer(content) ? content.toString('utf8') : content;
        // Basic RTF parsing - extract plain text
        const extractedText = this.extractPlainTextFromRtf(rtfContent);
        const metadata = this.extractRtfMetadata(rtfContent);
        return {
            text: extractedText,
            title: metadata.title || 'RTF Document',
            metadata: {
                ...metadata,
                format: 'rtf',
                hasFormatting: true,
                wordCount: this.countWords(extractedText),
                characterCount: extractedText.length
            }
        };
    }
    /**
     * Extracts plain text from RTF content
     * RTF format uses control words starting with backslash
     */
    extractPlainTextFromRtf(rtfContent) {
        // Remove RTF header and footer
        let text = rtfContent.replace(/^{\\rtf[^}]*}/, '').replace(/}$/, '');
        // Remove RTF control words (starting with backslash)
        text = text.replace(/\\[a-z]+[0-9-]*\s?/gi, '');
        // Handle special RTF characters
        text = text.replace(/\\'([0-9a-f]{2})/gi, (_match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
        // Remove remaining braces
        text = text.replace(/[{}]/g, '');
        // Handle line breaks
        text = text.replace(/\\par\s*/g, '\n');
        text = text.replace(/\\line\s*/g, '\n');
        // Clean up multiple spaces and newlines
        text = text.replace(/\s+/g, ' ');
        text = text.replace(/\n\s*\n/g, '\n\n');
        return text.trim();
    }
    /**
     * Extracts metadata from RTF content
     */
    extractRtfMetadata(rtfContent) {
        const metadata = {};
        // Extract title from info group if present
        const titleMatch = rtfContent.match(/\\title\s*{([^}]*)}/);
        if (titleMatch) {
            metadata.title = this.cleanRtfString(titleMatch[1]);
        }
        // Extract author
        const authorMatch = rtfContent.match(/\\author\s*{([^}]*)}/);
        if (authorMatch) {
            metadata.author = this.cleanRtfString(authorMatch[1]);
        }
        // Extract creation date
        const createdMatch = rtfContent.match(/\\creatim\\yr(\d+)\\mo(\d+)\\dy(\d+)/);
        if (createdMatch) {
            metadata.createdDate = new Date(parseInt(createdMatch[1]), parseInt(createdMatch[2]) - 1, parseInt(createdMatch[3]));
        }
        // Extract revision date
        const revisedMatch = rtfContent.match(/\\revtim\\yr(\d+)\\mo(\d+)\\dy(\d+)/);
        if (revisedMatch) {
            metadata.revisedDate = new Date(parseInt(revisedMatch[1]), parseInt(revisedMatch[2]) - 1, parseInt(revisedMatch[3]));
        }
        // Check for embedded objects
        metadata.hasEmbeddedObjects = rtfContent.includes('\\object');
        metadata.hasImages = rtfContent.includes('\\pict');
        metadata.hasTables = rtfContent.includes('\\trowd');
        // Detect character set
        const charsetMatch = rtfContent.match(/\\ansicpg(\d+)/);
        if (charsetMatch) {
            metadata.codepage = charsetMatch[1];
        }
        return metadata;
    }
    /**
     * Cleans RTF control words from a string
     */
    cleanRtfString(str) {
        return str
            .replace(/\\[a-z]+[0-9-]*\s?/gi, '')
            .replace(/[{}]/g, '')
            .trim();
    }
    /**
     * Counts words in text
     */
    countWords(text) {
        const words = text.trim().split(/\s+/);
        return words.filter(word => word.length > 0).length;
    }
}
exports.RtfProcessor = RtfProcessor;
//# sourceMappingURL=RtfProcessor.js.map