# KB3 Functions Reference

## Tag Management Functions

This document provides a comprehensive reference for all tag-related functions in the KB3 system.

### KnowledgeBaseOrchestratorWithTags

The main orchestrator with tag support extends the base orchestrator with tag management capabilities.

#### Constructor

```typescript
constructor(
  urlDetector: IUrlDetector,
  contentFetcher: IContentFetcher,
  contentProcessor: IContentProcessor,
  knowledgeStore: IKnowledgeStore,
  fileStorage: IFileStorage,
  urlRepository?: SqlUrlRepositoryWithTags,
  contentChangeDetector?: IContentChangeDetector
)
```

#### Tag Management Methods

##### createTag

Creates a new tag in the system.

```typescript
async createTag(
  name: string,
  parentName?: string,
  description?: string
): Promise<ITag>
```

**Parameters:**
- `name`: Unique name for the tag
- `parentName`: Optional parent tag name for hierarchical organization
- `description`: Optional description of the tag

**Returns:** The created tag object

**Example:**
```typescript
const tag = await kb.createTag('documentation', undefined, 'All documentation resources');
const childTag = await kb.createTag('api-docs', 'documentation', 'API documentation');
```

##### listTags

Lists all tags in the system.

```typescript
async listTags(): Promise<ITag[]>
```

**Returns:** Array of all tags

##### deleteTag

Deletes a tag from the system.

```typescript
async deleteTag(
  tagName: string,
  deleteChildren?: boolean
): Promise<boolean>
```

**Parameters:**
- `tagName`: Name of the tag to delete
- `deleteChildren`: If true, deletes all child tags; if false, promotes children to root level

**Returns:** True if deletion was successful

##### getTagHierarchy

Gets the complete hierarchy path for a tag.

```typescript
async getTagHierarchy(tagName: string): Promise<ITag[]>
```

**Parameters:**
- `tagName`: Name of the tag

**Returns:** Array of tags from root to the specified tag

#### URL-Tag Relationship Methods

##### processUrlWithTags

Processes a single URL with associated tags.

```typescript
async processUrlWithTags(
  url: string,
  options: ProcessingOptionsWithTags = {}
): Promise<ProcessingResult>
```

**Parameters:**
- `url`: The URL to process
- `options`: Processing options including tags array

**Example:**
```typescript
const result = await kb.processUrlWithTags('https://example.com', {
  tags: ['important', 'documentation'],
  timeout: 30000
});
```

##### processUrlsWithTags

Processes multiple URLs with their respective tags.

```typescript
async processUrlsWithTags(
  urlsWithTags: UrlWithTags[],
  globalOptions: ProcessingOptions = {}
): Promise<ProcessingResult[]>
```

**Parameters:**
- `urlsWithTags`: Array of objects containing `url` and `tags`
- `globalOptions`: Global processing options applied to all URLs

**Example:**
```typescript
const results = await kb.processUrlsWithTags([
  { url: 'https://api.example.com/v1', tags: ['api', 'v1'] },
  { url: 'https://api.example.com/v2', tags: ['api', 'v2'] },
  { url: 'https://docs.example.com', tags: ['documentation'] }
]);
```

##### processUrlsByTags

Processes all URLs that have specific tags.

```typescript
async processUrlsByTags(
  tagNames: string[],
  options: BatchProcessingByTagOptions = {}
): Promise<ProcessingResult[]>
```

**Parameters:**
- `tagNames`: Array of tag names to filter URLs
- `options`: Batch processing options
  - `includeChildTags`: Include URLs with child tags
  - `requireAllTags`: URLs must have ALL specified tags (AND condition)
  - Standard processing options (concurrency, timeout, etc.)

**Example:**
```typescript
// Process all URLs with 'api' tag
const apiResults = await kb.processUrlsByTags(['api']);

// Process URLs with BOTH 'tutorial' AND 'beginner' tags
const beginnerTutorials = await kb.processUrlsByTags(
  ['tutorial', 'beginner'],
  { requireAllTags: true }
);

// Process all documentation including child tags
const allDocs = await kb.processUrlsByTags(
  ['documentation'],
  { includeChildTags: true }
);
```

##### addTagsToUrl

Adds tags to an existing URL.

```typescript
async addTagsToUrl(url: string, tagNames: string[]): Promise<boolean>
```

**Parameters:**
- `url`: The URL to add tags to
- `tagNames`: Array of tag names to add

**Returns:** True if tags were successfully added

##### removeTagsFromUrl

Removes tags from a URL.

```typescript
async removeTagsFromUrl(url: string, tagNames: string[]): Promise<boolean>
```

**Parameters:**
- `url`: The URL to remove tags from
- `tagNames`: Array of tag names to remove

**Returns:** True if tags were successfully removed

##### getUrlTags

Gets all tags associated with a URL.

```typescript
async getUrlTags(url: string): Promise<ITag[]>
```

**Parameters:**
- `url`: The URL to get tags for

