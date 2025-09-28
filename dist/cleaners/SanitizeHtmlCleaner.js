"use strict";
/**
 * Sanitize-HTML Cleaner Implementation
 * Single Responsibility: HTML sanitization using sanitize-html library
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizeHtmlCleaner = void 0;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const BaseTextCleaner_1 = require("./BaseTextCleaner");
const ITextCleaner_1 = require("../interfaces/ITextCleaner");
class SanitizeHtmlCleaner extends BaseTextCleaner_1.BaseTextCleaner {
    constructor() {
        super('sanitize-html', 'Removes dangerous HTML and scripts while preserving safe content', [ITextCleaner_1.TextFormat.HTML, ITextCleaner_1.TextFormat.MIXED], {
            enabled: true,
            priority: 90,
            options: {
                allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
                    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
                    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span', 'img'],
                allowedAttributes: {
                    a: ['href', 'name', 'target', 'rel'],
                    img: ['src', 'alt', 'title', 'width', 'height'],
                    '*': ['class', 'id']
                },
                allowedSchemes: ['http', 'https', 'mailto'],
                allowProtocolRelative: true,
                enforceHtmlBoundary: true,
                parseStyleAttributes: false,
                disallowedTagsMode: 'discard',
                selfClosing: ['img', 'br', 'hr'],
                allowedClasses: {},
                allowedStyles: {},
                textFilter: undefined,
                exclusiveFilter: undefined,
                nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
                nestingLimit: 6
            }
        });
    }
    async performCleaning(input, config) {
        const options = this.buildSanitizeOptions(config.options || {});
        try {
            // Apply timeout if specified
            if (config.timeout) {
                return await this.cleanWithTimeout(input, options, config.timeout);
            }
            return (0, sanitize_html_1.default)(input, options);
        }
        catch (error) {
            console.error(`SanitizeHtml cleaning failed: ${error}`);
            throw new Error(`HTML sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async cleanWithTimeout(input, options, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Sanitization timeout after ${timeout}ms`));
            }, timeout);
            try {
                const result = (0, sanitize_html_1.default)(input, options);
                clearTimeout(timer);
                resolve(result);
            }
            catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }
    buildSanitizeOptions(customOptions) {
        const defaultOptions = this.defaultConfig.options;
        const merged = { ...defaultOptions, ...customOptions };
        // Handle special cases
        if (merged.allowedTags === false) {
            merged.allowedTags = false; // Strip all tags
        }
        if (merged.allowedAttributes === false) {
            merged.allowedAttributes = false; // Strip all attributes
        }
        return merged;
    }
    calculateStatistics(original, cleaned) {
        const tagsInOriginal = (original.match(/<[^>]+>/g) || []).length;
        const tagsInCleaned = (cleaned.match(/<[^>]+>/g) || []).length;
        const scriptsRemoved = (original.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || []).length;
        const stylesRemoved = (original.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).length;
        const linksInOriginal = (original.match(/<a[^>]*>/gi) || []).length;
        const linksInCleaned = (cleaned.match(/<a[^>]*>/gi) || []).length;
        return {
            tagsRemoved: tagsInOriginal - tagsInCleaned,
            scriptsRemoved,
            stylesRemoved,
            linksModified: linksInOriginal - linksInCleaned,
            custom: {
                originalTags: tagsInOriginal,
                remainingTags: tagsInCleaned,
                percentageStripped: ((1 - cleaned.length / original.length) * 100).toFixed(2)
            }
        };
    }
    generateWarnings(original, cleaned) {
        const warnings = [];
        if (cleaned.length < original.length * 0.1) {
            warnings.push('More than 90% of content was removed during sanitization');
        }
        if ((original.match(/<iframe/gi) || []).length > 0) {
            warnings.push('iframes were removed during sanitization');
        }
        if ((original.match(/<form/gi) || []).length > 0) {
            warnings.push('form elements were removed during sanitization');
        }
        return warnings.length > 0 ? warnings : undefined;
    }
    validateSpecificConfig(config, errors, warnings) {
        const options = config.options;
        if (options?.nestingLimit !== undefined && options.nestingLimit < 1) {
            errors.push('Nesting limit must be at least 1');
        }
        if (options?.allowVulnerableTags) {
            warnings.push('Allowing vulnerable tags may pose security risks');
        }
        if (options?.allowedTags === false && options?.textFilter === undefined) {
            warnings.push('Stripping all tags without text filter may result in unreadable text');
        }
    }
}
exports.SanitizeHtmlCleaner = SanitizeHtmlCleaner;
//# sourceMappingURL=SanitizeHtmlCleaner.js.map