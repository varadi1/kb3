/**
 * Interface for tags used to group and categorize URLs
 * Single Responsibility: Defines the structure and behavior of a tag
 * Interface Segregation: Minimal interface focused only on tag properties
 */

export interface ITag {
  /**
   * Unique identifier for the tag
   */
  id: string;

  /**
   * Name of the tag (must be unique)
   */
  name: string;

  /**
   * Optional parent tag ID for hierarchical organization
   */
  parentId?: string;

  /**
   * Date when the tag was created
   */
  createdAt: Date;

  /**
   * Optional description for the tag
   */
  description?: string;

  /**
   * Optional color for visual representation (hex format)
   */
  color?: string;

  /**
   * Number of URLs associated with this tag
   */
  urlCount?: number;
}

/**
 * Interface for creating a new tag
 */
export interface TagCreateInput {
  name: string;
  parentId?: string;
  description?: string;
  color?: string;
}

/**
 * Interface for updating an existing tag
 */
export interface TagUpdateInput {
  name?: string;
  parentId?: string | null;
  description?: string;
  color?: string;
}

/**
 * Filter options for querying tags
 */
export interface TagFilter {
  /**
   * Filter by parent tag ID (null for root tags)
   */
  parentId?: string | null;

  /**
   * Search by name (partial match)
   */
  nameContains?: string;

  /**
   * Filter tags with at least this many URLs
   */
  minUrlCount?: number;

  /**
   * Limit the number of results
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;
}