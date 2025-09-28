# KB3 - Knowledge Base System Development Guidelines

## Project Overview

KB3 is a scalable knowledge base system built with TypeScript that processes URLs and documents while strictly adhering to SOLID principles. The system can detect content types, fetch content from various sources, process different file formats, and store knowledge with metadata.

## Architecture Principles

### SOLID Compliance

This codebase **MUST** follow SOLID principles at all times:

1. **Single Responsibility Principle (SRP)**
   - Each class has ONE reason to change
   - No class should handle multiple concerns
   - Example: `HttpFetcher` only fetches HTTP content, nothing else

2. **Open/Closed Principle (OCP)**
   - Classes are open for extension, closed for modification
   - Use registries to add new functionality
   - Never modify existing classes to add features

3. **Liskov Substitution Principle (LSP)**
   - All implementations must be substitutable for their interfaces
   - No implementation should break the contract of its interface
   - Example: All `IContentProcessor` implementations must behave consistently

4. **Interface Segregation Principle (ISP)**
   - Keep interfaces small and focused
   - Clients should not depend on methods they don't use
   - Example: `IUrlDetector` only has `canHandle()` and `detect()`

5. **Dependency Inversion Principle (DIP)**
   - Depend on abstractions, not concretions
   - Use dependency injection throughout
   - High-level modules should not depend on low-level modules

## Project Structure

```
kb3/
├── src/                  # Core KB3 library
│   ├── interfaces/       # Abstract contracts (ISP)
│   ├── detectors/        # URL type detection (SRP)
│   ├── fetchers/         # Content retrieval (SRP)
│   ├── processors/       # Content processing (SRP)
│   ├── cleaners/         # Text cleaning and sanitization (SRP)
│   ├── storage/          # Persistence layer (SRP)
│   ├── orchestrator/     # Main coordinator (DIP)
│   ├── factory/          # Dependency injection (DIP)
│   ├── config/           # Configuration management
│   └── utils/            # Utilities and error handling
├── packages/             # Frontend/Backend applications
│   ├── backend/          # Express.js API server
│   │   ├── src/
│   │   │   ├── services/ # KB3 integration layer
│   │   │   ├── routes/   # REST API endpoints
│   │   │   ├── websocket/# Real-time events
│   │   │   └── index.ts  # Server entry point
│   │   └── package.json
│   └── frontend/         # Next.js web interface
│       ├── app/          # App router pages
│       ├── components/   # React components
│       ├── lib/          # Utilities and store
│       └── package.json
├── tests/
│   ├── solid-compliance/ # SOLID principle tests
│   ├── integration/      # Integration tests
│   └── unit/            # Unit tests
├── data/                # Runtime data (Downloaded content, Knowledge base)
├── test-data/           # Static test fixtures (NEVER modify during runtime)
├── dev-data/            # Development experiments (can be deleted anytime)
├── examples/            # Working code examples
└── docs/                # Documentation
```

### Strict Folder Rules

1. **NEVER mix concerns between folders**
2. **Never write to `test-data/` during test execution**
3. **Use `dev-data/` for temporary test outputs**
4. **Production code goes in `src/` ONLY**

## Development Rules

### 1. Adding New Features

**NEVER** modify existing classes to add features. Instead:

```typescript
// WRONG - Violates OCP
class HttpFetcher {
  fetch() { /* original */ }
  fetchWithCache() { /* NEW - WRONG! */ }
}

// CORRECT - Extension through composition
class CachedHttpFetcher implements IContentFetcher {
  constructor(private fetcher: HttpFetcher, private cache: ICache) {}
  fetch() { /* use cache + fetcher */ }
}
```

### 2. Creating New Components

All new components MUST:
- Implement an interface from `src/interfaces/`
- Have a single, clear responsibility
- Be registered in the appropriate registry
- Include comprehensive tests

### 3. Testing Requirements

Every component MUST have:
- Unit tests covering all public methods
- SOLID compliance tests
- Integration tests with other components

### 4. Error Handling

All errors MUST be:
- Properly categorized (use `ErrorHandler.categorizeError()`)
- Logged with context
- Collected for analysis (use `IErrorCollector`)
- Handled gracefully without breaking the system

### 5. Dependency Injection

Always use constructor injection:

```typescript
// CORRECT
class MyClass {
  constructor(
    private fetcher: IContentFetcher,
    private processor: IContentProcessor,
    private store: IKnowledgeStore
  ) {}
}

// WRONG - Hard dependencies
class MyClass {
  private fetcher = new HttpFetcher();  // WRONG!
}
```

## Code Quality Standards

### TypeScript Settings

The project uses strict TypeScript settings. NEVER disable these:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

### Naming Conventions

- Interfaces: `I` prefix (e.g., `IContentFetcher`)
- Abstract classes: `Base` prefix (e.g., `BaseProcessor`)
- Registries: `Registry` suffix (e.g., `ProcessorRegistry`)
- Test files: `.test.ts` suffix
- Private methods: `_` prefix (e.g., `_validateInput()`)

### Documentation

All public APIs MUST have JSDoc comments:

```typescript
/**
 * Processes content and extracts metadata
 * @param content - The raw content buffer
 * @param options - Processing options
 * @returns Promise resolving to processing result
 * @throws ProcessingError if content is invalid
 */
async process(content: Buffer, options?: ProcessingOptions): Promise<ProcessingResult>
```

## Web Interface (Frontend & Backend)

### Architecture

