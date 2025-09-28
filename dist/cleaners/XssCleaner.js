"use strict";
/**
 * XSS Cleaner Implementation
 * Single Responsibility: XSS attack prevention using xss library
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
exports.XssCleaner = void 0;
const xss = __importStar(require("xss"));
const BaseTextCleaner_1 = require("./BaseTextCleaner");
const ITextCleaner_1 = require("../interfaces/ITextCleaner");
class XssCleaner extends BaseTextCleaner_1.BaseTextCleaner {
    constructor() {
        super('xss', 'Prevents XSS attacks by filtering dangerous HTML and JavaScript', [ITextCleaner_1.TextFormat.HTML, ITextCleaner_1.TextFormat.MIXED], {
            enabled: true,
            priority: 95, // High priority - security first
            options: {
                whiteList: {
                    a: ['href', 'title', 'target', 'rel'],
                    abbr: ['title'],
                    address: [],
                    area: ['shape', 'coords', 'href', 'alt'],
                    article: [],
                    aside: [],
                    b: [],
                    bdi: ['dir'],
                    bdo: ['dir'],
                    blockquote: ['cite'],
                    br: [],
                    caption: [],
                    cite: [],
                    code: [],
                    col: ['align', 'valign', 'span', 'width'],
                    colgroup: ['align', 'valign', 'span', 'width'],
                    dd: [],
                    del: ['datetime'],
                    details: ['open'],
                    div: ['class', 'id'],
                    dl: [],
                    dt: [],
                    em: [],
                    footer: [],
                    h1: ['class', 'id'],
                    h2: ['class', 'id'],
                    h3: ['class', 'id'],
                    h4: ['class', 'id'],
                    h5: ['class', 'id'],
                    h6: ['class', 'id'],
                    header: [],
                    hr: [],
                    i: [],
                    img: ['src', 'alt', 'title', 'width', 'height'],
                    ins: ['datetime'],
                    li: [],
                    mark: [],
                    nav: [],
                    ol: [],
                    p: ['class', 'id'],
                    pre: [],
                    q: ['cite'],
                    section: [],
                    small: [],
                    span: ['class', 'id'],
                    strong: [],
                    sub: [],
                    summary: [],
                    sup: [],
                    table: ['width', 'border', 'align', 'valign'],
                    tbody: ['align', 'valign'],
                    td: ['width', 'rowspan', 'colspan', 'align', 'valign'],
                    tfoot: ['align', 'valign'],
                    th: ['width', 'rowspan', 'colspan', 'align', 'valign'],
                    thead: ['align', 'valign'],
                    tr: ['rowspan', 'align', 'valign'],
                    u: [],
                    ul: [],
                    video: ['autoplay', 'controls', 'crossorigin', 'loop', 'muted', 'playsinline', 'poster', 'preload', 'src', 'height', 'width']
                },
                stripIgnoreTag: true,
                stripIgnoreTagBody: ['script', 'style'],
                allowCommentTag: false,
                stripBlankChar: false,
                css: false,
                enableStrictMode: true
            }
        });
    }
    async performCleaning(input, config) {
        const options = this.buildXssOptions(config.options || {});
        try {
            // Create custom XSS filter with options
            const myxss = new xss.FilterXSS(options);
            // Process the input
            const cleaned = myxss.process(input);
            // Additional safety check for common XSS patterns
            const doubleChecked = this.additionalXssCheck(cleaned);
            return doubleChecked;
        }
        catch (error) {
            console.error(`XSS cleaning failed: ${error}`);
            throw new Error(`XSS filtering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    buildXssOptions(customOptions) {
        const defaultOptions = this.defaultConfig.options;
        const merged = { ...defaultOptions, ...customOptions };
        // Add custom handlers if needed
        if (!merged.onTagAttr) {
            merged.onTagAttr = (_tag, name, value, _isWhiteAttr) => {
                // Block javascript: protocol
                if (name === 'href' || name === 'src') {
                    if (value.match(/^javascript:/i)) {
                        return '';
                    }
                    // Block data URIs that could contain scripts (except images)
                    if (value.match(/^data:/i) && !value.match(/^data:image\//i)) {
                        return '';
                    }
                }
                // Block event handlers
                if (name.match(/^on[a-z]+$/i)) {
                    return '';
                }
                // Default behavior
                return undefined;
            };
        }
        if (!merged.safeAttrValue) {
            merged.safeAttrValue = (tag, name, value, cssFilter) => {
                // Use default XSS safe attribute value processing
                return xss.safeAttrValue(tag, name, value, cssFilter);
            };
        }
        return merged;
    }
    additionalXssCheck(input) {
        // Additional patterns to remove
        const patterns = [
            // JavaScript event handlers
            /on\w+\s*=\s*["'][^"']*["']/gi,
            /on\w+\s*=\s*[^\s>]+/gi,
            // JavaScript protocols
            /javascript\s*:/gi,
            /vbscript\s*:/gi,
            // Dangerous attributes
            /data\s*:\s*text\/html/gi,
            // Import statements
            /@import/gi,
            // Expression calls
            /expression\s*\(/gi,
            // Meta refresh
            /<meta[^>]*http-equiv[^>]*refresh[^>]*>/gi,
            // Base tag manipulation
            /<base[^>]*href[^>]*>/gi,
            // Form actions
            /formaction\s*=/gi,
            // SVG scripts
            /<svg[^>]*onload[^>]*>/gi
        ];
        let cleaned = input;
        for (const pattern of patterns) {
            cleaned = cleaned.replace(pattern, '');
        }
        return cleaned;
    }
    calculateStatistics(original, cleaned) {
        const scriptsInOriginal = (original.match(/<script[^>]*>/gi) || []).length;
        const eventsInOriginal = (original.match(/on\w+\s*=/gi) || []).length;
        const jsProtocolsInOriginal = (original.match(/javascript:/gi) || []).length;
        const iframesInOriginal = (original.match(/<iframe[^>]*>/gi) || []).length;
        const embedsInOriginal = (original.match(/<embed[^>]*>/gi) || []).length;
        const objectsInOriginal = (original.match(/<object[^>]*>/gi) || []).length;
        return {
            scriptsRemoved: scriptsInOriginal,
            custom: {
                eventHandlersRemoved: eventsInOriginal,
                jsProtocolsRemoved: jsProtocolsInOriginal,
                iframesRemoved: iframesInOriginal,
                embedsRemoved: embedsInOriginal,
                objectsRemoved: objectsInOriginal,
                xssPatternsFound: (scriptsInOriginal +
                    eventsInOriginal +
                    jsProtocolsInOriginal +
                    iframesInOriginal +
                    embedsInOriginal +
                    objectsInOriginal),
                cleanlinessScore: cleaned.length > 0
                    ? ((1 - (scriptsInOriginal + eventsInOriginal) / (cleaned.length / 100)) * 100).toFixed(2)
                    : '100'
            }
        };
    }
    generateWarnings(original, cleaned) {
        const warnings = [];
        if (original.match(/<script[^>]*>/gi)) {
            warnings.push('Script tags were removed for security');
        }
        if (original.match(/on\w+\s*=/gi)) {
            warnings.push('Event handlers were removed for security');
        }
        if (original.match(/javascript:/gi)) {
            warnings.push('JavaScript protocols were removed');
        }
        if (original.match(/<iframe[^>]*>/gi)) {
            warnings.push('Iframes were removed for security');
        }
        if (original.match(/<form[^>]*>/gi) && !cleaned.match(/<form[^>]*>/gi)) {
            warnings.push('Form elements were removed - may affect functionality');
        }
        const reduction = 1 - (cleaned.length / original.length);
        if (reduction > 0.5) {
            warnings.push(`${(reduction * 100).toFixed(0)}% of content was removed for security`);
        }
        return warnings.length > 0 ? warnings : undefined;
    }
    validateSpecificConfig(config, errors, warnings) {
        const options = config.options;
        if (options?.css === true && !options?.enableStrictMode) {
            warnings.push('Allowing CSS without strict mode may pose security risks');
        }
        if (options?.allowCommentTag) {
            warnings.push('Allowing HTML comments may preserve sensitive information');
        }
        if (options?.whiteList && Object.keys(options.whiteList).includes('script')) {
            errors.push('Script tags should never be whitelisted for XSS prevention');
        }
        if (options?.stripIgnoreTag === false && options?.stripIgnoreTagBody === false) {
            warnings.push('Not stripping ignored tags may leave dangerous content');
        }
    }
}
exports.XssCleaner = XssCleaner;
//# sourceMappingURL=XssCleaner.js.map