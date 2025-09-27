/**
 * Interface for managing tags in the knowledge base system
 * Single Responsibility: Manages tag lifecycle and operations
 * Dependency Inversion: Abstracts tag management operations
 */

import { ITag, TagCreateInput, TagUpdateInput, TagFilter } from './ITag';

export interface ITagManager {
  /**
   * Creates a new tag
   * @param input Tag creation input
   * @returns Promise resolving to the created tag
   */
  createTag(input: TagCreateInput): Promise<ITag>;

  /**
   * Gets a tag by its ID
   * @param id Tag ID
   * @returns Promise resolving to the tag or null if not found
   */
  getTag(id: string): Promise<ITag | null>;

  /**
   * Gets a tag by its name
   * @param name Tag name
   * @returns Promise resolving to the tag or null if not found
   */
  getTagByName(name: string): Promise<ITag | null>;

  /**
   * Updates an existing tag
   * @param id Tag ID
   * @param input Update input
   * @returns Promise resolving to the updated tag
   */
  updateTag(id: string, input: TagUpdateInput): Promise<ITag>;

  /**
   * Deletes a tag
   * @param id Tag ID
   * @param deleteChildren If true, deletes child tags; if false, promotes children to root
   * @returns Promise resolving to success status
   */
  deleteTag(id: string, deleteChildren?: boolean): Promise<boolean>;

  /**
   * Lists tags with optional filtering
   * @param filter Optional filter criteria
   * @returns Promise resolving to array of tags
   */
  listTags(filter?: TagFilter): Promise<ITag[]>;

  /**
   * Gets all child tags of a parent tag
   * @param parentId Parent tag ID
   * @param recursive If true, gets all descendants recursively
   * @returns Promise resolving to array of child tags
   */
  getChildTags(parentId: string, recursive?: boolean): Promise<ITag[]>;

  /**
   * Gets the full hierarchy path for a tag (from root to tag)
   * @param id Tag ID
   * @returns Promise resolving to array of tags from root to specified tag
   */
  getTagPath(id: string): Promise<ITag[]>;

  /**
   * Validates if a tag name is available
   * @param name Tag name to check
   * @param excludeId Optional ID to exclude (for updates)
   * @returns Promise resolving to true if name is available
   */
  isNameAvailable(name: string, excludeId?: string): Promise<boolean>;

  /**
   * Ensures a set of tags exist, creating them if necessary
   * @param tagNames Array of tag names
   * @returns Promise resolving to array of tag IDs
   */
  ensureTagsExist(tagNames: string[]): Promise<string[]>;
}