import { EventEmitter } from 'events';

export class KB3Service extends EventEmitter {
  private static instance: KB3Service;
  private processingQueue: Map<string, any> = new Map();

  // Make these jest functions so tests can spy on them
  addTagsToUrl = jest.fn().mockImplementation(async (id: string, tags: string[]) => true);
  removeTagsFromUrl = jest.fn().mockImplementation(async (id: string, tags: string[]) => true);
  setUrlTags = jest.fn().mockImplementation(async (id: string, tags: string[]) => true);

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

    // Check if we should process by authority (support both orderByAuthority and prioritizeByAuthority)
    if (options?.orderByAuthority || options?.prioritizeByAuthority) {
      // Get URL details with authority - this will call getUrl if mocked
      const urlsWithAuthority = await Promise.all(urls.map(async (url) => {
        // If getUrl is mocked by tests, use it to get authority
        if (jest.isMockFunction(this.getUrl)) {
          const urlDetails = await this.getUrl(url);
          return {
            url,
            authority: urlDetails?.authority || 0
          };
        }
        // Otherwise use default method
        return {
          url,
          authority: this.getUrlAuthority(url)
        };
      }));

      urlsWithAuthority.sort((a, b) => b.authority - a.authority);

      // Process in order of authority
      for (const item of urlsWithAuthority) {
        this.emit('processing:started', { url: item.url, authority: item.authority });
      }
    }

    const results = await Promise.all(urls.map(url => this.processUrl(url, options)));
    this.emit('batch:completed', { results });
    return results;
  }

  private getUrlAuthority(url: string): number {
    // Mock authority values for testing
    if (url.includes('high-auth')) return 5;
    if (url.includes('med-auth')) return 3;
    return 1;
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
    if (id === 'missing' || id === 'non-existent-id' || id === 'non-existent') {
      return null;
    }
    // Return Buffer directly for download route
    const content = 'Original HTML content with <script>alert("xss")</script>';
    return Buffer.from(content);
  }

  async getCleanedContent(id: string): Promise<any> {
    if (id === 'missing' || id === 'non-existent-id' || id === 'non-existent') {
      return null;
    }
    // Return string directly for cleaned content
    return 'Sanitized and cleaned text content';
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
    // Call the mock function that tests are expecting
    this.addTagsToUrl(id, tags);
    return true;
  }

  async removeTagsFromUrlById(id: string, tags: string[]): Promise<boolean> {
    // Call the mock function that tests are expecting
    this.removeTagsFromUrl(id, tags);
    return true;
  }

  async setUrlTagsById(id: string, tags: string[]): Promise<boolean> {
    // Call the mock function that tests are expecting
    this.setUrlTags(id, tags);
    return true;
  }


  private authorityUpdateCount = 0;

  async updateUrlAuthority(id: string, authority: number): Promise<boolean> {
    this.authorityUpdateCount++;
    return true;
  }

  // Helper for tests to check authority update calls
  getAuthorityUpdateCount(): number {
    return this.authorityUpdateCount;
  }

  // Reset helper for tests
  resetCounters(): void {
    this.authorityUpdateCount = 0;
    this.existingUrls.clear();
  }

  async reprocessUrl(id: string, options?: any): Promise<any> {
    return {
      success: true,
      url: `http://test${id}.com`,
      result: 'Reprocessed successfully'
    };
  }

  async getContentMetadata(id: string): Promise<any> {
    return {
      url: `http://test${id}.com`,
      status: 'completed',
      scraperUsed: 'playwright',
      cleanersUsed: ['sanitize-html', 'xss'],
      processingTime: 1250,
      statistics: {
        originalSize: 50000,
        cleanedSize: 15000,
        reduction: 70
      },
      authority: 3,
      processedAt: '2024-01-01T12:00:00Z'
    };
  }

  async setUrlCleaners(id: string, cleaners: any): Promise<void> {
    // Mock implementation
  }

  async saveConfigTemplate(template: any): Promise<any> {
    return {
      id: 'template-new',
      ...template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async getConfigTemplates(): Promise<any[]> {
    return [
      {
        id: 'template-1',
        name: 'PDF Processing',
        description: 'Optimized for PDF documents',
        scraperType: 'docling',
        scraperConfigs: [
          { type: 'docling', enabled: true, priority: 30, parameters: {} }
        ],
        cleanerConfigs: [
          { type: 'sanitize-html', enabled: true, order: 1, parameters: {} }
        ]
      },
      {
        id: 'template-2',
        name: 'SPA Websites',
        description: 'For JavaScript-heavy sites',
        scraperType: 'playwright',
        scraperConfigs: [
          { type: 'playwright', enabled: true, priority: 20, parameters: {} }
        ],
        cleanerConfigs: [
          { type: 'readability', enabled: true, order: 1, parameters: {} }
        ]
      }
    ];
  }

  async getStats(): Promise<any> {
    return {
      totalUrls: 100,
      processedUrls: 75,
      failedUrls: 5,
      processing: 2,
      queue: 18
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
  async exportData(options?: any): Promise<any> {
    // Return mock data directly as array
    return [];
  }

  private existingUrls = new Set<string>();

  async importData(data: any, format: string): Promise<any> {
    // Handle both array and object with urls property
    const urls = Array.isArray(data) ? data : (data && data.urls ? data.urls : []);

    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    // Process each URL
    for (const item of urls) {
      try {
        // Call addUrl (which may be mocked by tests)
        // The test controls validation through mocked addUrl
        const result = await this.addUrl(item.url, item.tags);

        // If we get here, it was successful
        successful++;

        // Handle authority preservation if specified
        if (item.authority !== undefined && item.authority !== null) {
          await this.updateUrl(item.url, { authority: item.authority });
        }
      } catch (error: any) {
        // All errors are counted as failures (matching real service behavior)
        failed++;
        errors.push({ url: item.url, error: error.message });
      }
    }

    return {
      success: true,
      total: urls.length,
      successful,
      failed,
      errors
    };
  }

  // Cleanup
  async removeUrlParameters(id: string): Promise<void> {
    // Mock implementation
  }

  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.tags.clear();
    this.tagIdCounter = 1;
    KB3Service.instance = undefined as any;
  }
}

export default KB3Service;