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
// NOTE: id can be either a UUID, a full URL, or encoded URL path
// KB3Service.processUrl will automatically resolve UUIDs to URLs
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
      // The ID might be a UUID or a URL encoded in the path
      const urlOrId = decodeURIComponent(req.params.id);
      const options = req.body;

      console.log(`[ProcessingRoute] Processing single item: ${urlOrId}`);

      // KB3Service will handle UUID → URL resolution automatically
      const result = await kb3Service.processUrl(urlOrId, options);

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
// NOTE: 'urls' can be either actual URL strings OR database UUIDs
// KB3Service.processUrls will automatically resolve UUIDs to URLs
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

      console.log(`[ProcessingRoute] Received batch request with ${urls.length} items`);
      console.log(`[ProcessingRoute] First item: ${urls[0]}`);

      // Generate job ID for tracking
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Send immediate response to acknowledge batch received
      res.status(202).json({
        success: true,
        data: {
          queued: urls.length,
          jobId
        }
      });

      // Start processing asynchronously (don't block response)
      // KB3Service will handle UUID → URL resolution automatically
      // WebSocket events will notify clients of progress
      kb3Service.processUrls(urls, options).catch(err => {
        console.error(`[ProcessingRoute] Batch processing job ${jobId} failed:`, err);
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
    const overall = await kb3Service.getStatistics();

    const { queue, stats: qStats, isProcessing } = queueStatus as any;
    const pending = qStats?.pending || 0;
    const processing = qStats?.processing || 0;
    const completed = qStats?.completed || 0;
    const failed = qStats?.failed || 0;

    res.json({
      success: true,
      data: {
        ...overall,
        isProcessing,
        // Flattened queue stats for the UI tile
        pending,
        processing,
        completed,
        failed,
        // Back-compat fields
        queue: pending,
        queueCount: Array.isArray(queue) ? queue.length : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/process/queue/items - Get actual queue items
router.get('/queue/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queueStatus = await kb3Service.getQueueStatus();

    res.json({
      success: true,
      data: queueStatus.queue || []
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