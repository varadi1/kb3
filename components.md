### Components, classes, and exported functions

| Component | File | Classes | Exported functions | Description | Inputs | Outputs |
|---|---|---|---|---|---|---|
| config | `src/config/Configuration.ts` | — | - `createDefaultConfiguration`<br>- `createProductionConfiguration`<br>- `createDevelopmentConfiguration`<br>- `createSqlConfiguration`<br>- `validateConfiguration` | - Build default config with optional overrides<br>- Build production-ready config<br>- Build development config<br>- Build SQL-backed config with optional overrides<br>- Validate a configuration object | - overrides?: Partial<KnowledgeBaseConfig><br>- none<br>- none<br>- overrides?: Partial<KnowledgeBaseConfig><br>- config: KnowledgeBaseConfig | - KnowledgeBaseConfig<br>- KnowledgeBaseConfig<br>- KnowledgeBaseConfig<br>- KnowledgeBaseConfig<br>- void (throws on invalid) |
| config | `src/config/index.ts` | — | — | Re-exports configuration APIs | — | — |
| detectors | `src/detectors/BaseUrlDetector.ts` | `BaseUrlDetector` (abstract) | — | Abstract base for URL detectors | — | — |
| detectors | `src/detectors/ContentBasedDetector.ts` | `ContentBasedDetector` | — | Detects content type from content sample | — | — |
| detectors | `src/detectors/ExtensionBasedDetector.ts` | `ExtensionBasedDetector` | — | Detects content type from URL extension | — | — |
| detectors | `src/detectors/HeaderBasedDetector.ts` | `HeaderBasedDetector` | — | Detects content type from HTTP headers | — | — |
| detectors | `src/detectors/UrlDetectorRegistry.ts` | `UrlDetectorRegistry` | — | Holds and prioritizes detectors | — | — |
| detectors | `src/detectors/index.ts` | — | - `createDefaultDetectorRegistry` | Create a registry with extension, header, and content detectors | none | UrlDetectorRegistry |
| factory | `src/factory/KnowledgeBaseFactory.ts` | `KnowledgeBaseFactory` | — | Constructs configured orchestrators and components | — | — |
| factory | `src/factory/index.ts` | — | — | Re-exports factory APIs | — | — |
| fetchers | `src/fetchers/BaseFetcher.ts` | `BaseFetcher` (abstract) | — | Abstract base for content fetchers | — | — |
| fetchers | `src/fetchers/HttpFetcher.ts` | `HttpFetcher` | — | Fetches content over HTTP/HTTPS | — | — |
| fetchers | `src/fetchers/SmartHttpFetcher.ts` | `SmartHttpFetcher` | — | HTTP fetcher handling redirects/special cases | — | — |
| fetchers | `src/fetchers/FileFetcher.ts` | `FileFetcher` | — | Reads content from local files | — | — |
| fetchers | `src/fetchers/FetcherRegistry.ts` | `FetcherRegistry` | — | Manages a set of fetchers | — | — |
| fetchers | `src/fetchers/ScraperAwareContentFetcher.ts` | `ScraperAwareContentFetcher` | — | Content fetcher that integrates with scraping libraries | — | — |
| fetchers | `src/fetchers/index.ts` | — | - `createDefaultFetcherRegistry` | Create registry with `SmartHttpFetcher` and `FileFetcher` | none | FetcherRegistry |
| scrapers | `src/scrapers/BaseScraper.ts` | `BaseScraper` (abstract) | — | Abstract base for scraper implementations | — | — |
| scrapers | `src/scrapers/HttpScraper.ts` | `HttpScraper` | — | Adapter for HTTP fetcher as scraper | — | — |
| scrapers | `src/scrapers/PlaywrightScraper.ts` | `PlaywrightScraper` | — | Full browser automation with Playwright - supports JS, screenshots, PDFs, cookies | url: string, options?: ScraperOptions | ScrapedContent |
| scrapers | `src/scrapers/Crawl4AIScraper.ts` | `Crawl4AIScraper` | — | AI-powered web crawling with extraction strategies and content chunking | url: string, options?: ScraperOptions | ScrapedContent |
| scrapers | `src/scrapers/FirecrawlScraper.ts` | `FirecrawlScraper` | — | API-based scraping service (placeholder) | — | — |
| scrapers | `src/scrapers/DoclingScraper.ts` | `DoclingScraper` | — | Document extraction with OCR support for PDF, DOCX, PPTX, images | url: string, options?: ScraperOptions | ScrapedContent |
| scrapers | `src/scrapers/DeepDoctectionScraper.ts` | `DeepDoctectionScraper` | — | Deep document analysis (placeholder) | — | — |
| scrapers | `src/scrapers/ScraperRegistry.ts` | `ScraperRegistry` | — | Singleton registry for managing scrapers | — | — |
| scrapers | `src/scrapers/ScraperSelector.ts` | `ScraperSelector`, `DomainBasedSelectionStrategy` | — | Selects appropriate scraper for URLs based on rules | — | — |
| scrapers | `src/scrapers/ScraperFactory.ts` | `ScraperFactory` | — | Factory for creating and configuring scrapers | — | — |
| scrapers | `src/scrapers/ScraperParameterManager.ts` | `ScraperParameterManager`, `PlaywrightParameterValidator`, `Crawl4AIParameterValidator`, `DoclingParameterValidator` | — | Manages and validates scraper-specific parameters | url: string, config: ScraperConfiguration | void |
| scrapers | `src/scrapers/BatchConfigurationManager.ts` | `BatchConfigurationManager` | — | Handles batch configuration operations and presets | operation: BatchOperation | BatchConfigurationResult |
| interfaces | `src/interfaces/IUrlDetector.ts` | — | — | Interface definitions for URL detection | — | — |
| interfaces | `src/interfaces/IOrchestrator.ts` | — | — | Orchestrator interfaces and types | — | — |
| interfaces | `src/interfaces/IContentFetcher.ts` | — | — | Fetcher interfaces and types | — | — |
| interfaces | `src/interfaces/IScraper.ts` | — | — | Scraper interfaces and types | — | — |
| interfaces | `src/interfaces/IScraperParameters.ts` | — | — | Comprehensive parameter interfaces for all scrapers | — | — |
| interfaces | `src/interfaces/IFileStorage.ts` | — | — | File storage interfaces and types | — | — |
| interfaces | `src/interfaces/IKnowledgeStore.ts` | — | — | Knowledge store interfaces and types | — | — |
| interfaces | `src/interfaces/IContentProcessor.ts` | — | — | Processor interfaces and types | — | — |
| interfaces | `src/interfaces/IUrlRepository.ts` | — | — | URL repository interfaces and types | — | — |
| interfaces | `src/interfaces/index.ts` | — | — | Re-exports interfaces | — | — |
| orchestrator | `src/orchestrator/KnowledgeBaseOrchestrator.ts` | `KnowledgeBaseOrchestrator` | — | Coordinates detect→fetch→process→store→index pipeline | — | — |
| orchestrator | `src/orchestrator/index.ts` | — | — | Re-exports orchestrator | — | — |
| processors | `src/processors/BaseProcessor.ts` | `BaseProcessor` (abstract) | — | Abstract base for content processors | — | — |
| processors | `src/processors/TextProcessor.ts` | `TextProcessor` | — | Processes plain text | — | — |
| processors | `src/processors/HtmlProcessor.ts` | `HtmlProcessor` | — | Processes HTML to text/metadata | — | — |
| processors | `src/processors/PdfProcessor.ts` | `PdfProcessor` | — | Processes PDFs | — | — |
| processors | `src/processors/DocProcessor.ts` | `DocProcessor` | — | Processes legacy Word docs | — | — |
| processors | `src/processors/DocumentProcessor.ts` | `DocumentProcessor` | — | Processes modern Office docs | — | — |
| processors | `src/processors/SpreadsheetProcessor.ts` | `SpreadsheetProcessor` | — | Processes spreadsheets | — | — |
| processors | `src/processors/ProcessorRegistry.ts` | `ProcessorRegistry` | — | Manages processors and fallback | — | — |
| processors | `src/processors/index.ts` | — | - `createDefaultProcessorRegistry` | Create registry with standard processors and fallback | none | ProcessorRegistry |
| storage | `src/storage/BaseKnowledgeStore.ts` | `BaseKnowledgeStore` (abstract) | — | Abstract base for knowledge stores | — | — |
| storage | `src/storage/MemoryKnowledgeStore.ts` | `MemoryKnowledgeStore` | — | In-memory store for entries (dev/test) | — | — |
| storage | `src/storage/FileKnowledgeStore.ts` | `FileKnowledgeStore` | — | File-based persistent knowledge store | — | — |
| storage | `src/storage/SqlKnowledgeStore.ts` | `SqlKnowledgeStore` | — | SQL-backed persistent knowledge store | — | — |
| storage | `src/storage/BaseFileStorage.ts` | `BaseFileStorage` (abstract) | — | Abstract base for file storage | — | — |
| storage | `src/storage/LocalFileStorage.ts` | `LocalFileStorage` | — | Stores raw bytes+metadata on local FS | — | — |
| storage | `src/storage/SqlUrlRepository.ts` | `SqlUrlRepository` | — | Tracks URLs/hashes for duplicate detection | — | — |
| storage | `src/storage/index.ts` | — | - `createDefaultKnowledgeStore`<br>- `createDefaultFileStorage` | - Create memory/file knowledge store (based on path)<br>- Create local file storage rooted at basePath | - storePath?: string<br>- basePath: string | - BaseKnowledgeStore (Memory or File)<br>- LocalFileStorage |
| utils | `src/utils/ErrorHandler.ts` | `ErrorHandler` | — | Centralized error handling utilities | — | — |
| utils | `src/utils/ValidationUtils.ts` | `ValidationUtils` | — | Validation helpers for URLs, config, etc. | — | — |
| utils | `src/utils/index.ts` | — | — | Re-exports utilities | — | — |
| root | `src/index.ts` | — | - `createKnowledgeBase` | Create an orchestrator using default or provided config | config?: Partial<KnowledgeBaseConfig> | KnowledgeBaseOrchestrator |