**Returns:** Array of tags associated with the URL

### SqlTagManager

Core tag management implementation with SQL storage.

#### Methods

##### createTag

```typescript
async createTag(input: TagCreateInput): Promise<ITag>
```

##### getTag

```typescript
async getTag(id: string): Promise<ITag | null>
```

##### getTagByName

```typescript
async getTagByName(name: string): Promise<ITag | null>
```

##### updateTag

```typescript
async updateTag(id: string, input: TagUpdateInput): Promise<ITag>
```

##### deleteTag

```typescript
async deleteTag(id: string, deleteChildren?: boolean): Promise<boolean>
```

##### listTags

```typescript
async listTags(filter?: TagFilter): Promise<ITag[]>
```

**Filter Options:**
- `parentId`: Filter by parent tag ID (null for root tags)
- `nameContains`: Search by partial name match
- `minUrlCount`: Minimum number of associated URLs
- `limit`: Maximum results
- `offset`: Pagination offset

##### getChildTags

```typescript
async getChildTags(parentId: string, recursive?: boolean): Promise<ITag[]>
```

##### getTagPath

```typescript
async getTagPath(id: string): Promise<ITag[]>
```

##### isNameAvailable

```typescript
async isNameAvailable(name: string, excludeId?: string): Promise<boolean>
```

##### ensureTagsExist

Creates tags if they don't already exist.

```typescript
async ensureTagsExist(tagNames: string[]): Promise<string[]>
```

**Returns:** Array of tag IDs (existing or newly created)

### SqlUrlTagRepository

Manages the many-to-many relationship between URLs and tags.

#### Methods

##### addTagsToUrl

```typescript
async addTagsToUrl(urlId: string, tagIds: string[]): Promise<boolean>
```

##### removeTagsFromUrl

```typescript
async removeTagsFromUrl(urlId: string, tagIds: string[]): Promise<boolean>
```

##### getTagsForUrl

```typescript
async getTagsForUrl(urlId: string): Promise<ITag[]>
```

##### getUrlsWithTag

```typescript
async getUrlsWithTag(tagId: string, includeChildren?: boolean): Promise<string[]>
```

##### getUrlsWithTags

```typescript
async getUrlsWithTags(tagIds: string[], requireAll?: boolean): Promise<string[]>
```

##### setTagsForUrl

Replaces all tags for a URL.

```typescript
async setTagsForUrl(urlId: string, tagIds: string[]): Promise<boolean>
```

##### clearTagsForUrl

```typescript
async clearTagsForUrl(urlId: string): Promise<boolean>
```

##### getTagUrlCounts

```typescript
async getTagUrlCounts(tagIds?: string[]): Promise<Map<string, number>>
```

##### urlHasTag

```typescript
async urlHasTag(urlId: string, tagId: string): Promise<boolean>
```

##### getUrlsWithTagNames

```typescript
async getUrlsWithTagNames(tagNames: string[], requireAll?: boolean): Promise<string[]>
```

### SqlUrlRepositoryWithTags

Enhanced URL repository with tag support.

#### Methods

##### registerWithTags

Registers a URL with initial tags.

```typescript
async registerWithTags(url: string, metadata?: UrlMetadataWithTags): Promise<string>
```

**Metadata includes:**
- `tags`: Array of tag names
- Standard URL metadata fields

##### getUrlInfoWithTags

```typescript
async getUrlInfoWithTags(url: string): Promise<UrlRecordWithTags | null>
```

##### getUrlsByTags

```typescript
async getUrlsByTags(tagNames: string[], requireAll?: boolean): Promise<UrlRecordWithTags[]>
```

##### addTagsToUrl

```typescript
async addTagsToUrl(url: string, tagNames: string[]): Promise<boolean>
```

##### removeTagsFromUrl

```typescript
async removeTagsFromUrl(url: string, tagNames: string[]): Promise<boolean>
```

##### setUrlTags

```typescript
async setUrlTags(url: string, tagNames: string[]): Promise<boolean>
```

##### getUrlTags

```typescript
async getUrlTags(url: string): Promise<ITag[]>
```

##### batchRegisterWithTags

```typescript
async batchRegisterWithTags(
  urlsWithTags: Array<{
    url: string;
    tags?: string[];
    metadata?: UrlMetadata
  }>
): Promise<string[]>
```

## Data Types

### ITag Interface

```typescript
interface ITag {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  description?: string;
  color?: string;
  urlCount?: number;
}
```

### TagCreateInput

```typescript
interface TagCreateInput {
  name: string;
  parentId?: string;
  description?: string;
  color?: string;
}
```

### TagUpdateInput

```typescript
interface TagUpdateInput {
  name?: string;
  parentId?: string | null;
  description?: string;
  color?: string;
}
```

### TagFilter

```typescript
interface TagFilter {
  parentId?: string | null;
  nameContains?: string;
  minUrlCount?: number;
  limit?: number;
  offset?: number;
}
```

