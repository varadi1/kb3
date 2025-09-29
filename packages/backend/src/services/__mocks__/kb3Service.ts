import { EventEmitter } from 'events';

export class KB3Service extends EventEmitter {
  private static instance: KB3Service;
  private processingQueue: Map<string, any> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): KB3Service {
    if (!KB3Service.instance) {
      KB3Service.instance = new KB3Service();
    }
    return KB3Service.instance;
  }

  private setupEventHandlers(): void {
    // Mock implementation
  }

  // URL Management
  async getUrls(options?: any): Promise<any> {
    return [];
  }

  async getUrlById(id: string): Promise<any> {
    return { id, url: 'http://test.com', status: 'pending', tags: [] };
  }

  async addUrl(url: string, tags?: string[]): Promise<any> {
    return { id: '1', url, tags: tags || [], success: true };
  }

  async addUrls(urls: Array<{ url: string; tags?: string[] }>): Promise<any> {
    return urls.map((u, i) => ({ id: String(i), ...u }));
  }

  async updateUrl(id: string, updates: any): Promise<boolean> {
    return true;
  }

  async deleteUrl(id: string): Promise<boolean> {
    return true;
  }

  // Tag Management
  private tags: Map<string, any> = new Map();
  private tagIdCounter: number = 1;

  async getTags(): Promise<any[]> {
    // Return all tags as flat array - the route will build the hierarchy
    return Array.from(this.tags.values());
  }

  async createTag(name: string, parentName?: string, metadata?: any): Promise<any> {
    const tagId = String(this.tagIdCounter++);
    let parentId = undefined;

    // Find parent tag by name if provided
    if (parentName) {
      const parentTag = Array.from(this.tags.values()).find(t => t.name === parentName);
      parentId = parentTag?.id;
    }

    const newTag = {
      id: tagId,
      name,
      parentId,
      parentName,
      metadata
    };

    this.tags.set(tagId, newTag);
    return newTag;
  }

  async updateTag(id: number, updates: any): Promise<boolean> {
    return true;
  }

  async deleteTag(id: number): Promise<boolean> {
    return true;
  }

  async addTagsToUrl(id: string, tags: string[]): Promise<boolean> {
    return true;
  }

  async removeTagsFromUrl(id: string, tags: string[]): Promise<boolean> {
    return true;
  }

  // Processing
  async processUrl(url: string, options?: any): Promise<any> {
    if (!url || url === '') {
      const error = new Error('URL is required');
      this.emit('error', error);
      throw error;
    }
    this.emit('processing:started', { url });
    const result = {
      url,
      status: 'completed',
      content: 'test content',
      metadata: {},
      success: true
    };
    this.emit('processing:completed', { url, result });
    return result;
  }

  async processUrlBatch(urls: string[], options?: any): Promise<any[]> {
    this.emit('batch:started', { count: urls.length });
    const results = await Promise.all(urls.map(url => this.processUrl(url, options)));
    this.emit('batch:completed', { results });
    return results;
  }

  async processUrls(urls: string[], options?: any): Promise<any[]> {
    return this.processUrlBatch(urls, options);
  }

  async processUrlsByTags(tags: string[], options?: any): Promise<any[]> {
    return [];
  }

  // Content Management
  async getContent(id: string): Promise<any> {
    return { id, content: 'test content', success: true };
  }

  async getOriginalContent(id: string): Promise<any> {
    if (id === 'missing' || id === 'non-existent-id') {
      return null;
    }
    // Return Buffer for original content
    return Buffer.from('This is the original content with <script>alert("xss")</script> and more text here for testing purposes. ' +
                       'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.');
  }

  async getCleanedContent(id: string): Promise<any> {
    if (id === 'missing' || id === 'non-existent-id') {
      return null;
    }
    // Return cleaned string
    return 'This is the cleaned content and more text here for testing purposes. ' +
           'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  }

  async searchContent(query: string, options?: any): Promise<any[]> {
    return [];
  }

  // Configuration
  async setUrlParameters(url: string, params: any): Promise<void> {
    // Mock implementation
  }

  async getUrlParameters(url: string): Promise<any> {
    return { scraperType: 'http', cleaners: ['sanitizehtml'] };
  }

  getScraperConfig(scraperType: string): any {
    if (scraperType === 'playwright') {
      return {
        headless: true,
        viewport: { width: 1920, height: 1080 },
        waitUntil: 'networkidle'
      };
    }
    return { type: scraperType, config: {} };
  }

  getCleanerConfig(cleanerType: string): any {
    if (cleanerType === 'sanitizehtml') {
      return {
        allowedTags: ['p', 'div', 'span'],
        allowedAttributes: {}
      };
    }
    return { type: cleanerType, config: {} };
  }

  async setScraper(url: string, scraperType: string, params?: any): Promise<void> {
    // Mock implementation
  }

  async setCleaners(url: string, cleaners: string[]): Promise<void> {
    // Mock implementation
  }

  getAvailableScrapers(): string[] {
    return ['http', 'playwright', 'crawl4ai', 'docling', 'deepdoctection'];
  }

  getAvailableCleaners(): string[] {
    return ['sanitizehtml', 'readability', 'xss', 'voca', 'remark'];
  }

  async getScraperConfigs(): Promise<any[]> {
    return [
      {
        name: 'http',
        type: 'http',
        enabled: true,
        priority: 10,
        parameters: {}
      },
      {
        name: 'playwright',
        type: 'playwright',
        enabled: true,
        priority: 20,
        parameters: {
          headless: true,
          viewport: { width: 1920, height: 1080 }
        }
      },
      {
        name: 'crawl4ai',
        type: 'crawl4ai',
        enabled: false,
        priority: 15,
        parameters: {}
      }
    ];
  }

  async getCleanerConfigs(): Promise<any[]> {
    return [
      {
        name: 'sanitizehtml',
        type: 'sanitizehtml',
        enabled: true,
        order: 1,
        parameters: {
          allowedTags: ['p', 'div', 'span'],
          allowedAttributes: {}
        }
      },
      {
        name: 'readability',
        type: 'readability',
        enabled: true,
        order: 2,
        parameters: {}
      },
      {
        name: 'xss',
        type: 'xss',
        enabled: false,
        order: 3,
        parameters: {}
      }
    ];
  }

  async updateScraperConfigs(scrapers: any[]): Promise<void> {
    // Mock implementation
  }

  async updateCleanerConfigs(cleaners: any[]): Promise<void> {
    // Mock implementation
  }

  async getQueueStatus(): Promise<any> {
    return {
      queue: [],
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0
    };
  }

  async getUrl(id: string): Promise<any> {
    return {
      id,
      url: `http://test${id}.com`,
      status: 'pending',
      tags: [],
      authority: 0
    };
  }

  async deleteUrls(ids: string[]): Promise<{ successful: number; failed: string[] }> {
    return {
      successful: ids.length,
      failed: []
    };
  }

  async addTagsToUrlById(id: string, tags: string[]): Promise<boolean> {
    return true;
  }

  async setUrlTags(id: string, tags: string[]): Promise<boolean> {
    return true;
  }

  async updateUrlAuthority(id: string, authority: number): Promise<boolean> {
    return true;
  }

  async reprocessUrl(id: string, options?: any): Promise<any> {
    return {
      success: true,
      url: `http://test${id}.com`,
      result: 'Reprocessed successfully'
    };
  }

  // Configuration Templates
  getConfigurationTemplates(): any[] {
    return [
      {
        id: 'pdf',
        name: 'PDF Documents',
        scraperType: 'docling',
        scraperConfig: { extractImages: true },
        cleaners: ['sanitizehtml', 'readability']
      },
      {
        id: 'spa',
        name: 'Single Page Applications',
        scraperType: 'playwright',
        scraperConfig: { waitUntil: 'networkidle' },
        cleaners: ['sanitizehtml', 'xss']
      },
      {
        id: 'api-docs',
        name: 'API Documentation',
        scraperType: 'http',
        scraperConfig: {},
        cleaners: ['sanitizehtml', 'voca']
      }
    ];
  }

  async testConfiguration(url: string, config: any): Promise<any> {
    return { success: true, result: 'Configuration test successful' };
  }

  // Statistics
  async getStatistics(): Promise<any> {
    return {
      totalUrls: 0,
      processedUrls: 0,
      failedUrls: 0,
      processing: 0,
      queue: 0,
      tags: 0
    };
  }

  // Export/Import
  async exportData(format: 'json' | 'csv' | 'txt'): Promise<any> {
    return { urls: [], tags: [] };
  }

  async importData(data: any, format: 'json' | 'csv' | 'txt'): Promise<any> {
    return { success: true, imported: 0 };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.tags.clear();
    this.tagIdCounter = 1;
    KB3Service.instance = undefined as any;
  }
}

export default KB3Service;