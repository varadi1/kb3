# Knowledge Base System - SOLID Principles Implementation

A comprehensive knowledge base system built following SOLID principles for scalable content management and processing.

## Architecture Overview

This system is designed with clear separation of concerns and follows SOLID principles:

### SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**
   - Each class has a single, well-defined purpose
   - URL detectors handle only URL classification
   - Content fetchers handle only content retrieval
   - Content processors handle only content processing

2. **Open/Closed Principle (OCP)**
   - System is open for extension (new URL types, processors)
   - Closed for modification (core interfaces remain stable)
   - Plugin-based architecture for new content types

3. **Liskov Substitution Principle (LSP)**
   - All implementations can be substituted for their base interfaces
   - Consistent behavior across all content fetchers and processors

4. **Interface Segregation Principle (ISP)**
   - Small, focused interfaces rather than large general ones
   - Clients depend only on interfaces they use

5. **Dependency Inversion Principle (DIP)**
   - High-level modules don't depend on low-level modules
   - Both depend on abstractions (interfaces)
   - Dependency injection throughout the system

## Project Structure

```
kb3/
├── src/
│   ├── interfaces/           # Abstract interfaces and contracts
│   ├── detectors/           # URL type detection and classification
│   ├── fetchers/            # Content retrieval from various sources
│   ├── processors/          # Content processing for different types
│   ├── storage/             # Knowledge store and file storage
│   ├── orchestrator/        # Main coordination logic
│   └── utils/              # Utility functions and helpers
├── tests/                  # Comprehensive test suite
├── config/                 # Configuration files
├── examples/               # Sample usage and URLs
└── docs/                   # Additional documentation
```

## Key Features

- **Scalable URL Classification**: Extensible system for detecting and classifying different URL types
- **Modular Content Fetching**: Support for various content sources (web, local files, APIs)
- **Flexible Content Processing**: Pluggable processors for different file types
- **Robust Error Handling**: Comprehensive error handling and graceful degradation
- **Dynamic Content Detection**: Content type detection beyond file extensions
- **Comprehensive Testing**: Full test coverage ensuring SOLID compliance

## Usage

```typescript
import { KnowledgeBaseOrchestrator } from './src/orchestrator/KnowledgeBaseOrchestrator';
import { createDefaultConfiguration } from './src/config/DefaultConfiguration';

const config = createDefaultConfiguration();
const orchestrator = new KnowledgeBaseOrchestrator(config);

// Process a URL
const result = await orchestrator.processUrl('https://example.com/document.pdf');
console.log('Processing result:', result);
```