/**
 * Base class implementing common URL detection functionality
 * Template Method Pattern + Single Responsibility Principle
 */

import { IUrlDetector, UrlClassification, ContentType } from '../interfaces/IUrlDetector';

export abstract class BaseUrlDetector implements IUrlDetector {
  protected readonly supportedTypes: ContentType[];
  protected readonly priority: number;

  constructor(supportedTypes: ContentType[], priority: number = 1) {
    this.supportedTypes = supportedTypes;
    this.priority = priority;
  }

  abstract canHandle(url: string): boolean;

  async detect(url: string): Promise<UrlClassification> {
    if (!this.canHandle(url)) {
      throw new Error(`Cannot handle URL: ${url}`);
    }

    return await this.performDetection(url);
  }

  protected abstract performDetection(url: string): Promise<UrlClassification>;

  protected validateUrl(url: string): URL {
    try {
      return new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  protected extractFileExtension(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const lastDot = pathname.lastIndexOf('.');

      if (lastDot === -1 || lastDot === pathname.length - 1) {
        return null;
      }

      return pathname.substring(lastDot + 1).toLowerCase();
    } catch {
      return null;
    }
  }

  protected createClassification(
    type: ContentType,
    mimeType: string,
    confidence: number,
    metadata: Record<string, any> = {},
    size?: number
  ): UrlClassification {
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

  getPriority(): number {
    return this.priority;
  }

  getSupportedTypes(): ContentType[] {
    return [...this.supportedTypes];
  }
}