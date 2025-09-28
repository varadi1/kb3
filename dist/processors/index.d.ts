/**
 * Central export for all content processors
 * Facilitates easy import and dependency injection
 */
export { BaseProcessor } from './BaseProcessor';
export { TextProcessor } from './TextProcessor';
export { HtmlProcessor } from './HtmlProcessor';
export { PdfProcessor } from './PdfProcessor';
export { DocProcessor } from './DocProcessor';
export { DocumentProcessor } from './DocumentProcessor';
export { SpreadsheetProcessor } from './SpreadsheetProcessor';
export { RtfProcessor } from './RtfProcessor';
export { ProcessorRegistry, ProcessingAttempt, ProcessorInfo, ProcessingCapabilities } from './ProcessorRegistry';
import { ProcessorRegistry } from './ProcessorRegistry';
export declare function createDefaultProcessorRegistry(): ProcessorRegistry;
//# sourceMappingURL=index.d.ts.map