/**
 * Base class for knowledge stores
 * Template Method Pattern + Single Responsibility Principle
 */

import {
  IKnowledgeStore,
  KnowledgeEntry,
  SearchCriteria,
  StoreStats,
  ProcessingStatus,
  SortField,
  SortOrder
} from '../interfaces/IKnowledgeStore';
import * as crypto from 'crypto';

export abstract class BaseKnowledgeStore implements IKnowledgeStore {
  protected readonly indexedFields: Set<string>;

  constructor(indexedFields: string[] = ['url', 'contentType', 'tags', 'title']) {
    this.indexedFields = new Set(indexedFields);
  }

  abstract store(entry: KnowledgeEntry): Promise<string>;
  abstract retrieve(id: string): Promise<KnowledgeEntry | null>;
  abstract update(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean>;
  abstract delete(id: string): Promise<boolean>;
  abstract search(criteria: SearchCriteria): Promise<KnowledgeEntry[]>;
  abstract getStats(): Promise<StoreStats>;

  /**
   * Creates a new knowledge entry with default values
   * @param url The source URL
   * @param title The entry title
   * @param contentType The content type
   * @param text The processed text content
   * @param metadata Additional metadata
   * @returns A new knowledge entry
   */
  protected createKnowledgeEntry(
    url: string,
    title: string,
    contentType: string,
    text: string,
    metadata: Record<string, any> = {},
    tags: string[] = []
  ): KnowledgeEntry {
    const now = new Date();
    const id = this.generateId(url, contentType, now);
    const checksum = this.calculateChecksum(text);

    return {
      id,
      url,
      title,
      contentType,
      text,
      metadata,
      tags,
      createdAt: now,
      updatedAt: now,
      size: Buffer.byteLength(text, 'utf8'),
      checksum,
      processingStatus: ProcessingStatus.COMPLETED
    };
  }

  /**
   * Validates a knowledge entry
   * @param entry The entry to validate
   * @throws Error if validation fails
   */
  protected validateEntry(entry: KnowledgeEntry): void {
    if (!entry.id || entry.id.trim().length === 0) {
      throw new Error('Entry ID is required');
    }

    if (!entry.url || entry.url.trim().length === 0) {
      throw new Error('Entry URL is required');
    }

    if (!entry.title || entry.title.trim().length === 0) {
      throw new Error('Entry title is required');
    }

    if (!entry.contentType || entry.contentType.trim().length === 0) {
      throw new Error('Entry content type is required');
    }

    if (entry.text === null || entry.text === undefined) {
      throw new Error('Entry text is required');
    }

    try {
      new URL(entry.url);
    } catch {
      throw new Error('Entry URL must be valid');
    }

    if (!Object.values(ProcessingStatus).includes(entry.processingStatus)) {
      throw new Error('Invalid processing status');
    }

    if (entry.size < 0) {
      throw new Error('Entry size cannot be negative');
    }

    if (!Array.isArray(entry.tags)) {
      throw new Error('Entry tags must be an array');
    }

    if (!entry.createdAt || !(entry.createdAt instanceof Date)) {
      throw new Error('Entry createdAt must be a valid Date');
    }

    if (!entry.updatedAt || !(entry.updatedAt instanceof Date)) {
      throw new Error('Entry updatedAt must be a valid Date');
    }
  }

  /**
   * Validates search criteria
   * @param criteria The criteria to validate
   * @throws Error if validation fails
   */
  protected validateSearchCriteria(criteria: SearchCriteria): void {
    if (criteria.limit !== undefined && criteria.limit < 0) {
      throw new Error('Search limit cannot be negative');
    }

    if (criteria.offset !== undefined && criteria.offset < 0) {
      throw new Error('Search offset cannot be negative');
    }

    if (criteria.sortBy !== undefined && !Object.values(SortField).includes(criteria.sortBy)) {
      throw new Error('Invalid sort field');
    }

    if (criteria.sortOrder !== undefined && !Object.values(SortOrder).includes(criteria.sortOrder)) {
      throw new Error('Invalid sort order');
    }

    if (criteria.dateRange) {
      const { from, to } = criteria.dateRange;
      if (from && to && from > to) {
        throw new Error('Date range from cannot be after to');
      }
    }

    if (criteria.tags && !Array.isArray(criteria.tags)) {
      throw new Error('Search tags must be an array');
    }
  }

  /**
   * Generates a unique ID for a knowledge entry
   * @param url The source URL
   * @param contentType The content type
   * @param timestamp The creation timestamp
   * @returns A unique entry ID
   */
  protected generateId(url: string, contentType: string, timestamp: Date): string {
    const data = `${url}:${contentType}:${timestamp.getTime()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Calculates a checksum for content
   * @param content The content to checksum
   * @returns Content checksum
   */
  protected calculateChecksum(content: string): string {
    return crypto.createHash('md5').update(content, 'utf8').digest('hex');
  }

  /**
   * Normalizes text for search
   * @param text The text to normalize
   * @returns Normalized text
   */
  protected normalizeSearchText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace non-word chars with spaces
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  /**
   * Extracts search terms from a query
   * @param query The search query
   * @returns Array of search terms
   */
  protected extractSearchTerms(query: string): string[] {
    const normalized = this.normalizeSearchText(query);
    return normalized
      .split(' ')
      .filter(term => term.length >= 2) // Filter out single characters
      .filter((term, index, array) => array.indexOf(term) === index); // Remove duplicates
  }

  /**
   * Matches entry against search criteria
   * @param entry The entry to match
   * @param criteria The search criteria
   * @returns true if entry matches criteria
   */
  protected matchesSearchCriteria(entry: KnowledgeEntry, criteria: SearchCriteria): boolean {
    // Text query matching
    if (criteria.query) {
      const searchTerms = this.extractSearchTerms(criteria.query);
      const searchableText = this.normalizeSearchText(
        `${entry.title} ${entry.text} ${entry.tags.join(' ')}`
      );

      const hasAllTerms = searchTerms.every(term => searchableText.includes(term));
      if (!hasAllTerms) return false;
    }

    // Content type matching
    if (criteria.contentType && entry.contentType !== criteria.contentType) {
      return false;
    }

    // Tags matching
    if (criteria.tags && criteria.tags.length > 0) {
      const hasAnyTag = criteria.tags.some(tag => entry.tags.includes(tag));
      if (!hasAnyTag) return false;
    }

    // Date range matching
    if (criteria.dateRange) {
      const { from, to } = criteria.dateRange;
      if (from && entry.createdAt < from) return false;
      if (to && entry.createdAt > to) return false;
    }

    return true;
  }

  /**
   * Sorts entries based on criteria
   * @param entries The entries to sort
   * @param sortBy Sort field
   * @param sortOrder Sort order
   * @returns Sorted entries
   */
  protected sortEntries(
    entries: KnowledgeEntry[],
    sortBy: SortField = SortField.CREATED_AT,
    sortOrder: SortOrder = SortOrder.DESC
  ): KnowledgeEntry[] {
    return entries.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case SortField.CREATED_AT:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case SortField.UPDATED_AT:
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case SortField.TITLE:
          comparison = a.title.localeCompare(b.title);
          break;
        case SortField.SIZE:
          comparison = a.size - b.size;
          break;
        case SortField.RELEVANCE:
          // For relevance, we could implement scoring based on search criteria
          // For now, fallback to created date
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === SortOrder.ASC ? comparison : -comparison;
    });
  }

  /**
   * Applies pagination to entries
   * @param entries The entries to paginate
   * @param offset The offset
   * @param limit The limit
   * @returns Paginated entries
   */
  protected paginateEntries(
    entries: KnowledgeEntry[],
    offset: number = 0,
    limit?: number
  ): KnowledgeEntry[] {
    if (offset >= entries.length) return [];

    const start = Math.max(0, offset);
    const end = limit ? start + limit : undefined;

    return entries.slice(start, end);
  }

  /**
   * Gets the indexed fields for this store
   * @returns Set of indexed field names
   */
  getIndexedFields(): Set<string> {
    return new Set(this.indexedFields);
  }

  /**
   * Adds a field to be indexed
   * @param field The field name to index
   */
  addIndexedField(field: string): void {
    this.indexedFields.add(field);
  }

  /**
   * Removes a field from being indexed
   * @param field The field name to remove from index
   */
  removeIndexedField(field: string): void {
    this.indexedFields.delete(field);
  }
}