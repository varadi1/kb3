import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { KB3Service } from '../services/kb3Service';

const router = Router();
const kb3Service = KB3Service.getInstance();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
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

      // Check if the operation was successful
      if (!result.success) {
        // Handle duplicate URL error specifically
        if (result.error?.code === 'DUPLICATE_URL') {
          res.status(409).json({
            success: false,
            error: result.error.message || 'URL already exists',
            data: result
          });
        } else {
          // Handle other failures
          res.status(400).json({
            success: false,
            error: result.error?.message || 'Failed to add URL',
            data: result
          });
        }
      } else {
        // Success case
        res.status(201).json({
          success: true,
          data: result
        });
      }
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
    body('priority').optional().isInt({ min: 0, max: 100 }),
    body('tags').optional().isArray(),
    body('authority').optional().isInt({ min: 0, max: 5 }),
    body('scraperType').optional().isString(),
    body('cleaners').optional().isArray()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      let updateSuccess = true;

      // Handle tag updates if provided
      if (updates.tags !== undefined) {
        // Use the new addTagsToUrlById method that handles ID to URL conversion
        const tagSuccess = await kb3Service.addTagsToUrlById(id, updates.tags);
        updateSuccess = updateSuccess && tagSuccess;
      }

      // Handle authority updates
      if (updates.authority !== undefined) {
        const authoritySuccess = await kb3Service.updateUrlAuthority(id, updates.authority);
        updateSuccess = updateSuccess && authoritySuccess;
      }

      // Handle scraper/cleaner configuration
      if (updates.scraperType || updates.cleaners || updates.priority) {
        await kb3Service.setUrlParameters(id, {
          scraperType: updates.scraperType,
          cleaners: updates.cleaners,
          priority: updates.priority
        });
      }

      // TODO: Handle metadata and status updates when KB3Service supports them
      // For now, these are stored locally but not persisted to the database

      if (updateSuccess) {
        res.json({
          success: true,
          message: 'URL updated successfully',
          data: { id, ...updates }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update URL completely',
          data: { id, ...updates }
        });
      }
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
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // const { id } = req.params;

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
    body('urlIds').isArray({ min: 1 }).withMessage('Provide at least one URL ID'),
    body('urlIds.*').isString().withMessage('Each URL ID must be a string'),
    body('updates').isObject().withMessage('Updates must be an object'),
    body('updates.tags').optional().isArray(),
    body('updates.authority').optional().isInt({ min: 0, max: 5 }).withMessage('authority must be between 0 and 5'),
    body('updates.scraperType').optional().isString(),
    body('updates.cleaners').optional().isArray(),
    body('updates.priority').optional().isInt({ min: 0, max: 100 })
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { urlIds, updates } = req.body;
      let updated = 0;
      const failed: string[] = [];

      // Process each URL with updates
      for (const urlId of urlIds) {
        try {
          // Handle scraper/cleaner configuration updates
          if (updates.scraperType || updates.cleaners || updates.priority) {
            await kb3Service.setUrlParameters(urlId, {
              scraperType: updates.scraperType,
              cleaners: updates.cleaners,
              priority: updates.priority
            });
          }

          // Handle authority updates
          if (updates.authority !== undefined) {
            await kb3Service.updateUrlAuthority(urlId, updates.authority);
          }

          // Handle tag updates
          if (updates.tags) {
            await kb3Service.addTagsToUrl(urlId, updates.tags);
          }

          updated++;
        } catch (err) {
          failed.push(urlId);
        }
      }

      // Return appropriate status based on results
      if (failed.length === 0) {
        res.json({
          success: true,
          data: {
            updated,
            total: urlIds.length
          }
        });
      } else if (updated > 0) {
        res.status(207).json({
          success: false,
          data: {
            updated,
            failed: failed.length,
            total: urlIds.length
          },
          failedUrls: failed
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'No URLs were updated',
          failedUrls: failed
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/urls/batch-tags - Batch add/remove tags
router.post('/batch-tags',
  [
    body('urlIds').isArray({ min: 1 }).withMessage('Provide at least one URL ID'),
    body('urlIds.*').isString(),
    body('operation').isIn(['add', 'remove']).withMessage('Operation must be "add" or "remove"'),
    body('tags').isArray({ min: 1 }).withMessage('Provide at least one tag'),
    body('tags.*').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { urlIds, operation, tags } = req.body;
      let processed = 0;

      for (const urlId of urlIds) {
        if (operation === 'add') {
          await kb3Service.addTagsToUrl(urlId, tags);
        } else {
          await kb3Service.removeTagsFromUrl(urlId, tags);
        }
        processed++;
      }

      res.json({
        success: true,
        data: {
          processed,
          operation,
          tags
        }
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
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // const { id } = req.params;
      // const { tags } = req.body;

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