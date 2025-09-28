/**
 * Remark Markdown Cleaner Implementation
 * Single Responsibility: Markdown processing and transformation using Remark
 */

import { BaseTextCleaner } from './BaseTextCleaner';
import { ITextCleanerConfig, TextFormat, ICleaningStatistics } from '../interfaces/ITextCleaner';

export interface RemarkOptions {
  parseOptions?: {
    gfm?: boolean; // GitHub Flavored Markdown
    footnotes?: boolean;
    frontmatter?: boolean;
    commonmark?: boolean;
    pedantic?: boolean;
  };
  stringifyOptions?: {
    bullet?: '-' | '*' | '+';
    bulletOther?: '-' | '*' | '+';
    bulletOrdered?: '.' | ')';
    closeAtx?: boolean;
    emphasis?: '_' | '*';
    fence?: '`' | '~';
    fences?: boolean;
    incrementListMarker?: boolean;
    listItemIndent?: 'one' | 'tab' | 'mixed';
    quote?: '"' | "'";
    resourceLink?: boolean;
    rule?: '-' | '*' | '_';
    ruleRepetition?: number;
    ruleSpaces?: boolean;
    setext?: boolean;
    strong?: '_' | '*';
    tightDefinitions?: boolean;
  };
  transformations?: {
    normalizeHeadings?: boolean;
    removeFrontmatter?: boolean;
    removeCodeBlocks?: boolean;
    removeImages?: boolean;
    removeLinks?: boolean;
    removeEmphasis?: boolean;
    removeBlockquotes?: boolean;
    removeTables?: boolean;
    removeFootnotes?: boolean;
    removeHtmlComments?: boolean;
    extractText?: boolean; // Extract plain text only
    convertToHtml?: boolean;
    minifyMarkdown?: boolean;
    expandLinks?: boolean; // Convert reference links to inline
    normalizeLineBreaks?: boolean;
    fixBrokenLinks?: boolean;
    removeEmptyParagraphs?: boolean;
    normalizeLists?: boolean;
    maxHeadingLevel?: number; // Limit heading levels
  };
  customPlugins?: Array<any>; // Allow custom remark plugins
}

export class RemarkCleaner extends BaseTextCleaner {
  constructor() {
    super(
      'remark',
      'Process and transform Markdown documents',
      [TextFormat.MARKDOWN, TextFormat.PLAIN_TEXT],
      {
        enabled: true,
        priority: 60,
        options: {
          parseOptions: {
            gfm: true,
            footnotes: true,
            frontmatter: false,
            commonmark: false,
            pedantic: false
          },
          stringifyOptions: {
            bullet: '-',
            bulletOrdered: '.',
            closeAtx: false,
            emphasis: '*',
            fence: '`',
            fences: true,
            incrementListMarker: true,
            listItemIndent: 'one',
            quote: '"',
            resourceLink: true,
            rule: '-',
            ruleRepetition: 3,
            ruleSpaces: false,
            setext: false,
            strong: '*' as '*',
            tightDefinitions: false
          },
          transformations: {
            normalizeHeadings: true,
            removeFrontmatter: false,
            removeCodeBlocks: false,
            removeImages: false,
            removeLinks: false,
            removeEmphasis: false,
            removeBlockquotes: false,
            removeTables: false,
            removeFootnotes: false,
            removeHtmlComments: true,
            extractText: false,
            convertToHtml: false,
            minifyMarkdown: false,
            expandLinks: false,
            normalizeLineBreaks: true,
            fixBrokenLinks: false,
            removeEmptyParagraphs: true,
            normalizeLists: true,
            maxHeadingLevel: 6
          },
          customPlugins: []
        } as RemarkOptions
      }
    );
  }

