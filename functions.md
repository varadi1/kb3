# KB3 Functions Reference

## Original File Tracking Functions

This document provides a comprehensive reference for all file tracking and tag-related functions in the KB3 system.

### IOriginalFileRepository

The main interface for managing tracked original files.

#### recordOriginalFile

Records a new original file in the tracking system.

```typescript
async recordOriginalFile(fileInfo: OriginalFileInfo): Promise<string>
```

**Parameters:**
- `fileInfo`: Object containing file information
  - `url`: Source URL of the file
  - `filePath`: Storage path of the file
  - `mimeType`: MIME type of the file
  - `size`: File size in bytes
  - `checksum`: SHA256 hash of the file content
  - `scraperUsed`: Optional scraper that downloaded the file
  - `metadata`: Optional additional metadata

**Returns:** Unique file ID

**Example:**
```typescript
const fileId = await repository.recordOriginalFile({
  url: 'https://example.com/document.pdf',
  filePath: '/data/files/document.pdf',
  mimeType: 'application/pdf',
  size: 1024000,
  checksum: 'sha256hash...',
  scraperUsed: 'playwright'
});
```

#### getOriginalFile

Retrieves a specific file by its ID.

```typescript
async getOriginalFile(fileId: string): Promise<OriginalFileRecord | null>
```

**Parameters:**
- `fileId`: Unique file identifier

**Returns:** File record or null if not found

**Note:** This method automatically updates the `accessed_at` timestamp.

#### getOriginalFilesByUrl

Gets all tracked files for a specific URL.

```typescript
async getOriginalFilesByUrl(url: string): Promise<OriginalFileRecord[]>
```

**Parameters:**
- `url`: The source URL

**Returns:** Array of file records (newest first)

#### listOriginalFiles

Lists files with optional filtering.

```typescript
async listOriginalFiles(options?: ListOriginalFilesOptions): Promise<OriginalFileRecord[]>
```

**Parameters:**
- `options`: Optional filter object
  - `url`: Filter by source URL
  - `status`: Filter by file status
  - `mimeType`: Filter by MIME type
  - `scraperUsed`: Filter by scraper
  - `fromDate`: Files created after this date
  - `toDate`: Files created before this date
  - `sortBy`: Sort field ('createdAt', 'size', 'url')
  - `sortOrder`: Sort direction ('asc', 'desc')
  - `limit`: Maximum results
  - `offset`: Pagination offset

**Returns:** Array of file records

**Example:**
```typescript
// Get all PDFs from the last week
const recentPdfs = await repository.listOriginalFiles({
  mimeType: 'application/pdf',
  fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
```

#### updateFileStatus

Updates the status of a file.

```typescript
async updateFileStatus(fileId: string, status: FileStatus): Promise<boolean>
```

**Parameters:**
- `fileId`: File identifier
- `status`: New status ('active', 'archived', 'deleted', 'processing', 'error')

**Returns:** True if update was successful

#### getStatistics

Gets aggregate statistics for all tracked files.

```typescript
async getStatistics(): Promise<OriginalFileStatistics>
```

**Returns:** Statistics object containing:
- `totalFiles`: Total number of files
- `totalSize`: Total size in bytes
- `averageFileSize`: Average file size
- `filesByStatus`: Count by status
- `filesByMimeType`: Count by MIME type
- `filesByScraperUsed`: Count by scraper
- `oldestFile`: Date of oldest file
- `newestFile`: Date of newest file

### KnowledgeBaseFactoryWithFileTracking

Factory for creating knowledge base with file tracking.

#### createKnowledgeBaseWithFileTracking

Creates a knowledge base instance with original file tracking capability.

```typescript
static async createKnowledgeBaseWithFileTracking(
  config: KnowledgeBaseConfigWithFileTracking
): Promise<KnowledgeBaseWithFileTracking>
```

**Parameters:**
- `config`: Configuration object with `originalFileStore` settings

**Returns:** Knowledge base instance with file tracking

**Example:**
```typescript
const kb = await KnowledgeBaseFactoryWithFileTracking.createKnowledgeBaseWithFileTracking({
  storage: {
    knowledgeStore: { type: 'sql', dbPath: './data/knowledge.db' },
    originalFileStore: { type: 'sql', path: './data/original_files.db' }
  }
});
```

### FileStorageWithTracking

Decorator that adds file tracking to any file storage implementation.

#### Constructor

```typescript
constructor(
  baseStorage: IFileStorage,
  originalFileRepository: IOriginalFileRepository
)
```

#### store

Stores a file and tracks it in the repository.

```typescript
async store(
  content: Buffer,
  filename: string,
  options?: StorageOptions
): Promise<string>
```

**Behavior:**
1. Stores file using base storage
2. Calculates SHA256 checksum
3. Records file in original file repository
4. Returns storage path

## Tag Management Functions

This section provides a comprehensive reference for all tag-related functions in the KB3 system.

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
  urlRepository?: SqlUrlRepository,
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

### SqlUrlRepository

URL repository with integrated tag support (enabled via constructor parameter).

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

### Original File Tracking Types

#### OriginalFileInfo

Input type for recording a new file:

