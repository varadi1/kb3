/**
 * In-memory knowledge store implementation for testing purposes
 * This is a simplified version used only for test migrations
 */

import { BaseKnowledgeStore } from './BaseKnowledgeStore';
import {
  KnowledgeEntry,
  SearchCriteria,
  StoreStats,
  ProcessingStatus
} from '../interfaces/IKnowledgeStore';

export class MemoryKnowledgeStore extends BaseKnowledgeStore {
  private entries: Map<string, KnowledgeEntry> = new Map();

  async store(entry: KnowledgeEntry): Promise<string> {
    this.validateEntry(entry);
    this.entries.set(entry.id, entry);
    return entry.id;
  }

  async retrieve(id: string): Promise<KnowledgeEntry | null> {
    return this.entries.get(id) || null;
  }

  async update(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) return false;

    const updatedEntry: KnowledgeEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date()
    };

    this.validateEntry(updatedEntry);
    this.entries.set(id, updatedEntry);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  async search(criteria: SearchCriteria): Promise<KnowledgeEntry[]> {
    this.validateSearchCriteria(criteria);

    let results = Array.from(this.entries.values())
      .filter(entry => this.matchesSearchCriteria(entry, criteria));

    // Sort results
    results = this.sortEntries(
      results,
      criteria.sortBy,
      criteria.sortOrder
    );

    // Paginate results
    results = this.paginateEntries(
      results,
      criteria.offset,
      criteria.limit
    );

    return results;
  }

  async getStats(): Promise<StoreStats> {
    const entries = Array.from(this.entries.values());

    const totalEntries = entries.length;
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

    const contentTypes: Record<string, number> = {};
    const processingStatusCounts: Record<ProcessingStatus, number> = {
      [ProcessingStatus.PENDING]: 0,
      [ProcessingStatus.PROCESSING]: 0,
      [ProcessingStatus.COMPLETED]: 0,
      [ProcessingStatus.FAILED]: 0
    };

    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    for (const entry of entries) {
      // Count content types
      contentTypes[entry.contentType] = (contentTypes[entry.contentType] || 0) + 1;

      // Count processing statuses
      processingStatusCounts[entry.processingStatus]++;

      // Track oldest/newest
      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      if (!newestEntry || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    }

    return {
      totalEntries,
      totalSize,
      contentTypes,
      processingStatus: processingStatusCounts,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clear all entries from memory
   */
  async clear(): Promise<void> {
    this.entries.clear();
  }

  /**
   * Get all entries (for testing)
   */
  getAllEntries(): Map<string, KnowledgeEntry> {
    return new Map(this.entries);
  }
}