  protected async performCleaning(input: string, config: ITextCleanerConfig): Promise<string> {
    const options = config.options as RemarkOptions;

    try {
      // Dynamically import the ESM modules
      const { unified } = await import('unified');
      const remarkParse = (await import('remark-parse')).default;
      const remarkStringify = (await import('remark-stringify')).default;
      const remarkHtml = (await import('remark-html')).default;

      // Create processor with parse options
      let processor = unified().use(remarkParse, options.parseOptions);

      // Add custom plugins if provided
      if (options.customPlugins && options.customPlugins.length > 0) {
        for (const plugin of options.customPlugins) {
          processor = processor.use(plugin);
        }
      }

      // Apply transformations
      processor = await this.applyTransformations(processor, options.transformations || {});

      // Configure output format and process
      let result: string;

      if (options.transformations?.extractText) {
        // For plain text extraction, we only need the AST, not processed output
        const tree = processor.parse(input);
        const processedTree = await processor.run(tree);
        result = this.extractPlainText(processedTree);
      } else {
        // For other formats, add appropriate compiler
        if (options.transformations?.convertToHtml) {
          processor = processor.use(remarkHtml) as any;
        } else {
          processor = processor.use(remarkStringify, options.stringifyOptions) as any;
        }

        // Process the markdown
        const file = await processor.process(input);
        result = String(file);
      }

      if (options.transformations?.minifyMarkdown) {
        result = this.minifyMarkdown(result);
      }

      if (options.transformations?.normalizeLineBreaks) {
        result = this.normalizeLineBreaks(result);
      }

      return result;
    } catch (error) {
      console.error(`Remark cleaning failed: ${error}`);
      throw new Error(`Markdown processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async applyTransformations(processor: any, transformations: any): Promise<any> {
    // Apply transformation plugins based on options
    if (transformations.normalizeHeadings) {
      processor = processor.use(() => (tree: any) => {
        this.visitNode(tree, 'heading', (node: any) => {
          if (transformations.maxHeadingLevel && node.depth > transformations.maxHeadingLevel) {
            node.depth = transformations.maxHeadingLevel;
          }
        });
      });
    }

    if (transformations.removeFrontmatter) {
      processor = processor.use(() => (tree: any) => {
        this.removeNodes(tree, 'yaml');
        this.removeNodes(tree, 'toml');
      });
    }

    if (transformations.removeCodeBlocks) {
      processor = processor.use(() => (tree: any) => {
        this.removeNodes(tree, 'code');
        this.removeNodes(tree, 'inlineCode');
      });
    }

    if (transformations.removeImages) {
      processor = processor.use(() => (tree: any) => {
        this.removeNodes(tree, 'image');
        this.removeNodes(tree, 'imageReference');
      });
    }

    if (transformations.removeLinks) {
      processor = processor.use(() => (tree: any) => {
        this.visitNode(tree, 'link', (node: any, index: number, parent: any) => {
          // Replace link with its text content
          if (node.children && parent) {
            parent.children.splice(index, 1, ...node.children);
          }
        });
        this.removeNodes(tree, 'linkReference');
        this.removeNodes(tree, 'definition');
      });
    }

    if (transformations.removeEmphasis) {
      processor = processor.use(() => (tree: any) => {
        this.visitNode(tree, 'emphasis', (node: any, index: number, parent: any) => {
          if (node.children && parent) {
            parent.children.splice(index, 1, ...node.children);
          }
        });
        this.visitNode(tree, 'strong', (node: any, index: number, parent: any) => {
          if (node.children && parent) {
            parent.children.splice(index, 1, ...node.children);
          }
        });
      });
    }

    if (transformations.removeBlockquotes) {
      processor = processor.use(() => (tree: any) => {
        this.removeNodes(tree, 'blockquote');
      });
    }

    if (transformations.removeTables) {
      processor = processor.use(() => (tree: any) => {
        this.removeNodes(tree, 'table');
      });
    }

    if (transformations.removeFootnotes) {
      processor = processor.use(() => (tree: any) => {
        this.removeNodes(tree, 'footnote');
        this.removeNodes(tree, 'footnoteReference');
        this.removeNodes(tree, 'footnoteDefinition');
      });
    }

    if (transformations.removeHtmlComments) {
      processor = processor.use(() => (tree: any) => {
        this.removeNodes(tree, 'html', (node: any) => {
          return node.value && node.value.trim().startsWith('<!--');
        });
      });
    }

    if (transformations.removeEmptyParagraphs) {
      processor = processor.use(() => (tree: any) => {
        this.removeNodes(tree, 'paragraph', (node: any) => {
          return !node.children || node.children.length === 0 ||
                 (node.children.length === 1 && node.children[0].type === 'text' &&
                  !node.children[0].value.trim());
        });
      });
    }

    if (transformations.expandLinks) {
      processor = processor.use(() => (tree: any) => {
        const definitions: Map<string, any> = new Map();

        // Collect all definitions
        this.visitNode(tree, 'definition', (node: any) => {
          definitions.set(node.identifier, node);
        });

        // Replace references with inline links
        this.visitNode(tree, 'linkReference', (node: any, index: number, parent: any) => {
          const def = definitions.get(node.identifier);
          if (def && parent) {
            const link = {
              type: 'link',
              url: def.url,
              title: def.title,
              children: node.children
            };
            parent.children[index] = link;
          }
        });

        // Remove definitions
        this.removeNodes(tree, 'definition');
      });
    }

    if (transformations.normalizeLists) {
      processor = processor.use(() => (tree: any) => {
        this.visitNode(tree, 'list', (node: any) => {
          // Ensure consistent list item structure
          if (node.children) {
            node.spread = false; // Make lists tight
          }
        });
      });
    }

    return processor;
  }

  private visitNode(tree: any, type: string, visitor: (node: any, index: number, parent: any) => void): void {
    const visit = (node: any, index: number = 0, parent: any = null) => {
      if (node.type === type) {
        visitor(node, index, parent);
      }
      if (node.children) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          visit(node.children[i], i, node);
        }
      }
    };
    visit(tree);
  }

  private removeNodes(tree: any, type: string, condition?: (node: any) => boolean): void {
    this.visitNode(tree, type, (node: any, index: number, parent: any) => {
      if (parent && (!condition || condition(node))) {
        parent.children.splice(index, 1);
      }
    });
  }

  private extractPlainText(ast: any): string {
    const extractText = (node: any): string => {
      if (node.type === 'text') {
        return node.value;
      }
      if (node.children) {
        return node.children.map(extractText).join(' ');
      }
      return '';
    };

    if (typeof ast === 'string') {
      // If it's already a string (from stringify), parse it first
      return ast.replace(/[#*`~\[\]()!]/g, '').replace(/\s+/g, ' ').trim();
    }

