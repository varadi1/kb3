/**
 * Content change detector implementation using URL repository
 * Single Responsibility: Detects if content at URLs has changed
 * Dependency Inversion: Depends on IUrlRepository abstraction
 */

import { IContentChangeDetector, ContentChangeResult } from '../interfaces/IContentChangeDetector';
import { IUrlRepository } from '../interfaces/IUrlRepository';

export class ContentChangeDetector implements IContentChangeDetector {
  constructor(private readonly urlRepository: IUrlRepository) {}

  /**
   * Check if content at a URL has changed since last check
   */
  async hasContentChanged(
    url: string,
    currentHash: string,
    metadata?: Record<string, any>
  ): Promise<ContentChangeResult> {
    const urlInfo = await this.urlRepository.getUrlInfo(url);

    if (!urlInfo || !urlInfo.contentHash) {
      // Never processed before, so it's "new" content
      return {
        hasChanged: true,
        currentHash,
        metadata
      };
    }

    const hasChanged = urlInfo.contentHash !== currentHash;

    return {
      hasChanged,
      previousHash: urlInfo.contentHash,
      currentHash,
      lastChecked: urlInfo.lastChecked,
      metadata: {
        etag: metadata?.etag,
        lastModified: metadata?.lastModified,
        contentLength: metadata?.contentLength,
        ...metadata
      }
    };
  }

  /**
   * Record that content was processed
   */
  async recordContentProcessed(
    url: string,
    contentHash: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const urlInfo = await this.urlRepository.getUrlInfo(url);

    if (urlInfo) {
      // Update existing record with new hash
      await this.urlRepository.updateHash(urlInfo.id, contentHash);
    } else {
      // Register new URL with hash
      await this.urlRepository.register(url, {
        contentHash,
        ...metadata
      });
    }
  }

  /**
   * Get the last known hash for a URL
   */
  async getLastKnownHash(url: string): Promise<string | null> {
    const urlInfo = await this.urlRepository.getUrlInfo(url);
    return urlInfo?.contentHash || null;
  }

  /**
   * Clear the change history for a URL
   */
  async clearHistory(url: string): Promise<void> {
    const urlInfo = await this.urlRepository.getUrlInfo(url);
    if (urlInfo) {
      await this.urlRepository.remove(urlInfo.id);
    }
  }
}