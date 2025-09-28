/**
 * URL Management Routes
 * Handles all URL-related operations including CRUD, batch operations, and metadata management
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { KnowledgeBaseService } from '../services/KnowledgeBaseService';
import { UrlStatus } from '../../../src/interfaces/IUrlRepository';

const router = Router();
const kbService = KnowledgeBaseService.getInstance();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * GET /api/urls
 * Get all URLs with optional filtering
 */
router.get('/',
  [
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'skipped']),
    query('tags').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
    query('search').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const filter = {
        status: req.query.status as UrlStatus,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        limit: parseInt(req.query.limit as string) || 100,
        offset: parseInt(req.query.offset as string) || 0,
        search: req.query.search as string
      };

      const urls = await kbService.getUrls(filter);
      const total = await kbService.getUrlCount(filter);

      res.json({
        data: urls,
        meta: {
          total,
          limit: filter.limit,
          offset: filter.offset
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/urls/:id
 * Get a single URL by ID
 */
router.get('/:id',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const url = await kbService.getUrlById(req.params.id);
      if (!url) {
        return res.status(404).json({ error: 'URL not found' });
      }
      res.json(url);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/urls
 * Add a single URL
 */
router.post('/',
  [
    body('url').isURL(),
    body('tags').optional().isArray(),
    body('scraperConfig').optional().isObject(),
    body('cleanerConfig').optional().isObject(),
    body('metadata').optional().isObject(),
    body('authority').optional().isFloat({ min: 0, max: 100 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await kbService.addUrl({
        url: req.body.url,
        tags: req.body.tags,
        scraperConfig: req.body.scraperConfig,
        cleanerConfig: req.body.cleanerConfig,
        metadata: req.body.metadata,
        authority: req.body.authority
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/urls/batch
 * Add multiple URLs in batch
 */
router.post('/batch',
  [
    body('urls').isArray({ min: 1, max: 1000 }),
    body('urls.*.url').isURL(),
    body('urls.*.tags').optional().isArray(),
    body('commonTags').optional().isArray(),
    body('commonScraperConfig').optional().isObject(),
    body('commonCleanerConfig').optional().isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { urls, commonTags, commonScraperConfig, commonCleanerConfig } = req.body;

      // Merge common settings with individual URL settings
      const processedUrls = urls.map((urlData: any) => ({
        ...urlData,
        tags: [...(urlData.tags || []), ...(commonTags || [])],
        scraperConfig: { ...commonScraperConfig, ...(urlData.scraperConfig || {}) },
        cleanerConfig: { ...commonCleanerConfig, ...(urlData.cleanerConfig || {}) }
      }));

      const results = await kbService.addUrlsBatch(processedUrls);
      res.status(201).json({
        success: results.filter((r: any) => r.success).length,
        failed: results.filter((r: any) => !r.success).length,
        results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/urls/:id
 * Update a URL's metadata and configuration
 */
router.put('/:id',
  [
    param('id').isUUID(),
    body('metadata').optional().isObject(),
    body('scraperConfig').optional().isObject(),
    body('cleanerConfig').optional().isObject(),
    body('authority').optional().isFloat({ min: 0, max: 100 }),
    body('tags').optional().isArray()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await kbService.updateUrl(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PATCH /api/urls/batch
 * Update multiple URLs in batch
 */
router.patch('/batch',
  [
    body('ids').isArray({ min: 1 }),
    body('ids.*').isUUID(),
    body('updates').isObject(),
    body('updates.tags').optional().isArray(),
    body('updates.scraperConfig').optional().isObject(),
    body('updates.cleanerConfig').optional().isObject(),
    body('updates.authority').optional().isFloat({ min: 0, max: 100 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { ids, updates } = req.body;
      const results = await kbService.updateUrlsBatch(ids, updates);
      res.json({
        updated: results.filter((r: any) => r.success).length,
        failed: results.filter((r: any) => !r.success).length,
        results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/urls/:id
 * Delete a single URL
 */
router.delete('/:id',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      await kbService.deleteUrl(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/urls/:id/tags
 * Add tags to a URL
 */
router.post('/:id/tags',
  [
    param('id').isUUID(),
    body('tags').isArray({ min: 1 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await kbService.addTagsToUrl(req.params.id, req.body.tags);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/urls/:id/tags/:tagId
 * Remove a tag from a URL
 */
router.delete('/:id/tags/:tagId',
  [
    param('id').isUUID(),
    param('tagId').isUUID()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      await kbService.removeTagFromUrl(req.params.id, req.params.tagId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PATCH /api/urls/:id/authority
 * Update URL authority score
 */
router.patch('/:id/authority',
  [
    param('id').isUUID(),
    body('authority').isFloat({ min: 0, max: 100 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await kbService.updateUrlAuthority(req.params.id, req.body.authority);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PATCH /api/urls/batch/authority
 * Update authority for multiple URLs
 */
router.patch('/batch/authority',
  [
    body('ids').isArray({ min: 1 }),
    body('ids.*').isUUID(),
    body('authority').isFloat({ min: 0, max: 100 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { ids, authority } = req.body;
      const results = await kbService.updateUrlsAuthorityBatch(ids, authority);
      res.json({
        updated: results.filter((r: any) => r.success).length,
        failed: results.filter((r: any) => !r.success).length,
        results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;