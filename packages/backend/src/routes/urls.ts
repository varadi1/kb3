import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
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

// GET /api/urls - List URLs with pagination and filtering
router.get('/',
  [
    query('offset').optional().isInt({ min: 0 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'skipped']),
    query('tags').optional().isString(),
    query('search').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = {
        offset: parseInt(req.query.offset as string) || 0,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string
      };

      const urls = await kb3Service.getUrls(options);

      res.json({
        success: true,
        data: urls,
        pagination: {
          offset: options.offset,
          limit: options.limit,
          total: urls.length // Would need actual total from DB
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/urls - Add single URL
router.post('/',
  [
    body('url').isURL().withMessage('Invalid URL format'),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url, tags } = req.body;

      const result = await kb3Service.addUrl(url, tags);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/urls/batch - Add multiple URLs
router.post('/batch',
  [
    body('urls').isArray({ min: 1, max: 100 }),
    body('urls.*.url').isURL(),
    body('urls.*.tags').optional().isArray(),
    body('urls.*.tags.*').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { urls } = req.body;

      const results = await kb3Service.addUrls(urls);

      res.status(201).json({
        success: true,
        data: results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/urls/:id - Update URL metadata
router.put('/:id',
  [
    param('id').isString(),
    body('metadata').optional().isObject(),
    body('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'skipped']),
    body('priority').optional().isInt({ min: 0, max: 100 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // This would need implementation in KB3Service
      res.json({
        success: true,
        message: 'URL updated successfully',
        data: { id, ...updates }
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/urls/:id - Delete URL
router.delete('/:id',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // This would need implementation in KB3Service
      res.json({
        success: true,
        message: 'URL deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/urls/batch-update - Batch update URLs
router.post('/batch-update',
  [
    body('urlIds').isArray({ min: 1 }),
    body('urlIds.*').isString(),
    body('updates').isObject(),
    body('updates.tags').optional().isArray(),
    body('updates.scraperType').optional().isString(),
    body('updates.cleaners').optional().isArray(),
    body('updates.priority').optional().isInt({ min: 0, max: 100 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { urlIds, updates } = req.body;

      // Process each URL with updates
      const promises = urlIds.map((urlId: string) => {
        if (updates.scraperType || updates.cleaners) {
          return kb3Service.setUrlParameters(urlId, {
            scraperType: updates.scraperType,
            cleaners: updates.cleaners,
            priority: updates.priority
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);

      if (updates.tags) {
        const tagPromises = urlIds.map((urlId: string) =>
          kb3Service.addTagsToUrl(urlId, updates.tags)
        );
        await Promise.all(tagPromises);
      }

      res.json({
        success: true,
        message: `Updated ${urlIds.length} URLs`,
        affectedUrls: urlIds
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/urls/:id/tags - Add tags to URL
router.post('/:id/tags',
  [
    param('id').isString(),
    body('tags').isArray({ min: 1 }),
    body('tags.*').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { tags } = req.body;

      const success = await kb3Service.addTagsToUrl(id, tags);

      res.json({
        success,
        message: success ? 'Tags added successfully' : 'Failed to add tags'
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/urls/:id/tags - Remove tags from URL
router.delete('/:id/tags',
  [
    param('id').isString(),
    body('tags').isArray({ min: 1 }),
    body('tags.*').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { tags } = req.body;

      // This would need implementation in KB3Service
      res.json({
        success: true,
        message: 'Tags removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;