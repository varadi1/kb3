"use strict";
/**
 * HTML content processor
 * Single Responsibility: Processes HTML content and extracts structured data
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
exports.HtmlProcessor = void 0;
const cheerio = __importStar(require("cheerio"));
const BaseProcessor_1 = require("./BaseProcessor");
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
class HtmlProcessor extends BaseProcessor_1.BaseProcessor {
    constructor(maxTextLength = 1000000) {
        super([IUrlDetector_1.ContentType.HTML], maxTextLength);
    }
    async performProcessing(content, _contentType, options) {
        const htmlContent = Buffer.isBuffer(content) ? content.toString('utf8') : content;
        const $ = cheerio.load(htmlContent);
        // Remove script and style elements
        $('script, style, noscript').remove();
        const text = this.extractTextContent($, options);
        const title = this.extractHtmlTitle($);
        const links = options.extractLinks ? this.extractHtmlLinks($) : [];
        const images = options.extractImages ? this.extractImages($) : [];
        const tables = this.extractTables($);
        const structure = options.extractMetadata ? this.extractHtmlStructure($) : undefined;
        const metadata = this.extractMetadata($, htmlContent);
        return this.createProcessedContent(text, title, metadata, images, links, tables, structure);
    }
    extractTextContent($, options) {
        // Remove unwanted elements
        $('nav, footer, aside, .advertisement, .ads, .cookie-notice').remove();
        let text;
        if (options.preserveFormatting) {
            text = this.extractFormattedText($);
        }
        else {
            text = $('body').text() || $.text();
        }
        return this.cleanText(text);
    }
    extractFormattedText($) {
        const textParts = [];
        // Process headings
        $('h1, h2, h3, h4, h5, h6').each((_, element) => {
            const $el = $(element);
            const level = parseInt(element.tagName[1]);
            const prefix = '#'.repeat(level);
            textParts.push(`${prefix} ${$el.text().trim()}`);
        });
        // Process paragraphs
        $('p').each((_, element) => {
            const text = $(element).text().trim();
            if (text) {
                textParts.push(text);
            }
        });
        // Process lists
        $('ul, ol').each((_, element) => {
            const $list = $(element);
            $list.find('li').each((_, li) => {
                const text = $(li).text().trim();
                if (text) {
                    const prefix = element.tagName === 'ol' ? '-' : '*';
                    textParts.push(`${prefix} ${text}`);
                }
            });
        });
        // Process blockquotes
        $('blockquote').each((_, element) => {
            const text = $(element).text().trim();
            if (text) {
                textParts.push(`> ${text}`);
            }
        });
        return textParts.join('\n\n');
    }
    extractHtmlTitle($) {
        // Try multiple sources for title
        const titleSources = [
            $('title').first().text(),
            $('h1').first().text(),
            $('meta[property="og:title"]').attr('content'),
            $('meta[name="title"]').attr('content'),
            $('meta[property="twitter:title"]').attr('content')
        ];
        for (const title of titleSources) {
            if (title && title.trim().length > 0) {
                return title.trim();
            }
        }
        return undefined;
    }
    extractHtmlLinks($) {
        const links = [];
        $('a[href]').each((_, element) => {
            const $link = $(element);
            const href = $link.attr('href');
            const text = $link.text().trim();
            const title = $link.attr('title');
            if (href && text && this.isValidUrl(href)) {
                links.push({
                    url: href,
                    text,
                    title
                });
            }
        });
        // Remove duplicates
        const uniqueLinks = links.filter((link, index, array) => array.findIndex(l => l.url === link.url) === index);
        return uniqueLinks;
    }
    extractImages($) {
        const images = [];
        $('img[src]').each((_, element) => {
            const $img = $(element);
            const src = $img.attr('src');
            const alt = $img.attr('alt');
            const title = $img.attr('title');
            const width = this.parseNumber($img.attr('width'));
            const height = this.parseNumber($img.attr('height'));
            if (src) {
                const image = {
                    src,
                    alt,
                    caption: title || alt
                };
                if (width && height) {
                    image.size = { width, height };
                }
                images.push(image);
            }
        });
        // Also extract images from figure elements
        $('figure img').each((_, element) => {
            const $img = $(element);
            const $figure = $img.closest('figure');
            const src = $img.attr('src');
            const alt = $img.attr('alt');
            const caption = $figure.find('figcaption').text().trim();
            if (src && !images.some(img => img.src === src)) {
                images.push({
                    src,
                    alt,
                    caption: caption || alt
                });
            }
        });
        return images;
    }
    extractTables($) {
        const tables = [];
        $('table').each((_, element) => {
            const $table = $(element);
            const caption = $table.find('caption').text().trim();
            // Extract headers
            const headers = [];
            $table.find('thead th, tbody tr:first-child th, tr:first-child td').each((_, th) => {
                headers.push($(th).text().trim());
            });
            if (headers.length === 0)
                return; // Skip tables without clear headers
            // Extract rows
            const rows = [];
            const rowSelector = $table.find('thead').length > 0
                ? 'tbody tr'
                : 'tr:not(:first-child)';
            $table.find(rowSelector).each((_, tr) => {
                const row = [];
                $(tr).find('td, th').each((_, cell) => {
                    row.push($(cell).text().trim());
                });
                if (row.length > 0) {
                    rows.push(row);
                }
            });
            if (rows.length > 0) {
                tables.push({
                    headers,
                    rows,
                    caption: caption || undefined
                });
            }
        });
        return tables;
    }
    extractHtmlStructure($) {
        const headings = [];
        const sections = [];
        // Extract headings
        $('h1, h2, h3, h4, h5, h6').each((_, element) => {
            const $heading = $(element);
            const level = parseInt(element.tagName[1]);
            const text = $heading.text().trim();
            const id = $heading.attr('id') || this.generateHtmlId(text);
            if (text) {
                headings.push({
                    level,
                    text,
                    id
                });
            }
        });
        // Extract sections based on headings
        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            const nextHeading = headings[i + 1];
            const $current = $(`h${heading.level}:contains("${heading.text}")`).first();
            const $next = nextHeading
                ? $(`h${nextHeading.level}:contains("${nextHeading.text}")`).first()
                : $();
            let content = '';
            if ($current.length > 0) {
                let $sibling = $current.next();
                while ($sibling.length > 0 && !$sibling.is($next)) {
                    if ($sibling.is('p, div, ul, ol, blockquote')) {
                        content += $sibling.text().trim() + '\n\n';
                    }
                    $sibling = $sibling.next();
                }
            }
            if (content.trim()) {
                sections.push({
                    title: heading.text,
                    content: content.trim()
                });
            }
        }
        return {
            headings,
            sections
        };
    }
    extractMetadata($, htmlContent) {
        const metadata = {
            contentType: IUrlDetector_1.ContentType.HTML,
            characterCount: htmlContent.length
        };
        // Extract meta tags
        const metaTags = {};
        $('meta').each((_, element) => {
            const $meta = $(element);
            const name = $meta.attr('name') || $meta.attr('property') || $meta.attr('http-equiv');
            const content = $meta.attr('content');
            if (name && content) {
                metaTags[name] = content;
            }
        });
        if (Object.keys(metaTags).length > 0) {
            metadata.metaTags = metaTags;
        }
        // Extract language
        const lang = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content');
        if (lang) {
            metadata.language = lang;
        }
        // Extract document structure info
        metadata.structure = {
            headingCount: $('h1, h2, h3, h4, h5, h6').length,
            paragraphCount: $('p').length,
            linkCount: $('a[href]').length,
            imageCount: $('img[src]').length,
            tableCount: $('table').length,
            listCount: $('ul, ol').length
        };
        // Extract Open Graph data
        const ogData = {};
        $('meta[property^="og:"]').each((_, element) => {
            const $meta = $(element);
            const property = $meta.attr('property');
            const content = $meta.attr('content');
            if (property && content) {
                ogData[property.replace('og:', '')] = content;
            }
        });
        if (Object.keys(ogData).length > 0) {
            metadata.openGraph = ogData;
        }
        // Extract Twitter Card data
        const twitterData = {};
        $('meta[name^="twitter:"]').each((_, element) => {
            const $meta = $(element);
            const name = $meta.attr('name');
            const content = $meta.attr('content');
            if (name && content) {
                twitterData[name.replace('twitter:', '')] = content;
            }
        });
        if (Object.keys(twitterData).length > 0) {
            metadata.twitterCard = twitterData;
        }
        return metadata;
    }
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            // Check if it's a relative URL
            return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
        }
    }
    parseNumber(value) {
        if (!value)
            return undefined;
        const num = parseInt(value, 10);
        return isNaN(num) ? undefined : num;
    }
    generateHtmlId(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }
}
exports.HtmlProcessor = HtmlProcessor;
//# sourceMappingURL=HtmlProcessor.js.map