    return extractText(ast);
  }

  private minifyMarkdown(markdown: string): string {
    return markdown
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
      .replace(/^\s+/gm, '') // Remove leading whitespace
      .replace(/\s+$/gm, '') // Remove trailing whitespace
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private normalizeLineBreaks(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Windows to Unix
      .replace(/\r/g, '\n') // Mac to Unix
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .trim();
  }

  protected calculateStatistics(original: string, cleaned: string): ICleaningStatistics {
    // Count Markdown elements
    const countElements = (text: string) => ({
      headings: (text.match(/^#{1,6}\s/gm) || []).length,
      codeBlocks: (text.match(/```[\s\S]*?```/g) || []).length,
      inlineCode: (text.match(/`[^`]+`/g) || []).length,
      links: (text.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length,
      images: (text.match(/!\[([^\]]*)\]\([^)]+\)/g) || []).length,
      emphasis: (text.match(/(\*|_)[^*_]+(\*|_)/g) || []).length,
      strong: (text.match(/(\*\*|__)[^*_]+(\*\*|__)/g) || []).length,
      lists: (text.match(/^[\s]*[-*+]\s/gm) || []).length,
      blockquotes: (text.match(/^>/gm) || []).length,
      tables: (text.match(/\|.*\|/g) || []).length
    });

    const originalElements = countElements(original);
    const cleanedElements = countElements(cleaned);

    return {
      custom: {
        headingsRemoved: originalElements.headings - cleanedElements.headings,
        codeBlocksRemoved: originalElements.codeBlocks - cleanedElements.codeBlocks,
        inlineCodeRemoved: originalElements.inlineCode - cleanedElements.inlineCode,
        linksRemoved: originalElements.links - cleanedElements.links,
        imagesRemoved: originalElements.images - cleanedElements.images,
        emphasisRemoved: originalElements.emphasis - cleanedElements.emphasis,
        strongRemoved: originalElements.strong - cleanedElements.strong,
        listsModified: originalElements.lists - cleanedElements.lists,
        blockquotesRemoved: originalElements.blockquotes - cleanedElements.blockquotes,
        tablesRemoved: originalElements.tables - cleanedElements.tables,
        totalElementsOriginal: Object.values(originalElements).reduce((a, b) => a + b, 0) as any,
        totalElementsCleaned: Object.values(cleanedElements).reduce((a, b) => a + b, 0) as any,
        markdownComplexity: (
          originalElements.headings * 2 +
          originalElements.codeBlocks * 3 +
          originalElements.tables * 4
        ) as any
      }
    };
  }

  protected generateWarnings(original: string, cleaned: string): string[] | undefined {
    const warnings: string[] = [];
    const options = this.config.options as RemarkOptions;

    if (cleaned.length === 0) {
      warnings.push('Result is empty after processing');
    }

    if (options.transformations?.removeCodeBlocks && original.includes('```')) {
      warnings.push('Code blocks were removed from the document');
    }

    if (options.transformations?.removeLinks) {
      const linkCount = (original.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;
      if (linkCount > 0) {
        warnings.push(`${linkCount} links were removed or converted to text`);
      }
    }

    if (options.transformations?.maxHeadingLevel) {
      const deepHeadings = (original.match(/^#{7,}\s/gm) || []).length;
      if (deepHeadings > 0) {
        warnings.push(`Heading levels were limited to ${options.transformations.maxHeadingLevel}`);
      }
    }

    if (options.transformations?.extractText && cleaned.length < original.length * 0.5) {
      warnings.push('Plain text extraction removed more than 50% of content');
    }

    if (options.transformations?.convertToHtml) {
      warnings.push('Markdown was converted to HTML format');
    }

    return warnings.length > 0 ? warnings : undefined;
  }

  protected validateSpecificConfig(
    config: ITextCleanerConfig,
    errors: string[],
    warnings: string[]
  ): void {
    const options = config.options as RemarkOptions;

    if (options.transformations?.maxHeadingLevel !== undefined) {
      if (options.transformations.maxHeadingLevel < 1 || options.transformations.maxHeadingLevel > 6) {
        errors.push('Max heading level must be between 1 and 6');
      }
    }

    if (options.stringifyOptions?.ruleRepetition !== undefined) {
      if (options.stringifyOptions.ruleRepetition < 3) {
        warnings.push('Rule repetition less than 3 may not render properly');
      }
    }

    if (options.transformations?.extractText && options.transformations?.convertToHtml) {
      errors.push('Cannot both extract plain text and convert to HTML');
    }

    if (options.transformations?.minifyMarkdown && options.transformations?.convertToHtml) {
      warnings.push('Minifying markdown before HTML conversion may affect output');
    }

    if (options.parseOptions?.pedantic && options.parseOptions?.gfm) {
      warnings.push('Pedantic and GFM modes may conflict');
    }
  }
}