```typescript
interface OriginalFileInfo {
  url: string;                  // Source URL
  filePath: string;             // Storage path
  mimeType: string;             // MIME type
  size: number;                 // Size in bytes
  checksum: string;             // SHA256 hash
  scraperUsed?: string;         // Optional scraper name
  metadata?: any;               // Optional metadata
}
```

#### OriginalFileRecord

Complete file record with all fields:

```typescript
interface OriginalFileRecord {
  id: string;                  // Unique identifier
  url: string;                  // Source URL
  filePath: string;             // Storage path
  mimeType: string;             // MIME type
  size: number;                 // Size in bytes
  checksum: string;             // SHA256 hash
  scraperUsed?: string;         // Scraper name
  status: FileStatus;           // Current status
  metadata?: any;               // Additional metadata
  createdAt: Date;              // Creation time
  updatedAt: Date;              // Last update
  accessedAt?: Date;            // Last access
  downloadUrl: string;          // Download URL
}
```

#### FileStatus

File lifecycle status enum:

```typescript
enum FileStatus {
  ACTIVE = 'active',           // Available for use
  ARCHIVED = 'archived',       // Archived
  DELETED = 'deleted',         // Soft deleted
  PROCESSING = 'processing',   // Being processed
  ERROR = 'error'              // Error state
}
```

#### ListOriginalFilesOptions

Filtering options for listing files:

```typescript
interface ListOriginalFilesOptions {
  url?: string;                // Filter by URL
  status?: FileStatus;         // Filter by status
  mimeType?: string;           // Filter by MIME type
  scraperUsed?: string;        // Filter by scraper
  fromDate?: Date;             // Start date
  toDate?: Date;               // End date
  sortBy?: 'createdAt' | 'size' | 'url';
  sortOrder?: 'asc' | 'desc';
  limit?: number;              // Max results
  offset?: number;             // Pagination
}
```

#### OriginalFileStatistics

Aggregate statistics:

```typescript
interface OriginalFileStatistics {
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  filesByStatus: Record<FileStatus, number>;
  filesByMimeType: Record<string, number>;
  filesByScraperUsed: Record<string, number>;
  oldestFile?: Date;
  newestFile?: Date;
}
```

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

### Original Files Table

```sql
CREATE TABLE original_files (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  scraper_used TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  accessed_at INTEGER,
  download_url TEXT
);

-- Indices for performance
CREATE INDEX idx_original_files_url ON original_files(url);
CREATE INDEX idx_original_files_status ON original_files(status);
CREATE INDEX idx_original_files_mime_type ON original_files(mime_type);
CREATE INDEX idx_original_files_created_at ON original_files(created_at);
CREATE INDEX idx_original_files_checksum ON original_files(checksum);
```

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

### Original File Tracking Workflow

```typescript
import { KnowledgeBaseFactoryWithFileTracking } from './src/factory/KnowledgeBaseFactoryWithFileTracking';
import { createSqlConfiguration } from './src/config/Configuration';
import { FileStatus } from './src/interfaces/IOriginalFileRepository';

async function trackAndManageFiles() {
  // Initialize with file tracking
  const config = createSqlConfiguration({
    storage: {
      knowledgeStore: {
        type: 'sql',
        dbPath: './data/knowledge.db'
      },
      originalFileStore: {
        type: 'sql',
        path: './data/original_files.db'
      }
    }
  });

  const kb = await KnowledgeBaseFactoryWithFileTracking.createKnowledgeBaseWithFileTracking(config);
  const repository = kb.getOriginalFileRepository();

  // Process URLs - files are automatically tracked
  const urls = [
    'https://example.com/report.pdf',
    'https://example.com/data.csv',
    'https://example.com/article.html'
  ];

  for (const url of urls) {
    await kb.processUrl(url);
  }

  // Query tracked files
  const allFiles = await repository.listOriginalFiles();
  console.log(`Tracked ${allFiles.length} files`);

  // Find PDFs
  const pdfs = await repository.listOriginalFiles({
    mimeType: 'application/pdf',
    status: FileStatus.ACTIVE
  });

  // Get files for specific URL
  const urlFiles = await repository.getOriginalFilesByUrl('https://example.com/report.pdf');
  if (urlFiles.length > 0) {
    console.log('File ID:', urlFiles[0].id);
    console.log('Download URL:', urlFiles[0].downloadUrl);
    console.log('Checksum:', urlFiles[0].checksum);
    console.log('Size:', urlFiles[0].size, 'bytes');
  }

  // Archive old files
  const oldFiles = await repository.listOriginalFiles({
    toDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  });

  for (const file of oldFiles) {
    await repository.updateFileStatus(file.id, FileStatus.ARCHIVED);
  }

  // Get statistics
  const stats = await repository.getStatistics();
  console.log('Statistics:', {
    totalFiles: stats.totalFiles,
    totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
    averageSize: `${(stats.averageFileSize / 1024).toFixed(2)} KB`,
    byType: stats.filesByMimeType,
    byStatus: stats.filesByStatus
  });

  return {
    totalTracked: allFiles.length,
    pdfsFound: pdfs.length,
    archived: oldFiles.length
  };
}
```

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