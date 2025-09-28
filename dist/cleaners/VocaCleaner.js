"use strict";
/**
 * Voca String Cleaner Implementation
 * Single Responsibility: String manipulation and cleaning using Voca library
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
exports.VocaCleaner = void 0;
const v = __importStar(require("voca"));
const BaseTextCleaner_1 = require("./BaseTextCleaner");
const ITextCleaner_1 = require("../interfaces/ITextCleaner");
class VocaCleaner extends BaseTextCleaner_1.BaseTextCleaner {
    constructor() {
        super('voca', 'Advanced string manipulation and text normalization', [ITextCleaner_1.TextFormat.PLAIN_TEXT, ITextCleaner_1.TextFormat.HTML, ITextCleaner_1.TextFormat.MARKDOWN, ITextCleaner_1.TextFormat.MIXED], {
            enabled: true,
            priority: 70,
            options: {
                trimWhitespace: true,
                normalizeWhitespace: true,
                removeHtmlTags: false,
                unescapeHtml: true,
                toLowerCase: false,
                toUpperCase: false,
                capitalize: false,
                camelCase: false,
                kebabCase: false,
                snakeCase: false,
                titleCase: false,
                swapCase: false,
                removeAccents: false,
                latinize: false,
                slugify: false,
                stripBom: true,
                stripTags: false,
                escapeHtml: false,
                escapeRegExp: false,
                words: false,
                chars: false,
                replaceAll: []
            }
        });
    }
    async performCleaning(input, config) {
        const options = config.options;
        let result = input;
        try {
            // Apply operations in a specific order for best results
            // 1. Strip BOM if present
            if (options.stripBom) {
                result = this.stripBom(result);
            }
            // 2. Handle HTML-related operations
            if (options.stripTags) {
                result = Array.isArray(options.stripTags)
                    ? v.stripTags(result, options.stripTags)
                    : v.stripTags(result);
            }
            if (options.unescapeHtml) {
                result = v.unescapeHtml(result);
            }
            if (options.escapeHtml) {
                result = v.escapeHtml(result);
            }
            // 3. Apply replacements
            if (options.replaceAll && options.replaceAll.length > 0) {
                for (const replacement of options.replaceAll) {
                    result = v.replaceAll(result, replacement.search, replacement.replace);
                }
            }
            // 4. Apply transformations
            if (options.latinize) {
                result = v.latinise(result);
            }
            if (options.removeAccents) {
                result = this.removeAccents(result);
            }
            // 5. Apply case transformations
            if (options.toLowerCase) {
                result = v.lowerCase(result);
            }
            else if (options.toUpperCase) {
                result = v.upperCase(result);
            }
            else if (options.capitalize) {
                result = v.capitalize(result);
            }
            else if (options.titleCase) {
                result = v.titleCase(result);
            }
            else if (options.swapCase) {
                result = v.swapCase(result);
            }
            else if (options.camelCase) {
                result = v.camelCase(result);
            }
            else if (options.kebabCase) {
                result = v.kebabCase(result);
            }
            else if (options.snakeCase) {
                result = v.snakeCase(result);
            }
            // 6. Format operations
            if (options.slugify) {
                result = v.slugify(result);
            }
            // 7. Extract specific elements
            if (options.words) {
                const words = v.words(result);
                result = words.join(' ');
            }
            else if (options.chars) {
                const chars = v.chars(result);
                result = chars.join('');
            }
            // 8. Padding operations
            if (options.padLeft) {
                result = v.padLeft(result, options.padLeft.length, options.padLeft.pad);
            }
            if (options.padRight) {
                result = v.padRight(result, options.padRight.length, options.padRight.pad);
            }
            // 9. Truncate if specified
            if (options.truncate) {
                result = v.truncate(result, options.truncate.length, options.truncate.ending);
            }
            // 10. Repeat if specified
            if (options.repeat && options.repeat > 1) {
                result = v.repeat(result, options.repeat);
            }
            // 11. Whitespace normalization (do this last)
            if (options.normalizeWhitespace) {
                result = this.normalizeWhitespace(result);
            }
            if (options.trimWhitespace) {
                result = v.trim(result);
            }
            // 12. Apply custom operations if specified
            if (options.operations) {
                result = this.applyCustomOperations(result, options.operations);
            }
            // 13. Escape regex if needed
            if (options.escapeRegExp) {
                result = v.escapeRegExp(result);
            }
            return result;
        }
        catch (error) {
            console.error(`Voca cleaning failed: ${error}`);
            throw new Error(`String manipulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    stripBom(text) {
        // Remove UTF-8 BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
            return text.slice(1);
        }
        return text;
    }
    removeAccents(text) {
        // Use Voca's latinise but keep the original case
        const latinized = v.latinise(text);
        return latinized;
    }
    normalizeWhitespace(text) {
        // Replace multiple spaces with single space
        // Replace various whitespace characters with standard space
        return text
            .replace(/[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    applyCustomOperations(text, operations) {
        let result = text;
        for (const op of operations) {
            try {
                const method = v[op.method];
                if (typeof method === 'function') {
                    result = op.params
                        ? method(result, ...op.params)
                        : method(result);
                }
                else {
                    console.warn(`Voca method '${op.method}' not found`);
                }
            }
            catch (error) {
                console.warn(`Failed to apply Voca operation '${op.method}': ${error}`);
            }
        }
        return result;
    }
    calculateStatistics(original, cleaned) {
        const originalWords = v.countWords(original);
        const cleanedWords = v.countWords(cleaned);
        const originalChars = original.length;
        const cleanedChars = cleaned.length;
        const originalLines = original.split('\n').length;
        const cleanedLines = cleaned.split('\n').length;
        // Count various elements
        const htmlTagsRemoved = original.match(/<[^>]+>/g)?.length || 0;
        const specialCharsOriginal = original.match(/[^\w\s]/g)?.length || 0;
        const specialCharsCleaned = cleaned.match(/[^\w\s]/g)?.length || 0;
        const whitespaceOriginal = original.match(/\s+/g)?.length || 0;
        const whitespaceCleaned = cleaned.match(/\s+/g)?.length || 0;
        return {
            tagsRemoved: htmlTagsRemoved,
            specialCharsRemoved: specialCharsOriginal - specialCharsCleaned,
            custom: {
                wordsOriginal: originalWords,
                wordsCleaned: cleanedWords,
                wordsRemoved: originalWords - cleanedWords,
                charsOriginal: originalChars,
                charsCleaned: cleanedChars,
                charsRemoved: originalChars - cleanedChars,
                linesOriginal: originalLines,
                linesCleaned: cleanedLines,
                whitespaceReduced: whitespaceOriginal - whitespaceCleaned,
                compressionRatio: ((1 - cleanedChars / originalChars) * 100).toFixed(2)
            }
        };
    }
    generateWarnings(original, cleaned) {
        const warnings = [];
        if (v.isBlank(cleaned)) {
            warnings.push('Result is blank after cleaning');
        }
        const originalWords = v.countWords(original);
        const cleanedWords = v.countWords(cleaned);
        if (cleanedWords < originalWords * 0.1) {
            warnings.push('More than 90% of words were removed');
        }
        if (cleaned.length < 10 && original.length > 100) {
            warnings.push('Text was reduced to less than 10 characters');
        }
        const options = this.config.options;
        if (options.truncate && cleaned.endsWith(options.truncate.ending || '...')) {
            warnings.push(`Text was truncated to ${options.truncate.length} characters`);
        }
        if (options.slugify && cleaned !== v.slugify(original)) {
            warnings.push('Slugification significantly altered the text');
        }
        return warnings.length > 0 ? warnings : undefined;
    }
    validateSpecificConfig(config, errors, warnings) {
        const options = config.options;
        // Check for conflicting options
        const caseOptions = [
            options.toLowerCase,
            options.toUpperCase,
            options.capitalize,
            options.titleCase,
            options.swapCase,
            options.camelCase,
            options.kebabCase,
            options.snakeCase
        ].filter(Boolean);
        if (caseOptions.length > 1) {
            errors.push('Multiple case transformations specified - only one should be enabled');
        }
        if (options?.truncate && options.truncate.length <= 0) {
            errors.push('Truncate length must be positive');
        }
        if (options?.padLeft && options.padLeft.length <= 0) {
            errors.push('Pad left length must be positive');
        }
        if (options?.padRight && options.padRight.length <= 0) {
            errors.push('Pad right length must be positive');
        }
        if (options?.repeat && options.repeat <= 0) {
            errors.push('Repeat count must be positive');
        }
        if (options.escapeHtml && options.unescapeHtml) {
            warnings.push('Both escapeHtml and unescapeHtml are enabled - may cancel each other');
        }
        if (options.stripTags && options.escapeHtml) {
            warnings.push('stripTags and escapeHtml together may produce unexpected results');
        }
    }
}
exports.VocaCleaner = VocaCleaner;
//# sourceMappingURL=VocaCleaner.js.map