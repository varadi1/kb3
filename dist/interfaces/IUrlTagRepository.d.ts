/**
 * Interface for managing URL-tag relationships
 * Single Responsibility: Manages the many-to-many relationship between URLs and tags
 * Interface Segregation: Focused interface for URL-tag associations
 */
import { ITag } from './ITag';
export interface IUrlTagRepository {
    /**
     * Adds tags to a URL
     * @param urlId URL record ID
     * @param tagIds Array of tag IDs to add
     * @returns Promise resolving to success status
     */
    addTagsToUrl(urlId: string, tagIds: string[]): Promise<boolean>;
    /**
     * Removes tags from a URL
     * @param urlId URL record ID
     * @param tagIds Array of tag IDs to remove
     * @returns Promise resolving to success status
     */
    removeTagsFromUrl(urlId: string, tagIds: string[]): Promise<boolean>;
    /**
     * Gets all tags for a URL
     * @param urlId URL record ID
     * @returns Promise resolving to array of tags
     */
    getTagsForUrl(urlId: string): Promise<ITag[]>;
    /**
     * Gets all URL IDs with a specific tag
     * @param tagId Tag ID
     * @param includeChildren If true, includes URLs with child tags
     * @returns Promise resolving to array of URL IDs
     */
    getUrlsWithTag(tagId: string, includeChildren?: boolean): Promise<string[]>;
    /**
     * Gets all URL IDs with any of the specified tags
     * @param tagIds Array of tag IDs
     * @param requireAll If true, URLs must have all tags; if false, URLs with any tag
     * @returns Promise resolving to array of URL IDs
     */
    getUrlsWithTags(tagIds: string[], requireAll?: boolean): Promise<string[]>;
    /**
     * Replaces all tags for a URL
     * @param urlId URL record ID
     * @param tagIds New array of tag IDs (replaces existing tags)
     * @returns Promise resolving to success status
     */
    setTagsForUrl(urlId: string, tagIds: string[]): Promise<boolean>;
    /**
     * Removes all tags from a URL
     * @param urlId URL record ID
     * @returns Promise resolving to success status
     */
    clearTagsForUrl(urlId: string): Promise<boolean>;
    /**
     * Gets count of URLs for each tag
     * @param tagIds Optional array of tag IDs to get counts for (all tags if not provided)
     * @returns Promise resolving to map of tag ID to URL count
     */
    getTagUrlCounts(tagIds?: string[]): Promise<Map<string, number>>;
    /**
     * Checks if a URL has a specific tag
     * @param urlId URL record ID
     * @param tagId Tag ID
     * @returns Promise resolving to true if URL has the tag
     */
    urlHasTag(urlId: string, tagId: string): Promise<boolean>;
    /**
     * Gets URLs with tags by tag names
     * @param tagNames Array of tag names
     * @param requireAll If true, URLs must have all tags; if false, URLs with any tag
     * @returns Promise resolving to array of URL IDs
     */
    getUrlsWithTagNames(tagNames: string[], requireAll?: boolean): Promise<string[]>;
}
//# sourceMappingURL=IUrlTagRepository.d.ts.map