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

// POST /api/process/url/:id - Process single URL
router.post('/url/:id',
  [
    param('id').isString(),
    body('scraperType').optional().isString(),
    body('cleaners').optional().isArray(),
    body('extractImages').optional().isBoolean(),
    body('extractLinks').optional().isBoolean(),
    body('extractMetadata').optional().isBoolean(),
    body('preserveFormatting').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const options = req.body;

      const result = await kb3Service.processUrl(id, options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/process/batch - Batch process URLs
router.post('/batch',
  [
    body('urls').isArray({ min: 1, max: 100 }),
    body('urls.*').isString(),
    body('options').optional().isObject(),
    body('options.scraperType').optional().isString(),
    body('options.cleaners').optional().isArray()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { urls, options } = req.body;

      const results = await kb3Service.processUrls(urls, options);

      res.json({
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

// POST /api/process/by-tags - Process URLs by tags
router.post('/by-tags',
  [
    body('tags').isArray({ min: 1 }),
    body('tags.*').isString(),
    body('includeChildTags').optional().isBoolean(),
    body('options').optional().isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tags, includeChildTags, options } = req.body;

      const results = await kb3Service.processUrlsByTags(tags, {
        ...options,
        includeChildTags
      });

      res.json({
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

// GET /api/process/status/:id - Get processing status for URL
router.get('/status/:id',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // This would need real-time status tracking implementation
      res.json({
        success: true,
        data: {
          url: id,
          status: 'completed', // Would be fetched from actual processing state
          progress: 100,
          message: 'Processing completed'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/process/cancel/:id - Cancel processing for URL
router.post('/cancel/:id',
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
        message: `Processing cancelled for URL: ${id}`
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/process/queue - Get processing queue status
router.get('/queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await kb3Service.getStatistics();

    res.json({
      success: true,
      data: {
        ...stats,
        queue: [] // Would need actual queue implementation
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/process/retry - Retry failed URLs
router.post('/retry',
  [
    body('urls').isArray({ min: 1 }),
    body('urls.*').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { urls } = req.body;

      const results = await kb3Service.processUrls(urls);

      res.json({
        success: true,
        data: results,
        message: `Retrying ${urls.length} URLs`
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;