The KB3 system includes a full-featured web interface with:

#### **Backend API Server** (Express.js + TypeScript)
- REST API for all KB3 operations
- WebSocket server for real-time updates
- Singleton KB3 service integration
- Input validation and error handling
- Rate limiting and security middleware

#### **Frontend Application** (Next.js 14 + React)
- Modern React with TypeScript
- Real-time updates via Socket.io
- Advanced data grid with TanStack Table
- State management with Zustand
- UI components with shadcn/ui and Tailwind CSS

### Features

1. **URL Management Dashboard**
   - Table view with sorting, filtering, pagination
   - Multi-select operations
   - Inline editing of metadata
   - Status indicators and progress tracking

2. **Tag Management**
   - Hierarchical tag tree
   - Drag-and-drop organization
   - Bulk tag assignment

3. **Scraper & Cleaner Configuration**
   - Per-URL configuration
   - Tool chain selection
   - Template management
   - Test configurations

4. **Processing Monitor**
   - Real-time progress updates
   - Queue management
   - Error recovery
   - Batch operations

5. **Import/Export**
   - JSON, CSV, TXT formats
   - Validation and preview
   - Template downloads

### Running the Web Interface

```bash
# Install dependencies
cd packages/backend && npm install
cd ../frontend && npm install

# Start backend (port 4000)
cd packages/backend
npm run dev

# Start frontend (port 3000)
cd packages/frontend
npm run dev

# Access at http://localhost:3000
```

## Installation

### Node.js Dependencies
```bash
npm install
```

### Python Dependencies
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### Verification
```bash
npx tsx verify-scrapers.ts
```

## System Features

### Database Storage

#### Unified Storage (Recommended)
Single SQLite database with all tables:

```typescript
const config = createUnifiedConfiguration({
  dbPath: './data/unified.db',
  enableWAL: true,
  enableForeignKeys: true,
  autoMigrate: true
});
```

#### Migration from Legacy
```typescript
const config = createUnifiedConfiguration({
  dbPath: './data/unified.db',
  autoMigrate: true,
  migrationOptions: {
    backupOriginal: true,
    deleteOriginalAfterSuccess: false
  }
});
```

### File Tracking System

Tracks all scraped/downloaded files with:
- Unique IDs per file
- SHA256 checksums
- Download URLs
- Status management
- Access tracking
- Scraper metadata
- **Cleaning metadata** (cleaners used, configuration, statistics)

### Tag System

Organize URLs into logical groups:

```typescript
// Create hierarchical tags
await kb.createTag('documentation');
await kb.createTag('api-docs', 'documentation');

// Process URLs with tags
await kb.processUrlsWithTags([
  { url: 'https://example.com/api', tags: ['api-docs'] }
]);

// Batch process by tags
await kb.processUrlsByTags(['api-docs']);
```

### Text Cleaning System

Multi-stage text sanitization with:
- Chain processing through multiple cleaners
- Auto-selection based on content type
- Per-URL configuration
- Statistics tracking
- Original text preservation
- Error resilience

Available cleaners:
- **SanitizeHtmlCleaner**: Remove dangerous HTML
- **XssCleaner**: Prevent XSS attacks
- **VocaCleaner**: Text normalization
- **RemarkCleaner**: Markdown processing
- **ReadabilityCleaner**: Extract main content

### Scraper System

All scrapers verified working (2025-01-28):

1. **HttpScraper** - ✅ Native Node.js HTTP/HTTPS
2. **PlaywrightScraper** - ✅ Browser automation
3. **Crawl4AIScraper** - ✅ AI-powered extraction
4. **DoclingScraper** - ✅ PDF/document processing
5. **DeepDoctectionScraper** - ✅ Layout analysis (with fallback)

Configure scrapers per URL:

```typescript
fetcher.setUrlParameters('https://app.example.com', {
  scraperType: 'playwright',
  parameters: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    waitUntil: 'networkidle'
  }
});
```

Priority system:
- 25+: File extensions
- 20: Specific URLs
- 15: Domain patterns
- 10: General patterns
- 0-5: Fallbacks

### Metadata Tracking

The system tracks comprehensive metadata:

1. **Scraper Metadata**: Which tool fetched content, parameters used
2. **Cleaning Metadata**: Which cleaners processed content, statistics
3. **Processing Metadata**: All transformation details
4. **Storage Metadata**: File locations, checksums, timestamps

Access metadata via:
- Processing results
- URL repository
- Original file tracking
- Knowledge store

## Testing

```bash
npm test                    # Run all tests
npm run test:solid          # SOLID compliance tests
npm run test:integration    # Integration tests
npm run test:coverage       # Coverage report
```

## Performance Guidelines

1. Use streaming for large files
2. Implement connection pooling
3. Add caching strategically
4. Limit concurrency via configuration
5. Lazy load processors
6. Implement rate limiting
7. Batch requests by domain

## Security Guidelines

1. Validate all URLs: `ValidationUtils.validateUrl()`
2. Sanitize file paths to prevent traversal
3. Configure maximum file sizes
4. Use timeouts on all operations
5. Validate content types, don't trust extensions

## Important Notes

1. **NEVER violate SOLID principles** - The architecture depends on it
2. **Always write tests first** - TDD is encouraged
3. **Keep interfaces stable** - Changes affect many components
4. **Document edge cases** - Help future developers
5. **Review the examples** - They show best practices

Remember: **Clean architecture > Quick fixes**