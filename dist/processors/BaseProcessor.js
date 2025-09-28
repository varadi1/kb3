"use strict";
/**
 * Base class for content processors
 * Template Method Pattern + Single Responsibility Principle
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProcessor = void 0;
class BaseProcessor {
    supportedTypes;
    maxTextLength;
    constructor(supportedTypes, maxTextLength = 1000000) {
        this.supportedTypes = supportedTypes;
        this.maxTextLength = maxTextLength;
    }
    getSupportedTypes() {
        return [...this.supportedTypes];
    }
    canProcess(contentType) {
        return this.supportedTypes.includes(contentType);
    }
    async process(content, contentType, options = {}) {
        if (!this.canProcess(contentType)) {
            throw new Error(`Cannot process content type: ${contentType}`);
        }
        const mergedOptions = this.mergeOptions(options);
        this.validateOptions(mergedOptions);
        try {
            return await this.performProcessing(content, contentType, mergedOptions);
        }
        catch (error) {
            throw new Error(`Processing failed for ${contentType}: ${error.message || error}`);
        }
    }
    mergeOptions(options) {
        return {
            extractImages: options.extractImages ?? false,
            extractLinks: options.extractLinks ?? true,
            extractMetadata: options.extractMetadata ?? true,
            maxTextLength: options.maxTextLength ?? this.maxTextLength,
            preserveFormatting: options.preserveFormatting ?? false,
            ...options
        };
    }
    validateOptions(options) {
        if (options.maxTextLength && options.maxTextLength <= 0) {
            throw new Error('maxTextLength must be positive');
        }
    }
    createProcessedContent(text, title, metadata = {}, images = [], links = [], tables = [], structure) {
        return {
            text: this.truncateText(text, this.maxTextLength),
            title,
            metadata: {
                ...metadata,
                processorClass: this.constructor.name,
                processedAt: new Date(),
                originalLength: text.length
            },
            images,
            links,
            tables,
            structure
        };
    }
    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        // Try to truncate at word boundary
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...';
        }
        return truncated + '...';
    }
    extractTitle(text) {
        // Try to extract title from common patterns
        const titlePatterns = [
            /^#\s+(.+)$/m, // Markdown H1
            /^(.+)\n=+\s*$/m, // Underlined title
            /^(.+)\n-+\s*$/m, // Underlined subtitle
            /^(.{1,100}?)(?:\n|$)/m // First line if short
        ];
        for (const pattern of titlePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const title = match[1].trim();
                if (title.length > 3 && title.length < 200) {
                    return title;
                }
            }
        }
        return undefined;
    }
    extractLinks(text) {
        const links = [];
        const urlPattern = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/g;
        const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        // Extract plain URLs
        let match;
        while ((match = urlPattern.exec(text)) !== null) {
            links.push({
                url: match[0],
                text: match[0]
            });
        }
        // Extract Markdown links
        while ((match = markdownLinkPattern.exec(text)) !== null) {
            links.push({
                url: match[2],
                text: match[1]
            });
        }
        // Remove duplicates
        const uniqueLinks = links.filter((link, index, array) => array.findIndex(l => l.url === link.url) === index);
        return uniqueLinks;
    }
    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\r/g, '\n') // Handle old Mac line endings
            .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks
            .replace(/\t/g, '    ') // Convert tabs to spaces
            .trim();
    }
    normalizeWhitespace(text) {
        return text
            .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
            .replace(/\n[ \t]+/g, '\n') // Remove leading whitespace on lines
            .replace(/[ \t]+\n/g, '\n') // Remove trailing whitespace on lines
            .trim();
    }
    extractStructure(text) {
        const headings = this.extractHeadings(text);
        const sections = this.extractSections(text, headings);
        if (headings.length === 0 && sections.length === 0) {
            return undefined;
        }
        return {
            headings,
            sections
        };
    }
    extractHeadings(text) {
        const headings = [];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Markdown headings
            const markdownMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (markdownMatch) {
                headings.push({
                    level: markdownMatch[1].length,
                    text: markdownMatch[2],
                    id: this.generateId(markdownMatch[2])
                });
                continue;
            }
            // Underlined headings
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                if (nextLine.match(/^=+$/) && line.length > 0) {
                    headings.push({
                        level: 1,
                        text: line,
                        id: this.generateId(line)
                    });
                    continue;
                }
                if (nextLine.match(/^-+$/) && line.length > 0) {
                    headings.push({
                        level: 2,
                        text: line,
                        id: this.generateId(line)
                    });
                    continue;
                }
            }
        }
        return headings;
    }
    extractSections(text, headings) {
        if (headings.length === 0) {
            return [];
        }
        const lines = text.split('\n');
        const sections = [];
        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            const nextHeading = headings[i + 1];
            // Find content between this heading and the next
            const startLine = this.findHeadingLine(lines, heading.text);
            const endLine = nextHeading
                ? this.findHeadingLine(lines, nextHeading.text)
                : lines.length;
            if (startLine !== -1) {
                const sectionContent = lines
                    .slice(startLine + 1, endLine)
                    .join('\n')
                    .trim();
                if (sectionContent.length > 0) {
                    sections.push({
                        title: heading.text,
                        content: sectionContent
                    });
                }
            }
        }
        return sections;
    }
    findHeadingLine(lines, headingText) {
        return lines.findIndex(line => line.includes(headingText) || line.trim() === headingText);
    }
    generateId(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }
    detectEncoding(buffer) {
        // Simple encoding detection
        const text = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
        // Check for BOM
        if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            return 'utf8-bom';
        }
        // Check for common non-UTF8 characters
        const nonUtf8Pattern = /[\uFFFD]/g;
        if (nonUtf8Pattern.test(text)) {
            return 'binary';
        }
        return 'utf8';
    }
    /**
     * Gets the maximum text length this processor will handle
     * @returns Maximum text length
     */
    getMaxTextLength() {
        return this.maxTextLength;
    }
}
exports.BaseProcessor = BaseProcessor;
//# sourceMappingURL=BaseProcessor.js.map