### UrlWithTags

```typescript
interface UrlWithTags {
  url: string;
  tags?: string[];
  metadata?: UrlMetadataWithTags;
}
```

### ProcessingOptionsWithTags

```typescript
interface ProcessingOptionsWithTags extends ProcessingOptions {
  tags?: string[];
}
```

### BatchProcessingByTagOptions

```typescript
interface BatchProcessingByTagOptions extends ProcessingOptions {
  includeChildTags?: boolean;
  requireAllTags?: boolean;
}
```

## Database Schema

### Tags Table

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  parent_id TEXT,
  description TEXT,
  color TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL
);

CREATE INDEX idx_tag_name ON tags(name);
CREATE INDEX idx_tag_parent ON tags(parent_id);
```

### URL-Tags Relationship Table

```sql
CREATE TABLE url_tags (
  url_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (url_id, tag_id),
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_url_tags_url ON url_tags(url_id);
CREATE INDEX idx_url_tags_tag ON url_tags(tag_id);
```

## Usage Examples

### Complete Workflow Example

```typescript
import { KnowledgeBaseFactoryWithTags } from './src/factory/KnowledgeBaseFactoryWithTags';
import { createDefaultConfiguration } from './src/config/Configuration';

async function organizeAndProcessContent() {
  // Initialize with tag support
  const config = createDefaultConfiguration({
    storage: {
      enableUrlTracking: true,
      urlRepositoryPath: './data/urls.db'
    }
  });

  const kb = KnowledgeBaseFactoryWithTags.createKnowledgeBaseWithTags({
    ...config,
    enableTags: true
  });

  // Set up tag hierarchy
  await kb.createTag('content', undefined, 'All content');
  await kb.createTag('technical', 'content', 'Technical documentation');
  await kb.createTag('api', 'technical', 'API documentation');
  await kb.createTag('tutorials', 'content', 'Tutorial content');
  await kb.createTag('marketing', 'content', 'Marketing materials');

  // Register and tag URLs
  const urls = [
    { url: 'https://api.example.com/docs/v1', tags: ['api', 'v1'] },
    { url: 'https://api.example.com/docs/v2', tags: ['api', 'v2', 'latest'] },
    { url: 'https://blog.example.com/getting-started', tags: ['tutorials', 'beginner'] },
    { url: 'https://blog.example.com/advanced-tips', tags: ['tutorials', 'advanced'] },
    { url: 'https://example.com/case-studies', tags: ['marketing'] }
  ];

  // Process all URLs with tags
  await kb.processUrlsWithTags(urls);

  // Process specific groups
  const apiDocs = await kb.processUrlsByTags(['api'], {
    concurrency: 2,
    timeout: 30000
  });

  // Process all technical content (includes API docs)
  const techContent = await kb.processUrlsByTags(['technical'], {
    includeChildTags: true
  });

  // Find and process beginner tutorials
  const beginnerContent = await kb.processUrlsByTags(
    ['tutorials', 'beginner'],
    { requireAllTags: true }
  );

  // List all tags with hierarchy
  const allTags = await kb.listTags();
  console.log('Tag Structure:', allTags);

  return {
    apiDocs,
    techContent,
    beginnerContent
  };
}
```

### Migration Example

```typescript
// Migrate existing URLs to use tags
async function migrateToTags(kb: KnowledgeBaseOrchestratorWithTags) {
  // Get existing URLs from your source
  const existingUrls = [
    { url: 'https://example.com/api/users', category: 'api' },
    { url: 'https://example.com/guide/intro', category: 'docs' },
    // ... more URLs
  ];

  // Create tags from categories
  const categories = [...new Set(existingUrls.map(u => u.category))];
  for (const category of categories) {
    await kb.createTag(category);
  }

  // Add tags to existing URLs
  for (const item of existingUrls) {
    await kb.addTagsToUrl(item.url, [item.category]);
  }
}
```

## Best Practices

1. **Tag Naming**: Use consistent, descriptive names (e.g., 'api-v1', 'tutorial-beginner')
2. **Hierarchy Design**: Keep hierarchy shallow (2-3 levels max) for maintainability
3. **Tag Reuse**: Reuse existing tags rather than creating duplicates
4. **Batch Operations**: Use tag-based batch processing for similar content types
5. **Performance**: Use `requireAllTags: false` for OR conditions (faster)
6. **Cleanup**: Periodically review and remove unused tags

## Error Handling

All tag operations throw typed errors that can be caught and handled:

```typescript
try {
  await kb.createTag('duplicate-name');
  await kb.createTag('duplicate-name'); // Will throw
} catch (error) {
  if (error.code === 'TAG_EXISTS') {
    console.log('Tag already exists');
  }
}

try {
  await kb.processUrlsByTags(['non-existent-tag']);
} catch (error) {
  if (error.code === 'TAG_NOT_FOUND') {
    console.log('Tag does not exist');
  }
}
```