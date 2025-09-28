"use strict";
/**
 * Interface Segregation Principle: Focused interface for web scraping libraries
 * Single Responsibility Principle: Only responsible for scraping content from URLs
 * Dependency Inversion Principle: High-level modules depend on this abstraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperType = void 0;
var ScraperType;
(function (ScraperType) {
    ScraperType["HTTP"] = "http";
    ScraperType["PLAYWRIGHT"] = "playwright";
    ScraperType["CRAWL4AI"] = "crawl4ai";
    ScraperType["DOCLING"] = "docling";
    ScraperType["DEEPDOCTECTION"] = "deepdoctection";
    ScraperType["CUSTOM"] = "custom";
})(ScraperType || (exports.ScraperType = ScraperType = {}));
//# sourceMappingURL=IScraper.js.map