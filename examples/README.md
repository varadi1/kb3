# Knowledge Base System - Examples

This directory contains examples, sample data, and configurations for testing and demonstrating the Knowledge Base System.

## Directory Structure

```
examples/
├── configurations/          # Sample configuration files
│   ├── development.json     # Development environment config
│   ├── production.json      # Production environment config
│   └── testing.json         # Testing environment config
├── sample-urls.json         # Collection of URLs for testing
├── sample-document.txt      # Sample text document
├── sample-data.json         # Sample JSON data
├── usage-examples.ts        # TypeScript usage examples
└── README.md               # This file
```

## Quick Start

### Basic Usage

```typescript
import { createKnowledgeBase } from '../src';

const knowledgeBase = createKnowledgeBase();

// Process a single URL
const result = await knowledgeBase.processUrl('https://example.com');
console.log(result);
```

### Batch Processing

```typescript
import { KnowledgeBaseFactory } from '../src/factory';
import { createDefaultConfiguration } from '../src/config';

const config = createDefaultConfiguration({
  processing: { concurrency: 5 }
});

const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

const urls = [
  'https://example.com/doc1.pdf',
  'https://example.com/doc2.html',
  'https://example.com/data.json'
];

const results = await knowledgeBase.processUrls(urls);
```

## Sample URLs

The `sample-urls.json` file contains categorized URLs for testing different aspects of the system:

### Categories

- **pdf_documents**: PDF files for testing document processing
- **web_pages**: HTML pages for testing web content extraction
- **text_files**: Plain text files for basic text processing
- **structured_data**: JSON, CSV, XML files for structured data handling
- **office_documents**: Microsoft Office documents (XLSX, DOCX)
- **edge_cases**: URLs that test error handling and edge cases
- **large_files**: Files for testing size limits and performance
- **content_type_detection**: URLs that test dynamic content type detection
- **local_files**: Local file URLs for file system testing

### Test Scenarios

- **basic_functionality**: URLs for basic system testing
- **error_resilience**: URLs that intentionally cause errors
- **content_variety**: Mixed content types for comprehensive testing
- **performance**: URLs for performance and concurrency testing

## Configuration Examples

### Development Configuration

```json
{
  "storage": {
    "knowledgeStore": { "type": "memory" },
    "fileStorage": { "basePath": "./dev-data/files" }
  },
  "processing": {
    "concurrency": 2,
    "timeout": 10000
  },
  "logging": { "level": "debug" }
}
```

### Production Configuration

```json
{
  "storage": {
    "knowledgeStore": {
      "type": "file",
      "path": "./data/knowledge",
      "backupEnabled": true
    },
    "fileStorage": {
      "basePath": "./data/files",
      "compressionEnabled": true
    }
  },
  "processing": {
    "concurrency": 10,
    "timeout": 30000
  },
  "logging": { "level": "warn" }
}
```

## Running Examples

### Using ts-node (Development)

```bash
npx ts-node examples/usage-examples.ts
```

### Using compiled JavaScript

```bash
npm run build
node dist/examples/usage-examples.js
```

### Individual Examples

```typescript
import { basicUsage, batchProcessing } from './examples/usage-examples';

// Run specific examples
await basicUsage();
await batchProcessing();
```

## Testing with Sample Data

### Testing Different Content Types

```typescript
import sampleUrls from './examples/sample-urls.json';

// Test PDF processing
const pdfUrls = sampleUrls.categories.pdf_documents.urls;
const results = await knowledgeBase.processUrls(pdfUrls);

// Test error handling
const errorUrls = sampleUrls.categories.edge_cases.urls;
const errorResults = await knowledgeBase.processUrls(errorUrls);
```

### Testing Local Files

```typescript
// Process local sample files
const localUrls = [
  './examples/sample-document.txt',
  './examples/sample-data.json'
];

const results = await knowledgeBase.processUrls(localUrls);
```

## Configuration Loading

### From JSON File

```typescript
import fs from 'fs';
import { KnowledgeBaseFactory } from '../src/factory';

// Load configuration from file
const configJson = fs.readFileSync('./examples/configurations/development.json', 'utf8');
const config = JSON.parse(configJson);

const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);
```

### Environment-Specific Configurations

```typescript
import { KnowledgeBaseFactory } from '../src/factory';

// Use predefined configurations
const devKB = KnowledgeBaseFactory.createDevelopmentKnowledgeBase();
const prodKB = KnowledgeBaseFactory.createProductionKnowledgeBase();
```

## Monitoring and Statistics

```typescript
// Get current processing status
const status = await knowledgeBase.getStatus();
console.log(`Currently processing: ${status.totalProcessing}`);

// Get processing statistics
const stats = knowledgeBase.getProcessingStats();
console.log(`Success rate: ${stats.successful / stats.totalProcessed}`);
```

## Error Handling Examples

```typescript
try {
  const result = await knowledgeBase.processUrl('invalid-url');
} catch (error) {
  console.error('Processing failed:', error.message);
}

// Check result status
const result = await knowledgeBase.processUrl('https://example.com');
if (!result.success) {
  console.error('Error:', result.error?.code, result.error?.message);
  console.error('Failed at stage:', result.error?.stage);
}
```

## Performance Testing

```typescript
// Test concurrent processing
const performanceUrls = sampleUrls.test_scenarios.performance.urls;
const startTime = Date.now();

const results = await knowledgeBase.processUrls(performanceUrls);

const endTime = Date.now();
console.log(`Processed ${results.length} URLs in ${endTime - startTime}ms`);
```

## Extending the System

### Custom URL Detector

```typescript
import { BaseUrlDetector, ContentType } from '../src/detectors';

class CustomDetector extends BaseUrlDetector {
  canHandle(url: string): boolean {
    return url.includes('custom-protocol');
  }

  async performDetection(url: string) {
    return {
      type: ContentType.TXT,
      mimeType: 'text/plain',
      confidence: 0.9,
      metadata: { custom: true }
    };
  }
}

// Add to system
const detectorRegistry = new UrlDetectorRegistry();
detectorRegistry.addDetector(new CustomDetector());
```

## Best Practices

1. **Start with sample URLs** for initial testing and development
2. **Use development configuration** for local development and testing
3. **Test error handling** with the provided edge case URLs
4. **Monitor performance** using the built-in statistics
5. **Customize configuration** based on your specific needs
6. **Handle errors gracefully** in production environments

## Troubleshooting

### Common Issues

- **Network timeouts**: Increase timeout values in configuration
- **Large file processing**: Adjust maxSize and maxTextLength settings
- **Permission errors**: Check file system permissions for local files
- **Memory usage**: Use file-based storage for large datasets

### Debug Mode

Enable debug logging to see detailed processing information:

```json
{
  "logging": {
    "level": "debug",
    "enableConsole": true
  }
}
```