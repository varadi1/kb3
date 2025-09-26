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
import { ExtensionBasedDetector } from './ExtensionBasedDetector';
import { HeaderBasedDetector } from './HeaderBasedDetector';
import { ContentBasedDetector } from './ContentBasedDetector';

// Factory function for creating default detector registry
export function createDefaultDetectorRegistry(): UrlDetectorRegistry {
  const registry = new UrlDetectorRegistry();

  // Add detectors in priority order (lower number = higher priority)
  registry.addDetector(new ExtensionBasedDetector()); // Priority 1
  registry.addDetector(new HeaderBasedDetector());     // Priority 2
  registry.addDetector(new ContentBasedDetector());    // Priority 3

  return registry;
}