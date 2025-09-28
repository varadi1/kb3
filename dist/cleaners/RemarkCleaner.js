"use strict";
/**
 * Remark Markdown Cleaner Implementation
 * Single Responsibility: Markdown processing and transformation using Remark
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
exports.RemarkCleaner = void 0;
const BaseTextCleaner_1 = require("./BaseTextCleaner");
const ITextCleaner_1 = require("../interfaces/ITextCleaner");
class RemarkCleaner extends BaseTextCleaner_1.BaseTextCleaner {
    constructor() {
        super('remark', 'Process and transform Markdown documents', [ITextCleaner_1.TextFormat.MARKDOWN, ITextCleaner_1.TextFormat.PLAIN_TEXT], {
            enabled: true,
            priority: 60,
            options: {
                parseOptions: {
                    gfm: true,
                    footnotes: true,
                    frontmatter: false,
                    commonmark: false,
                    pedantic: false
                },
                stringifyOptions: {
                    bullet: '-',
                    bulletOrdered: '.',
                    closeAtx: false,
                    emphasis: '*',
                    fence: '`',
                    fences: true,
                    incrementListMarker: true,
                    listItemIndent: 'one',
                    quote: '"',
                    resourceLink: true,
                    rule: '-',
                    ruleRepetition: 3,
                    ruleSpaces: false,
                    setext: false,
                    strong: '*',
                    tightDefinitions: false
                },
                transformations: {
                    normalizeHeadings: true,
                    removeFrontmatter: false,
                    removeCodeBlocks: false,
                    removeImages: false,
                    removeLinks: false,
                    removeEmphasis: false,
                    removeBlockquotes: false,
                    removeTables: false,
                    removeFootnotes: false,
                    removeHtmlComments: true,
                    extractText: false,
                    convertToHtml: false,
                    minifyMarkdown: false,
                    expandLinks: false,
                    normalizeLineBreaks: true,
                    fixBrokenLinks: false,
                    removeEmptyParagraphs: true,
                    normalizeLists: true,
                    maxHeadingLevel: 6
                },
                customPlugins: []
            }
        });
    }
    async performCleaning(input, config) {
        const options = config.options;
        try {
            // Dynamically import the ESM modules
            const { unified } = await Promise.resolve().then(() => __importStar(require('unified')));
            const remarkParse = (await Promise.resolve().then(() => __importStar(require('remark-parse')))).default;
            const remarkStringify = (await Promise.resolve().then(() => __importStar(require('remark-stringify')))).default;
            const remarkHtml = (await Promise.resolve().then(() => __importStar(require('remark-html')))).default;
            // Create processor with parse options
            let processor = unified().use(remarkParse, options.parseOptions);
            // Add custom plugins if provided
            if (options.customPlugins && options.customPlugins.length > 0) {
                for (const plugin of options.customPlugins) {
                    processor = processor.use(plugin);
                }
            }
            // Apply transformations
            processor = await this.applyTransformations(processor, options.transformations || {});
            // Configure output format and process
            let result;
            if (options.transformations?.extractText) {
                // For plain text extraction, we only need the AST, not processed output
                const tree = processor.parse(input);
                const processedTree = await processor.run(tree);
                result = this.extractPlainText(processedTree);
            }
            else {
                // For other formats, add appropriate compiler
                if (options.transformations?.convertToHtml) {
                    processor = processor.use(remarkHtml);
                }
                else {
                    processor = processor.use(remarkStringify, options.stringifyOptions);
                }
                // Process the markdown
                const file = await processor.process(input);
                result = String(file);
            }
            if (options.transformations?.minifyMarkdown) {
                result = this.minifyMarkdown(result);
            }
            if (options.transformations?.normalizeLineBreaks) {
                result = this.normalizeLineBreaks(result);
            }
            return result;
        }
        catch (error) {
            console.error(`Remark cleaning failed: ${error}`);
            throw new Error(`Markdown processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async applyTransformations(processor, transformations) {
        // Apply transformation plugins based on options
        if (transformations.normalizeHeadings) {
            processor = processor.use(() => (tree) => {
                this.visitNode(tree, 'heading', (node) => {
                    if (transformations.maxHeadingLevel && node.depth > transformations.maxHeadingLevel) {
                        node.depth = transformations.maxHeadingLevel;
                    }
                });
            });
        }
        if (transformations.removeFrontmatter) {
            processor = processor.use(() => (tree) => {
                this.removeNodes(tree, 'yaml');
                this.removeNodes(tree, 'toml');
            });
        }
        if (transformations.removeCodeBlocks) {
            processor = processor.use(() => (tree) => {
                this.removeNodes(tree, 'code');
                this.removeNodes(tree, 'inlineCode');
            });
        }
        if (transformations.removeImages) {
            processor = processor.use(() => (tree) => {
                this.removeNodes(tree, 'image');
                this.removeNodes(tree, 'imageReference');
            });
        }
        if (transformations.removeLinks) {
            processor = processor.use(() => (tree) => {
                this.visitNode(tree, 'link', (node, index, parent) => {
                    // Replace link with its text content
                    if (node.children && parent) {
                        parent.children.splice(index, 1, ...node.children);
                    }
                });
                this.removeNodes(tree, 'linkReference');
                this.removeNodes(tree, 'definition');
            });
        }
        if (transformations.removeEmphasis) {
            processor = processor.use(() => (tree) => {
                this.visitNode(tree, 'emphasis', (node, index, parent) => {
                    if (node.children && parent) {
                        parent.children.splice(index, 1, ...node.children);
                    }
                });
                this.visitNode(tree, 'strong', (node, index, parent) => {
                    if (node.children && parent) {
                        parent.children.splice(index, 1, ...node.children);
                    }
                });
            });
        }
        if (transformations.removeBlockquotes) {
            processor = processor.use(() => (tree) => {
                this.removeNodes(tree, 'blockquote');
            });
        }
        if (transformations.removeTables) {
            processor = processor.use(() => (tree) => {
                this.removeNodes(tree, 'table');
            });
        }
        if (transformations.removeFootnotes) {
            processor = processor.use(() => (tree) => {
                this.removeNodes(tree, 'footnote');
                this.removeNodes(tree, 'footnoteReference');
                this.removeNodes(tree, 'footnoteDefinition');
            });
        }
        if (transformations.removeHtmlComments) {
            processor = processor.use(() => (tree) => {
                this.removeNodes(tree, 'html', (node) => {
                    return node.value && node.value.trim().startsWith('<!--');
                });
            });
        }
        if (transformations.removeEmptyParagraphs) {
            processor = processor.use(() => (tree) => {
                this.removeNodes(tree, 'paragraph', (node) => {
                    return !node.children || node.children.length === 0 ||
                        (node.children.length === 1 && node.children[0].type === 'text' &&
                            !node.children[0].value.trim());
                });
            });
        }
        if (transformations.expandLinks) {
            processor = processor.use(() => (tree) => {
                const definitions = new Map();
                // Collect all definitions
                this.visitNode(tree, 'definition', (node) => {
                    definitions.set(node.identifier, node);
                });
                // Replace references with inline links
                this.visitNode(tree, 'linkReference', (node, index, parent) => {
                    const def = definitions.get(node.identifier);
                    if (def && parent) {
                        const link = {
                            type: 'link',
                            url: def.url,
                            title: def.title,
                            children: node.children
                        };
                        parent.children[index] = link;
                    }
                });
                // Remove definitions
                this.removeNodes(tree, 'definition');
            });
        }
        if (transformations.normalizeLists) {
            processor = processor.use(() => (tree) => {
                this.visitNode(tree, 'list', (node) => {
                    // Ensure consistent list item structure
                    if (node.children) {
                        node.spread = false; // Make lists tight
                    }
                });
            });
        }
        return processor;
    }
    visitNode(tree, type, visitor) {
        const visit = (node, index = 0, parent = null) => {
            if (node.type === type) {
                visitor(node, index, parent);
            }
            if (node.children) {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    visit(node.children[i], i, node);
                }
            }
        };
        visit(tree);
    }
    removeNodes(tree, type, condition) {
        this.visitNode(tree, type, (node, index, parent) => {
            if (parent && (!condition || condition(node))) {
                parent.children.splice(index, 1);
            }
        });
    }
    extractPlainText(ast) {
        const extractText = (node) => {
            if (node.type === 'text') {
                return node.value;
            }
            if (node.children) {
                return node.children.map(extractText).join(' ');
            }
            return '';
        };
        if (typeof ast === 'string') {
            // If it's already a string (from stringify), parse it first
            return ast.replace(/[#*`~\[\]()!]/g, '').replace(/\s+/g, ' ').trim();
        }
        return extractText(ast);
    }
    minifyMarkdown(markdown) {
        return markdown
            .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
            .replace(/^\s+/gm, '') // Remove leading whitespace
            .replace(/\s+$/gm, '') // Remove trailing whitespace
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }
    normalizeLineBreaks(text) {
        return text
            .replace(/\r\n/g, '\n') // Windows to Unix
            .replace(/\r/g, '\n') // Mac to Unix
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
            .trim();
    }
    calculateStatistics(original, cleaned) {
        // Count Markdown elements
        const countElements = (text) => ({
            headings: (text.match(/^#{1,6}\s/gm) || []).length,
            codeBlocks: (text.match(/```[\s\S]*?```/g) || []).length,
            inlineCode: (text.match(/`[^`]+`/g) || []).length,
            links: (text.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length,
            images: (text.match(/!\[([^\]]*)\]\([^)]+\)/g) || []).length,
            emphasis: (text.match(/(\*|_)[^*_]+(\*|_)/g) || []).length,
            strong: (text.match(/(\*\*|__)[^*_]+(\*\*|__)/g) || []).length,
            lists: (text.match(/^[\s]*[-*+]\s/gm) || []).length,
            blockquotes: (text.match(/^>/gm) || []).length,
            tables: (text.match(/\|.*\|/g) || []).length
        });
        const originalElements = countElements(original);
        const cleanedElements = countElements(cleaned);
        return {
            custom: {
                headingsRemoved: originalElements.headings - cleanedElements.headings,
                codeBlocksRemoved: originalElements.codeBlocks - cleanedElements.codeBlocks,
                inlineCodeRemoved: originalElements.inlineCode - cleanedElements.inlineCode,
                linksRemoved: originalElements.links - cleanedElements.links,
                imagesRemoved: originalElements.images - cleanedElements.images,
                emphasisRemoved: originalElements.emphasis - cleanedElements.emphasis,
                strongRemoved: originalElements.strong - cleanedElements.strong,
                listsModified: originalElements.lists - cleanedElements.lists,
                blockquotesRemoved: originalElements.blockquotes - cleanedElements.blockquotes,
                tablesRemoved: originalElements.tables - cleanedElements.tables,
                totalElementsOriginal: Object.values(originalElements).reduce((a, b) => a + b, 0),
                totalElementsCleaned: Object.values(cleanedElements).reduce((a, b) => a + b, 0),
                markdownComplexity: (originalElements.headings * 2 +
                    originalElements.codeBlocks * 3 +
                    originalElements.tables * 4)
            }
        };
    }
    generateWarnings(original, cleaned) {
        const warnings = [];
        const options = this.config.options;
        if (cleaned.length === 0) {
            warnings.push('Result is empty after processing');
        }
        if (options.transformations?.removeCodeBlocks && original.includes('```')) {
            warnings.push('Code blocks were removed from the document');
        }
        if (options.transformations?.removeLinks) {
            const linkCount = (original.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;
            if (linkCount > 0) {
                warnings.push(`${linkCount} links were removed or converted to text`);
            }
        }
        if (options.transformations?.maxHeadingLevel) {
            const deepHeadings = (original.match(/^#{7,}\s/gm) || []).length;
            if (deepHeadings > 0) {
                warnings.push(`Heading levels were limited to ${options.transformations.maxHeadingLevel}`);
            }
        }
        if (options.transformations?.extractText && cleaned.length < original.length * 0.5) {
            warnings.push('Plain text extraction removed more than 50% of content');
        }
        if (options.transformations?.convertToHtml) {
            warnings.push('Markdown was converted to HTML format');
        }
        return warnings.length > 0 ? warnings : undefined;
    }
    validateSpecificConfig(config, errors, warnings) {
        const options = config.options;
        if (options.transformations?.maxHeadingLevel !== undefined) {
            if (options.transformations.maxHeadingLevel < 1 || options.transformations.maxHeadingLevel > 6) {
                errors.push('Max heading level must be between 1 and 6');
            }
        }
        if (options.stringifyOptions?.ruleRepetition !== undefined) {
            if (options.stringifyOptions.ruleRepetition < 3) {
                warnings.push('Rule repetition less than 3 may not render properly');
            }
        }
        if (options.transformations?.extractText && options.transformations?.convertToHtml) {
            errors.push('Cannot both extract plain text and convert to HTML');
        }
        if (options.transformations?.minifyMarkdown && options.transformations?.convertToHtml) {
            warnings.push('Minifying markdown before HTML conversion may affect output');
        }
        if (options.parseOptions?.pedantic && options.parseOptions?.gfm) {
            warnings.push('Pedantic and GFM modes may conflict');
        }
    }
}
exports.RemarkCleaner = RemarkCleaner;
//# sourceMappingURL=RemarkCleaner.js.map