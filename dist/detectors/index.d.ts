/**
 * Central export for all URL detectors
 * Facilitates easy import and dependency injection
 */
export { BaseUrlDetector } from './BaseUrlDetector';
export { ExtensionBasedDetector } from './ExtensionBasedDetector';
export { HeaderBasedDetector } from './HeaderBasedDetector';
export { ContentBasedDetector } from './ContentBasedDetector';
export { UrlDetectorRegistry, DetectionResult, DetectorInfo } from './UrlDetectorRegistry';
import { UrlDetectorRegistry } from './UrlDetectorRegistry';
export declare function createDefaultDetectorRegistry(): UrlDetectorRegistry;
//# sourceMappingURL=index.d.ts.map