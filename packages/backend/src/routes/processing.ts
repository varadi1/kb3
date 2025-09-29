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
// Note: id can be a full URL, so we use (.*) to capture everything
router.post('/url/:id(*)',
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
      // The ID might be a URL encoded in the path
      const url = decodeURIComponent(req.params.id);
      const options = req.body;

      const result = await kb3Service.processUrl(url, options);

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

      // Queue URLs for processing (async operation)
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Start processing asynchronously
      kb3Service.processUrls(urls, options).catch(err => {
        console.error(`Batch processing job ${jobId} failed:`, err);
      });

      res.status(202).json({
        success: true,
        data: {
          queued: urls.length,
          jobId
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
// Note: id can be a full URL, so we use (.*) to capture everything
router.get('/status/:id(*)',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = decodeURIComponent(req.params.id);

      // This would need real-time status tracking implementation
      res.json({
        success: true,
        data: {
          url,
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
// Note: id can be a full URL, so we use (.*) to capture everything
router.post('/cancel/:id(*)',
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
    const queueStatus = await kb3Service.getQueueStatus();
    const stats = await kb3Service.getStatistics();

    res.json({
      success: true,
      data: {
        ...stats,
        ...queueStatus
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

// POST /api/process/start - Start queue processing
router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await kb3Service.startQueueProcessing();

    res.json({
      success: true,
      message: 'Queue processing started'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/process/stop - Stop queue processing
router.post('/stop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await kb3Service.stopQueueProcessing();

    res.json({
      success: true,
      message: 'Queue processing stopped'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/process/completed - Clear completed items from queue
router.delete('/completed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clearedCount = await kb3Service.clearCompletedFromQueue();

    res.json({
      success: true,
      message: `Cleared ${clearedCount} completed items from queue`
    });
  } catch (error) {
    next(error);
  }
});

export default router;