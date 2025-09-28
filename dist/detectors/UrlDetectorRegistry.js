"use strict";
/**
 * Registry for URL detectors
 * Single Responsibility: Manages and coordinates multiple detectors
 * Open/Closed Principle: Easy to add new detectors
 * Dependency Inversion: Depends on IUrlDetector abstraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlDetectorRegistry = void 0;
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
class UrlDetectorRegistry {
    detectors;
    constructor(detectors = []) {
        this.detectors = [...detectors];
    }
    /**
     * Checks if any detector can handle the URL
     * @param url The URL to check
     * @returns true if at least one detector can handle it
     */
    canHandle(url) {
        return this.detectors.some(detector => detector.canHandle(url));
    }
    /**
     * Adds a new detector to the registry
     * @param detector The detector to add
     */
    addDetector(detector) {
        this.detectors.push(detector);
        this.sortDetectorsByPriority();
    }
    /**
     * Removes a detector from the registry
     * @param detector The detector to remove
     */
    removeDetector(detector) {
        const index = this.detectors.indexOf(detector);
        if (index !== -1) {
            this.detectors.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Detects URL content type using the best available detector
     * @param url The URL to detect
     * @returns Promise resolving to URL classification
     */
    async detect(url) {
        const capableDetectors = this.detectors.filter(detector => detector.canHandle(url));
        if (capableDetectors.length === 0) {
            return this.createUnknownClassification(url);
        }
        // Try detectors in priority order
        for (const detector of capableDetectors) {
            try {
                const result = await detector.detect(url);
                if (result.confidence > 0.1) { // Minimum confidence threshold
                    return result;
                }
            }
            catch (error) {
                console.warn(`Detector ${detector.constructor.name} failed for ${url}:`, error instanceof Error ? error.message : String(error));
                continue;
            }
        }
        // If all detectors failed, return unknown classification
        return this.createUnknownClassification(url);
    }
    /**
     * Gets all possible classifications for a URL using all capable detectors
     * @param url The URL to analyze
     * @returns Promise resolving to array of classifications
     */
    async detectAll(url) {
        const capableDetectors = this.detectors.filter(detector => detector.canHandle(url));
        const results = [];
        for (const detector of capableDetectors) {
            try {
                const classification = await detector.detect(url);
                results.push({
                    detector: detector.constructor.name,
                    classification,
                    success: true
                });
            }
            catch (error) {
                results.push({
                    detector: detector.constructor.name,
                    classification: null,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        return results.sort((a, b) => {
            if (a.success !== b.success) {
                return a.success ? -1 : 1;
            }
            return (b.classification?.confidence || 0) - (a.classification?.confidence || 0);
        });
    }
    /**
     * Gets the best classification from multiple detection attempts
     * @param url The URL to analyze
     * @returns Promise resolving to the best classification
     */
    async detectBest(url) {
        const results = await this.detectAll(url);
        const successfulResults = results.filter(r => r.success && r.classification);
        if (successfulResults.length === 0) {
            return this.createUnknownClassification(url);
        }
        // Return the classification with highest confidence
        const bestResult = successfulResults[0];
        return bestResult.classification;
    }
    /**
     * Gets information about registered detectors
     * @returns Array of detector information
     */
    getDetectorInfo() {
        return this.detectors.map(detector => ({
            name: detector.constructor.name,
            priority: detector.getPriority?.() || 1,
            supportedTypes: detector.getSupportedTypes?.() || []
        }));
    }
    /**
     * Gets count of registered detectors
     * @returns Number of registered detectors
     */
    getDetectorCount() {
        return this.detectors.length;
    }
    /**
     * Clears all registered detectors
     */
    clear() {
        this.detectors.length = 0;
    }
    sortDetectorsByPriority() {
        this.detectors.sort((a, b) => {
            const priorityA = a.getPriority?.() || 1;
            const priorityB = b.getPriority?.() || 1;
            return priorityA - priorityB; // Lower number = higher priority
        });
    }
    createUnknownClassification(url) {
        return {
            type: IUrlDetector_1.ContentType.UNKNOWN,
            mimeType: 'application/octet-stream',
            metadata: {
                url,
                detectionMethod: 'fallback',
                reason: 'No capable detectors found'
            },
            confidence: 0
        };
    }
}
exports.UrlDetectorRegistry = UrlDetectorRegistry;
//# sourceMappingURL=UrlDetectorRegistry.js.map