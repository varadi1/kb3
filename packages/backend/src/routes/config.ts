import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { KB3Service } from '../services/kb3Service';
import { ParameterService } from '../services/parameterService';
import { ParameterStorageService } from '../services/parameterStorageService';

const router = Router();
const kb3Service = KB3Service.getInstance();
const parameterService = new ParameterService();
const parameterStorage = new ParameterStorageService();

// Initialize parameter storage
parameterStorage.initialize().catch(err => {
  console.error('Failed to initialize parameter storage:', err);
});

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
    // Get the actual scraper configurations from kb3Service
    const scraperConfigs = await kb3Service.getScraperConfigs();

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
    // Get the actual cleaner configurations from kb3Service
    const cleanerConfigs = await kb3Service.getCleanerConfigs();

    res.json({
      success: true,
      data: cleanerConfigs
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/config/scrapers - Update scraper configuration
router.put('/scrapers',
  [
    body('scrapers').isArray(),
    body('scrapers.*.type').isString(),
    body('scrapers.*.enabled').isBoolean(),
    body('scrapers.*.priority').isInt({ min: 0, max: 100 }),
    body('scrapers.*.parameters').optional().isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scrapers } = req.body;
      await kb3Service.updateScraperConfigs(scrapers);

      res.json({
        success: true,
        message: 'Scraper configuration updated successfully',
        data: scrapers
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/config/cleaners - Update cleaner configuration
router.put('/cleaners',
  [
    body('cleaners').isArray(),
    body('cleaners.*.type').isString(),
    body('cleaners.*.enabled').isBoolean(),
    body('cleaners.*.order').isInt({ min: 0, max: 100 }),
    body('cleaners.*.parameters').optional().isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cleaners } = req.body;
      await kb3Service.updateCleanerConfigs(cleaners);

      res.json({
        success: true,
        message: 'Cleaner configuration updated successfully',
        data: cleaners
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/config/url/:id - Get URL-specific configuration
router.get('/url/:id',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const config = await kb3Service.getUrlParameters(id);

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'No configuration found for this URL'
        });
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/config/url/:id - Set URL-specific configuration
router.post('/url/:id(*)',
  [
    param('id').isString().custom((value) => {
      // Validate URL ID format - no consecutive dots or invalid characters
      if (value.includes('..') || /[<>:"\|?*]/.test(value)) {
        throw new Error('Invalid URL ID format');
      }
      return true;
    }),
    body('scraperConfig').optional().isObject(),
    body('cleanerConfigs').optional().isArray()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { scraperConfig, cleanerConfigs } = req.body;

      // Set URL parameters if scraperConfig is provided
      if (scraperConfig) {
        await kb3Service.setUrlParameters(id, {
          scraperType: scraperConfig.type,
          parameters: scraperConfig.parameters || scraperConfig
        });
      }

      // Set cleaners if provided
      if (cleanerConfigs) {
        await kb3Service.setUrlCleaners(id, cleanerConfigs);
      }

      res.json({
        success: true,
        message: 'URL configuration updated'
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/config/url/:id - Remove URL-specific configuration
router.delete('/url/:id',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await kb3Service.removeUrlParameters(id);

      res.json({
        success: true,
        message: 'Configuration removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/config/templates - Get configuration templates
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await kb3Service.getConfigTemplates();

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
    body('scraperConfigs').isArray(),
    body('cleanerConfigs').isArray()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = req.body;
      const result = await kb3Service.saveConfigTemplate(template);

      res.status(201).json({
        success: true,
        message: 'Template saved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/config/scrapers/:type/schema - Get parameter schema for a scraper
router.get('/scrapers/:type/schema', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const schema = parameterService.getParameterSchema(type);

    if (!schema) {
      return res.status(404).json({
        success: false,
        message: `Schema not found for scraper type: ${type}`
      });
    }

    res.json({
      success: true,
      data: schema
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/scrapers/:type/defaults - Get default parameters for a scraper
router.get('/scrapers/:type/defaults', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const defaults = parameterService.getDefaultParameters(type);

    if (!defaults) {
      return res.status(404).json({
        success: false,
        message: `Default parameters not found for scraper type: ${type}`
      });
    }

    res.json({
      success: true,
      data: defaults
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/config/scrapers/:type/validate - Validate parameters for a scraper
router.post('/scrapers/:type/validate',
  [
    param('type').isString(),
    body('parameters').isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;
      const { parameters } = req.body;

      const validation = parameterService.validateParameters(type, parameters);

      res.json({
        success: validation.valid,
        data: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          normalizedParams: validation.normalizedParams
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/config/scrapers/schemas - Get all scraper parameter schemas
router.get('/scrapers/schemas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schemas = parameterService.getAllParameterSchemas();

    res.json({
      success: true,
      data: schemas
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/url/:id/parameters - Get detailed parameters for a URL
router.get('/url/:id/parameters',
  [param('id').isString()],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Get from kb3Service first (it has persistent storage)
      let parameters = await kb3Service.getUrlParameters(id);

      // If not found, check our parameter storage
      if (!parameters) {
        const storedConfig = await parameterStorage.getParameters(id);
        if (storedConfig) {
          parameters = {
            scraperType: storedConfig.scraperType,
            parameters: storedConfig.parameters,
            priority: storedConfig.priority
          };
        }
      }

      res.json({
        success: true,
        data: parameters
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/config/url/:id/parameters - Set detailed parameters for a URL
router.post('/url/:id/parameters',
  [
    param('id').isString(),
    body('scraperType').isString(),
    body('parameters').isObject(),
    body('priority').optional().isInt({ min: 0, max: 100 }),
    body('enabled').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { scraperType, parameters, priority, enabled } = req.body;

      // Validate parameters
      const validation = parameterService.validateParameters(scraperType, parameters);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: validation.errors
        });
      }

      // Store in both systems for consistency
      const config = {
        scraperType,
        parameters: validation.normalizedParams,
        priority: priority || 10,
        enabled: enabled !== false
      };

      // Store in parameter storage
      await parameterStorage.saveParameters(id, config);

      // Also update in kb3Service
      await kb3Service.setUrlParameters(id, {
        scraperType,
        parameters: validation.normalizedParams,
        priority
      });

      res.json({
        success: true,
        message: 'Parameters saved successfully',
        data: {
          url: id,
          ...config
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/config/url/:id/parameters - Remove parameters for a URL
router.delete('/url/:id/parameters',
  [param('id').isString()],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Remove from both storage systems
      await parameterStorage.deleteParameters(id);
      await kb3Service.removeUrlParameters(id);

      res.json({
        success: true,
        message: 'Parameters removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/config/batch/parameters - Set parameters for multiple URLs
router.post('/batch/parameters',
  [
    body('urls').isArray().notEmpty(),
    body('scraperType').isString(),
    body('parameters').isObject(),
    body('priority').optional().isInt({ min: 0, max: 100 }),
    body('enabled').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { urls, scraperType, parameters, priority, enabled } = req.body;

      // Validate parameters
      const validation = parameterService.validateParameters(scraperType, parameters);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: validation.errors
        });
      }

      const config = {
        scraperType,
        parameters: validation.normalizedParams,
        priority: priority || 10,
        enabled: enabled !== false
      };

      // Save to storage for all URLs
      const configs = urls.map((url: string) => ({ url, config }));
      await parameterStorage.saveParametersBatch(configs);

      // Also update in kb3Service for each URL
      for (const url of urls) {
        await kb3Service.setUrlParameters(url, {
          scraperType,
          parameters: validation.normalizedParams,
          priority
        });
      }

      res.json({
        success: true,
        message: `Parameters saved for ${urls.length} URLs`,
        data: {
          count: urls.length,
          config
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/config/parameters/stats - Get parameter configuration statistics
router.get('/parameters/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await parameterStorage.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/config/test - Test configuration on a URL
router.post('/test',
  [
    body('url').isURL(),
    body('scraperType').optional().isString(),
    body('scraperConfig').optional().isObject(),
    body('cleaners').optional().isArray(),
    body('cleanerConfigs').optional().isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url, scraperType, scraperConfig, cleaners, cleanerConfigs } = req.body;

      // Build configuration from request
      const config = {
        scraperType: scraperType || scraperConfig?.type || 'http',
        scraperConfig: scraperConfig || {},
        cleaners: cleaners || ['sanitizehtml']
      };

      // Process the URL with the test configuration
      const result = await kb3Service.processUrl(url, config);

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