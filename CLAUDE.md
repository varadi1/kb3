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
├── src/
│   ├── interfaces/       # Abstract contracts (ISP)
│   ├── detectors/        # URL type detection (SRP)
│   ├── fetchers/         # Content retrieval (SRP)
│   ├── processors/       # Content processing (SRP)
│   ├── storage/          # Persistence layer (SRP)
│   ├── orchestrator/     # Main coordinator (DIP)
│   ├── factory/          # Dependency injection (DIP)
│   ├── config/           # Configuration management
│   └── utils/            # Utilities and error handling
├── tests/
│   ├── solid-compliance/ # SOLID principle tests
│   ├── integration/      # System integration tests
│   └── unit/            # Unit tests
├── examples/            # Sample data and usage
└── docs/               # Documentation
```

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

Example for adding a new processor:
```typescript
// 1. Implement the interface
class MarkdownProcessor extends BaseProcessor {
  canProcess(type: ContentType): boolean {
    return type === ContentType.MARKDOWN;
  }

  async process(content: Buffer): Promise<ProcessingResult> {
    // Process markdown content
  }
}

// 2. Register in ProcessorRegistry
registry.register(ContentType.MARKDOWN, new MarkdownProcessor());
```

### 3. Testing Requirements

Every component MUST have:
- Unit tests covering all public methods
- SOLID compliance tests
- Integration tests with other components

Test structure:
```typescript
describe('ComponentName', () => {
  describe('SOLID Compliance', () => {
    test('follows Single Responsibility', () => {});
    test('is open for extension', () => {});
    test('is substitutable', () => {});
  });

  describe('Functionality', () => {
    test('handles normal cases', () => {});
    test('handles edge cases', () => {});
    test('handles errors gracefully', () => {});
  });
});
```

### 4. Error Handling

All errors MUST be:
- Properly categorized (use `ErrorHandler.categorizeError()`)
- Logged with context
- Handled gracefully without breaking the system

```typescript
try {
  const result = await processor.process(content);
} catch (error) {
  const categorized = ErrorHandler.categorizeError(error);
  logger.error('Processing failed', { error: categorized, context });

  if (categorized.recoverable) {
    return fallbackResult;
  }
  throw categorized;
}
```

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

### 6. Configuration

All configuration should be:
- Type-safe (use TypeScript interfaces)
- Validated before use
- Provided through the factory

```typescript
const config = createDefaultConfiguration({
  processing: { concurrency: 5 },
  fetching: { timeout: 30000 }
});

const kb = KnowledgeBaseFactory.createKnowledgeBase(config);
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

## Common Tasks

### Adding a New URL Detector

1. Create the detector in `src/detectors/`:
```typescript
export class MyDetector extends BaseUrlDetector {
  canHandle(url: string): boolean { /* ... */ }
  async detect(url: string): Promise<UrlClassification> { /* ... */ }
}
```

2. Register in `UrlDetectorRegistry`:
```typescript
registry.register('my-detector', new MyDetector());
```

3. Add tests in `tests/unit/detectors/`

### Adding a New Content Processor

1. Create processor in `src/processors/`
2. Implement `IContentProcessor` interface
3. Register in `ProcessorRegistry`
4. Add tests including SOLID compliance

### Extending Storage

1. Implement `IKnowledgeStore` or `IFileStorage`
2. Ensure atomicity and consistency
3. Add to factory configuration options
4. Test with concurrent operations

## Testing Commands

```bash
# Run all tests
npm test

# Run SOLID compliance tests only
npm run test:solid

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- SingleResponsibility.test.ts
```

## Performance Considerations

1. **Use streaming for large files**: Don't load entire files into memory
2. **Implement connection pooling**: Reuse HTTP connections
3. **Add caching strategically**: Cache expensive operations
4. **Limit concurrency**: Use the configuration to control parallel operations
5. **Lazy load processors**: Only instantiate when needed

## Security Guidelines

1. **Validate all URLs**: Use `ValidationUtils.validateUrl()`
2. **Sanitize file paths**: Prevent directory traversal
3. **Limit file sizes**: Configure maximum sizes
4. **Use timeouts**: Prevent hanging operations
5. **Validate content types**: Don't trust file extensions alone

## Debugging

Enable debug logging:
```typescript
const config = createDevelopmentConfiguration({
  logging: { level: 'debug' }
});
```

Use the error categorization for troubleshooting:
```typescript
const error = ErrorHandler.categorizeError(e);
console.log('Error category:', error.category);
console.log('Recoverable:', error.recoverable);
```

## Continuous Improvement

When enhancing the system:

1. **Maintain backwards compatibility**: Never break existing interfaces
2. **Add deprecation notices**: Give time before removing features
3. **Document breaking changes**: If absolutely necessary
4. **Increase test coverage**: Aim for >90%
5. **Refactor regularly**: Keep code clean and maintainable

## Example Usage

### Basic Usage
```typescript
import { createKnowledgeBase } from 'kb3';

const kb = createKnowledgeBase();
const result = await kb.processUrl('https://example.com/document.pdf');
console.log('Processed:', result.metadata);
```

### Advanced Configuration
```typescript
import { KnowledgeBaseFactory, createDefaultConfiguration } from 'kb3';

const config = createDefaultConfiguration({
  processing: {
    concurrency: 10,
    timeout: 60000
  },
  storage: {
    knowledgeStore: {
      type: 'file',
      path: './data/knowledge'
    }
  }
});

const kb = KnowledgeBaseFactory.createKnowledgeBase(config);

// Process multiple URLs
const results = await kb.processUrls([
  'https://example.com/doc1.pdf',
  'https://example.com/doc2.html'
]);
```

### Custom Extension
```typescript
import { BaseProcessor, ProcessorRegistry } from 'kb3';

class CustomProcessor extends BaseProcessor {
  async process(content: Buffer): Promise<ProcessingResult> {
    // Custom processing logic
  }
}

// Register the processor
const registry = ProcessorRegistry.getInstance();
registry.register('custom', new CustomProcessor());
```

## Important Notes

1. **NEVER violate SOLID principles** - The architecture depends on it
2. **Always write tests first** - TDD is encouraged
3. **Keep interfaces stable** - Changes affect many components
4. **Document edge cases** - Help future developers
5. **Review the examples** - They show best practices

## Questions or Issues?

- Check existing tests for examples
- Review the interfaces for contracts
- Look at factory patterns for dependency injection
- Ensure SOLID compliance in all changes

Remember: **Clean architecture > Quick fixes**