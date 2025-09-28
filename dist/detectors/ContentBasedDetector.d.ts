/**
 * Content-based URL detector
 * Single Responsibility: Detects content type by analyzing actual content
 * Fallback when headers and extensions are unreliable
 */
import { BaseUrlDetector } from './BaseUrlDetector';
import { UrlClassification } from '../interfaces/IUrlDetector';
export declare class ContentBasedDetector extends BaseUrlDetector {
    private readonly sampleSize;
    private readonly timeout;
    private readonly magicNumbers;
    constructor(sampleSize?: number, timeout?: number);
    canHandle(url: string): boolean;
    protected performDetection(url: string): Promise<UrlClassification>;
    private fetchContentSample;
    private analyzeContent;
    private checkMagicNumbers;
    private analyzeTextContent;
    private analyzeStructuredContent;
    private analyzeWebContent;
    private looksLikeCSV;
    private looksLikeJSON;
    private looksLikeXML;
    private initializeMagicNumbers;
    private hexStringToBuffer;
    private bufferStartsWith;
}
//# sourceMappingURL=ContentBasedDetector.d.ts.map