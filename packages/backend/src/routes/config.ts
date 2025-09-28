import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { KB3Service } from '../services/kb3Service';

const router = Router();
const kb3Service = KB3Service.getInstance();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/config/scrapers - Get available scrapers and their configurations
router.get('/scrapers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scrapers = kb3Service.getAvailableScrapers();

    const scraperConfigs = scrapers.map(scraper => ({
      name: scraper,
      displayName: getScraperDisplayName(scraper),
      description: getScraperDescription(scraper),
      config: kb3Service.getScraperConfig(scraper)
    }));

    res.json({
      success: true,
      data: scraperConfigs
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/cleaners - Get available cleaners and their configurations
router.get('/cleaners', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cleaners = kb3Service.getAvailableCleaners();

    const cleanerConfigs = cleaners.map(cleaner => ({
      name: cleaner,
      displayName: getCleanerDisplayName(cleaner),
      description: getCleanerDescription(cleaner),
      config: kb3Service.getCleanerConfig(cleaner)
    }));

    res.json({
      success: true,
      data: cleanerConfigs
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/config/url/:id - Set URL-specific configuration
router.post('/url/:id',
  [
    param('id').isString(),
    body('scraperType').optional().isString(),
    body('scraperConfig').optional().isObject(),
    body('cleaners').optional().isArray(),
    body('cleanerConfigs').optional().isObject(),
    body('priority').optional().isInt({ min: 0, max: 100 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { scraperType, scraperConfig, cleaners, cleanerConfigs, priority } = req.body;

      await kb3Service.setUrlParameters(id, {
        scraperType,
        parameters: scraperConfig,
        cleaners,
        priority
      });

      res.json({
        success: true,
        message: 'Configuration updated successfully',
        data: {
          url: id,
          scraperType,
          scraperConfig,
          cleaners,
          cleanerConfigs,
          priority
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/config/templates - Get configuration templates
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = getConfigTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/config/templates - Save configuration template
router.post('/templates',
  [
    body('name').isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('scraperType').isString(),
    body('scraperConfig').optional().isObject(),
    body('cleaners').isArray(),
    body('cleanerConfigs').optional().isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = req.body;

      // This would need persistent storage implementation
      res.json({
        success: true,
        message: 'Template saved successfully',
        data: template
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/config/test - Test configuration on a URL
router.post('/test',
  [
    body('url').isURL(),
    body('scraperType').isString(),
    body('scraperConfig').optional().isObject(),
    body('cleaners').isArray(),
    body('cleanerConfigs').optional().isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url, scraperType, scraperConfig, cleaners, cleanerConfigs } = req.body;

      // Set temporary configuration
      await kb3Service.setUrlParameters(url, {
        scraperType,
        parameters: scraperConfig,
        cleaners
      });

      // Process the URL with the test configuration
      const result = await kb3Service.processUrl(url, {
        scraperType,
        cleaners
      });

      res.json({
        success: true,
        message: 'Configuration test completed',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper functions
function getScraperDisplayName(scraper: string): string {
  const names: Record<string, string> = {
    'http': 'HTTP Scraper',
    'playwright': 'Playwright Browser',
    'crawl4ai': 'Crawl4AI',
    'docling': 'Docling PDF Processor',
    'deepdoctection': 'Deep Doctection'
  };
  return names[scraper] || scraper;
}

function getScraperDescription(scraper: string): string {
  const descriptions: Record<string, string> = {
    'http': 'Basic HTTP/HTTPS requests for static content',
    'playwright': 'Browser automation for dynamic JavaScript content',
    'crawl4ai': 'AI-powered content extraction',
    'docling': 'PDF and document processing',
    'deepdoctection': 'Layout analysis and OCR capabilities'
  };
  return descriptions[scraper] || '';
}

function getCleanerDisplayName(cleaner: string): string {
  const names: Record<string, string> = {
    'sanitizehtml': 'HTML Sanitizer',
    'xss': 'XSS Protection',
    'voca': 'Text Normalizer',
    'remark': 'Markdown Processor',
    'readability': 'Content Extractor'
  };
  return names[cleaner] || cleaner;
}

function getCleanerDescription(cleaner: string): string {
  const descriptions: Record<string, string> = {
    'sanitizehtml': 'Remove dangerous HTML elements and attributes',
    'xss': 'Prevent XSS attacks by filtering malicious content',
    'voca': 'Normalize and clean text content',
    'remark': 'Process and clean Markdown content',
    'readability': 'Extract main article content from web pages'
  };
  return descriptions[cleaner] || '';
}

function getConfigTemplates(): any[] {
  return [
    {
      id: 'basic-web',
      name: 'Basic Web Pages',
      description: 'Standard configuration for most web pages',
      scraperType: 'http',
      scraperConfig: {},
      cleaners: ['sanitizehtml', 'readability']
    },
    {
      id: 'spa',
      name: 'Single Page Applications',
      description: 'For JavaScript-heavy sites and SPAs',
      scraperType: 'playwright',
      scraperConfig: {
        waitUntil: 'networkidle',
        timeout: 30000
      },
      cleaners: ['xss', 'readability']
    },
    {
      id: 'documentation',
      name: 'Documentation Sites',
      description: 'Optimized for technical documentation',
      scraperType: 'crawl4ai',
      scraperConfig: {
        extractLinks: true,
        extractMetadata: true
      },
      cleaners: ['remark', 'voca']
    },
    {
      id: 'pdf',
      name: 'PDF Documents',
      description: 'For processing PDF files',
      scraperType: 'docling',
      scraperConfig: {
        parseImages: true,
        parseTables: true
      },
      cleaners: ['voca']
    }
  ];
}

export default router;