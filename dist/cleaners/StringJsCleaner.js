"use strict";
/**
 * String.js Cleaner Implementation
 * Single Responsibility: String manipulation using String.js library
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringJsCleaner = void 0;
const string_1 = __importDefault(require("string"));
const BaseTextCleaner_1 = require("./BaseTextCleaner");
const ITextCleaner_1 = require("../interfaces/ITextCleaner");
class StringJsCleaner extends BaseTextCleaner_1.BaseTextCleaner {
    constructor() {
        super('string-js', 'Advanced string manipulation with String.js library', [ITextCleaner_1.TextFormat.PLAIN_TEXT, ITextCleaner_1.TextFormat.HTML, ITextCleaner_1.TextFormat.MARKDOWN, ITextCleaner_1.TextFormat.MIXED], {
            enabled: true,
            priority: 65,
            options: {
                clean: true,
                trim: true,
                collapseWhitespace: true,
                decodeHTMLEntities: true,
                unescapeHTML: false,
                escapeHTML: false,
                stripTags: false,
                stripPunctuation: false,
                humanize: false,
                dasherize: false,
                underscore: false,
                camelize: false,
                classify: false,
                capitalize: false,
                titleCase: false,
                slugify: false,
                latinise: false,
                reverse: false,
                shuffle: false,
                toInt: false,
                toFloat: false,
                toBoolean: false,
                replaceAll: []
            }
        });
    }
    async performCleaning(input, config) {
        const options = config.options;
        let s = (0, string_1.default)(input);
        try {
            // Apply operations in logical order
            // 1. HTML operations first
            if (options.stripTags) {
                if (Array.isArray(options.stripTags)) {
                    // Strip specific tags
                    for (const tag of options.stripTags) {
                        const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
                        s = (0, string_1.default)(s.s.replace(regex, ''));
                    }
                }
                else {
                    s = s.stripTags();
                }
            }
            if (options.decodeHTMLEntities) {
                s = s.decodeHTMLEntities();
            }
            if (options.unescapeHTML) {
                s = s.unescapeHTML();
            }
            // 2. Text extraction
            if (options.between) {
                s = s.between(options.between.left, options.between.right);
            }
            if (options.chompLeft) {
                s = s.chompLeft(options.chompLeft);
            }
            if (options.chompRight) {
                s = s.chompRight(options.chompRight);
            }
            // 3. Apply replacements
            if (options.replaceAll && options.replaceAll.length > 0) {
                for (const replacement of options.replaceAll) {
                    if (typeof replacement.pattern === 'string') {
                        s = s.replaceAll(replacement.pattern, replacement.replacement);
                    }
                    else {
                        // Handle RegExp pattern
                        const regex = replacement.pattern;
                        s = (0, string_1.default)(s.s.replace(regex, replacement.replacement));
                    }
                }
            }
            // 4. Strip operations
            if (options.stripPunctuation) {
                s = (0, string_1.default)(s.s.replace(/[^\w\s]/g, ' '));
            }
            if (options.stripLeft) {
                const strips = Array.isArray(options.stripLeft) ? options.stripLeft : [options.stripLeft];
                for (const strip of strips) {
                    while (s.startsWith(strip)) {
                        s = s.chompLeft(strip);
                    }
                }
            }
            if (options.stripRight) {
                const strips = Array.isArray(options.stripRight) ? options.stripRight : [options.stripRight];
                for (const strip of strips) {
                    while (s.endsWith(strip)) {
                        s = s.chompRight(strip);
                    }
                }
            }
            // 5. Transformations
            if (options.latinise) {
                s = s.latinise();
            }
            if (options.humanize) {
                s = s.humanize();
            }
            // 6. Case transformations
            if (options.dasherize) {
                s = s.dasherize();
            }
            else if (options.underscore) {
                s = s.underscore();
            }
            else if (options.camelize) {
                s = s.camelize();
            }
            else if (options.classify) {
                s = (0, string_1.default)(s.s).capitalize().camelize();
            }
            else if (options.capitalize) {
                s = s.capitalize();
            }
            else if (options.titleCase) {
                s = s.titleCase();
            }
            else if (options.slugify) {
                s = s.slugify();
            }
            // 7. Whitespace operations
            if (options.clean || options.collapseWhitespace) {
                s = s.collapseWhitespace();
            }
            // 8. Padding
            if (options.pad) {
                const padStr = options.pad.padStr || ' ';
                if (options.pad.type === 'left') {
                    s = s.padLeft(options.pad.length, padStr);
                }
                else if (options.pad.type === 'right') {
                    s = s.padRight(options.pad.length, padStr);
                }
                else {
                    s = s.pad(options.pad.length, padStr);
                }
            }
            // 9. Ensure operations
            if (options.ensureLeft) {
                s = s.ensureLeft(options.ensureLeft);
            }
            if (options.ensureRight) {
                s = s.ensureRight(options.ensureRight);
            }
            // 10. Truncate
            if (options.truncate) {
                s = s.truncate(options.truncate.length, options.truncate.pruneString);
            }
            // 11. Repeat
            if (options.repeat && options.repeat > 1) {
                s = s.repeat(options.repeat);
            }
            // 12. Special operations
            if (options.reverse) {
                s = (0, string_1.default)(s.s.split('').reverse().join(''));
            }
            if (options.shuffle) {
                const chars = s.s.split('');
                for (let i = chars.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [chars[i], chars[j]] = [chars[j], chars[i]];
                }
                s = (0, string_1.default)(chars.join(''));
            }
            // 13. Format operations
            if (options.toCSV) {
                const lines = s.lines();
                const csv = lines.map((line) => {
                    const values = line.split(options.toCSV.delimiter || ',');
                    const qualifier = options.toCSV.qualifier || '"';
                    return values.map((v) => `${qualifier}${v}${qualifier}`).join(options.toCSV.delimiter || ',');
                });
                s = (0, string_1.default)(csv.join('\n'));
            }
            // 14. Extract operations
            if (options.lines) {
                const lines = s.lines();
                s = (0, string_1.default)(lines.join('\n'));
            }
            else if (options.words) {
                const words = s.s.split(/\s+/).filter(w => w.length > 0);
                s = (0, string_1.default)(words.join(' '));
            }
            else if (options.chars) {
                const chars = s.s.split('');
                s = (0, string_1.default)(chars.join(''));
            }
            // 15. Type conversions
            let result = s.s;
            if (options.toInt) {
                const intValue = parseInt(result, 10);
                result = isNaN(intValue) ? '0' : intValue.toString();
            }
            else if (options.toFloat) {
                const floatValue = parseFloat(result);
                result = isNaN(floatValue) ? '0.0' : floatValue.toString();
            }
            else if (options.toBoolean) {
                const boolValue = s.toBoolean();
                result = boolValue !== null ? boolValue.toString() : 'false';
            }
            // 16. HTML wrapping (do last)
            if (options.wrapHTML) {
                const attrs = options.wrapHTML.attributes
                    ? Object.entries(options.wrapHTML.attributes)
                        .map(([k, v]) => `${k}="${v}"`)
                        .join(' ')
                    : '';
                result = `<${options.wrapHTML.element}${attrs ? ' ' + attrs : ''}>${result}</${options.wrapHTML.element}>`;
            }
            // 17. Final HTML escape if needed
            if (options.escapeHTML) {
                result = (0, string_1.default)(result).escapeHTML().s;
            }
            // 18. Final trim
            if (options.trim) {
                result = (0, string_1.default)(result).trim().s;
            }
            else if (options.trimLeft) {
                result = (0, string_1.default)(result).trimLeft().s;
            }
            else if (options.trimRight) {
                result = (0, string_1.default)(result).trimRight().s;
            }
            return result;
        }
        catch (error) {
            console.error(`StringJs cleaning failed: ${error}`);
            throw new Error(`String.js processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    calculateStatistics(original, cleaned) {
        const sOriginal = (0, string_1.default)(original);
        const sCleaned = (0, string_1.default)(cleaned);
        const originalWords = sOriginal.s.split(/\s+/).filter(w => w.length > 0).length;
        const cleanedWords = sCleaned.s.split(/\s+/).filter(w => w.length > 0).length;
        const originalLines = sOriginal.lines().length;
        const cleanedLines = sCleaned.lines().length;
        const htmlTagsOriginal = (original.match(/<[^>]+>/g) || []).length;
        const htmlTagsCleaned = (cleaned.match(/<[^>]+>/g) || []).length;
        const punctuationOriginal = (original.match(/[^\w\s]/g) || []).length;
        const punctuationCleaned = (cleaned.match(/[^\w\s]/g) || []).length;
        return {
            tagsRemoved: htmlTagsOriginal - htmlTagsCleaned,
            specialCharsRemoved: punctuationOriginal - punctuationCleaned,
            custom: {
                originalWords,
                cleanedWords,
                wordsModified: originalWords - cleanedWords,
                originalLines,
                cleanedLines,
                linesModified: originalLines - cleanedLines,
                lengthDifference: original.length - cleaned.length,
                compressionPercentage: ((1 - cleaned.length / original.length) * 100).toFixed(2),
                isEmpty: (0, string_1.default)(cleaned).isEmpty()
            }
        };
    }
    generateWarnings(original, cleaned) {
        const warnings = [];
        const s = (0, string_1.default)(cleaned);
        if (s.isEmpty()) {
            warnings.push('Result is empty after cleaning');
        }
        if (s.s.trim() === '') {
            warnings.push('Result contains only whitespace');
        }
        const options = this.config.options;
        if (options.truncate && cleaned.endsWith(options.truncate.pruneString || '...')) {
            warnings.push(`Text was truncated to ${options.truncate.length} characters`);
        }
        if (cleaned.length < original.length * 0.1) {
            warnings.push('More than 90% of content was removed');
        }
        if (options.shuffle) {
            warnings.push('Text was randomly shuffled - original order lost');
        }
        if (options.reverse) {
            warnings.push('Text was reversed');
        }
        if (options.toInt || options.toFloat || options.toBoolean) {
            warnings.push('Type conversion was applied - may lose textual content');
        }
        return warnings.length > 0 ? warnings : undefined;
    }
    validateSpecificConfig(config, errors, warnings) {
        const options = config.options;
        // Check conflicting operations
        const caseOps = [
            options.dasherize,
            options.underscore,
            options.camelize,
            options.classify,
            options.slugify
        ].filter(Boolean);
        if (caseOps.length > 1) {
            errors.push('Multiple case formatting operations specified - only one should be enabled');
        }
        if (options.escapeHTML && options.unescapeHTML) {
            errors.push('Both escapeHTML and unescapeHTML are enabled - these are conflicting operations');
        }
        if (options?.truncate && options.truncate.length <= 0) {
            errors.push('Truncate length must be positive');
        }
        if (options?.pad && options.pad.length <= 0) {
            errors.push('Pad length must be positive');
        }
        if (options?.repeat && (options.repeat <= 0 || options.repeat > 1000)) {
            errors.push('Repeat count must be between 1 and 1000');
        }
        if (options.stripTags && options.escapeHTML) {
            warnings.push('stripTags and escapeHTML together may produce unexpected results');
        }
        if (options.shuffle && options.words) {
            warnings.push('Shuffling and word extraction together will randomize word order');
        }
        if ((options.toInt || options.toFloat || options.toBoolean) && !options.truncate) {
            warnings.push('Type conversion without truncation may fail on long text');
        }
    }
}
exports.StringJsCleaner = StringJsCleaner;
//# sourceMappingURL=StringJsCleaner.js.map