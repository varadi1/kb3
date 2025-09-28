/**
 * Registry for URL detectors
 * Single Responsibility: Manages and coordinates multiple detectors
 * Open/Closed Principle: Easy to add new detectors
 * Dependency Inversion: Depends on IUrlDetector abstraction
 */
import { IUrlDetector, UrlClassification, ContentType } from '../interfaces/IUrlDetector';
export declare class UrlDetectorRegistry implements IUrlDetector {
    private readonly detectors;
    constructor(detectors?: IUrlDetector[]);
    /**
     * Checks if any detector can handle the URL
     * @param url The URL to check
     * @returns true if at least one detector can handle it
     */
    canHandle(url: string): boolean;
    /**
     * Adds a new detector to the registry
     * @param detector The detector to add
     */
    addDetector(detector: IUrlDetector): void;
    /**
     * Removes a detector from the registry
     * @param detector The detector to remove
     */
    removeDetector(detector: IUrlDetector): boolean;
    /**
     * Detects URL content type using the best available detector
     * @param url The URL to detect
     * @returns Promise resolving to URL classification
     */
    detect(url: string): Promise<UrlClassification>;
    /**
     * Gets all possible classifications for a URL using all capable detectors
     * @param url The URL to analyze
     * @returns Promise resolving to array of classifications
     */
    detectAll(url: string): Promise<DetectionResult[]>;
    /**
     * Gets the best classification from multiple detection attempts
     * @param url The URL to analyze
     * @returns Promise resolving to the best classification
     */
    detectBest(url: string): Promise<UrlClassification>;
    /**
     * Gets information about registered detectors
     * @returns Array of detector information
     */
    getDetectorInfo(): DetectorInfo[];
    /**
     * Gets count of registered detectors
     * @returns Number of registered detectors
     */
    getDetectorCount(): number;
    /**
     * Clears all registered detectors
     */
    clear(): void;
    private sortDetectorsByPriority;
    private createUnknownClassification;
}
export interface DetectionResult {
    detector: string;
    classification: UrlClassification | null;
    success: boolean;
    error?: string;
}
export interface DetectorInfo {
    name: string;
    priority: number;
    supportedTypes: ContentType[];
}
//# sourceMappingURL=UrlDetectorRegistry.d.ts.map