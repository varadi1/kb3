/**
 * Base class implementing common URL detection functionality
 * Template Method Pattern + Single Responsibility Principle
 */
import { IUrlDetector, UrlClassification, ContentType } from '../interfaces/IUrlDetector';
export declare abstract class BaseUrlDetector implements IUrlDetector {
    protected readonly supportedTypes: ContentType[];
    protected readonly priority: number;
    constructor(supportedTypes: ContentType[], priority?: number);
    abstract canHandle(url: string): boolean;
    detect(url: string): Promise<UrlClassification>;
    protected abstract performDetection(url: string): Promise<UrlClassification>;
    protected validateUrl(url: string): URL;
    protected extractFileExtension(url: string): string | null;
    protected createClassification(type: ContentType, mimeType: string, confidence: number, metadata?: Record<string, any>, size?: number): UrlClassification;
    getPriority(): number;
    getSupportedTypes(): ContentType[];
}
//# sourceMappingURL=BaseUrlDetector.d.ts.map