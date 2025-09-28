"use strict";
/**
 * Base class implementing common URL detection functionality
 * Template Method Pattern + Single Responsibility Principle
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseUrlDetector = void 0;
class BaseUrlDetector {
    supportedTypes;
    priority;
    constructor(supportedTypes, priority = 1) {
        this.supportedTypes = supportedTypes;
        this.priority = priority;
    }
    async detect(url) {
        if (!this.canHandle(url)) {
            throw new Error(`Cannot handle URL: ${url}`);
        }
        return await this.performDetection(url);
    }
    validateUrl(url) {
        try {
            return new URL(url);
        }
        catch (error) {
            throw new Error(`Invalid URL format: ${url}`);
        }
    }
    extractFileExtension(url) {
        try {
            const parsedUrl = new URL(url);
            const pathname = parsedUrl.pathname;
            const lastDot = pathname.lastIndexOf('.');
            if (lastDot === -1 || lastDot === pathname.length - 1) {
                return null;
            }
            return pathname.substring(lastDot + 1).toLowerCase();
        }
        catch {
            return null;
        }
    }
    createClassification(type, mimeType, confidence, metadata = {}, size) {
        return {
            type,
            mimeType,
            size,
            metadata: {
                ...metadata,
                detectorClass: this.constructor.name,
                priority: this.priority
            },
            confidence: Math.max(0, Math.min(1, confidence))
        };
    }
    getPriority() {
        return this.priority;
    }
    getSupportedTypes() {
        return [...this.supportedTypes];
    }
}
exports.BaseUrlDetector = BaseUrlDetector;
//# sourceMappingURL=BaseUrlDetector.js.map