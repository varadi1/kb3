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
export {
  ProcessorRegistry,
  ProcessingAttempt,
  ProcessorInfo,
  ProcessingCapabilities
} from './ProcessorRegistry';

// Import required classes for the factory function
import { ProcessorRegistry } from './ProcessorRegistry';
import { TextProcessor } from './TextProcessor';
import { HtmlProcessor } from './HtmlProcessor';
import { PdfProcessor } from './PdfProcessor';
import { DocProcessor } from './DocProcessor';
import { DocumentProcessor } from './DocumentProcessor';
import { SpreadsheetProcessor } from './SpreadsheetProcessor';

// Factory function for creating default processor registry
export function createDefaultProcessorRegistry(): ProcessorRegistry {
  const registry = new ProcessorRegistry();

  // Add all standard processors
  registry.addProcessor(new TextProcessor());
  registry.addProcessor(new HtmlProcessor());
  registry.addProcessor(new PdfProcessor());
  registry.addProcessor(new DocProcessor());
  registry.addProcessor(new DocumentProcessor());
  registry.addProcessor(new SpreadsheetProcessor());

  // Set text processor as fallback for unknown types
  registry.setFallbackProcessor(new TextProcessor());

  return registry;
}