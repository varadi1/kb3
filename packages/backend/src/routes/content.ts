import { Router, Request, Response, NextFunction } from 'express';
import { param, body, validationResult } from 'express-validator';
import { KB3Service } from '../services/kb3Service';
import * as path from 'path';

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

// GET /api/content/:id/original - Get original content
router.get('/:id(*)/original',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const content = await kb3Service.getOriginalContent(id);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Original content not found'
        });
      }

      // Set appropriate content type
      const mimeType = getMimeType(content);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="original-${id}"`);

      res.send(content);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/content/:id/cleaned - Get cleaned content
router.get('/:id(*)/cleaned',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const content = await kb3Service.getCleanedContent(id);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Cleaned content not found'
        });
      }

      res.json({
        success: true,
        data: {
          content,
          length: content.length,
          preview: content.substring(0, 500)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/content/:id/metadata - Get content metadata
router.get('/:id(*)/metadata',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // This would need implementation in KB3Service
      const metadata = {
        url: id,
        originalSize: 0,
        cleanedSize: 0,
        scraperUsed: 'http',
        cleanersUsed: ['sanitizehtml', 'readability'],
        processingDate: new Date().toISOString(),
        contentType: 'text/html',
        status: 'completed'
      };

      res.json({
        success: true,
        data: metadata
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/content/:id/reprocess - Reprocess content with new settings
// Note: id can be a full URL path - use wildcard
router.post('/:id(*)/reprocess',
  [
    param('id').isString(),
    body('cleaners').optional().isArray(),
    body('cleanerConfigs').optional().isObject(),
    body('extractImages').optional().isBoolean(),
    body('extractLinks').optional().isBoolean(),
    body('extractMetadata').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const options = req.body;

      const result = await kb3Service.processUrl(id, options);

      res.json({
        success: true,
        message: 'Content reprocessed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/content/:id/download - Download original file
router.get('/:id(*)/download',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const content = await kb3Service.getOriginalContent(id);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }

      const mimeType = getMimeType(content);
      const extension = getExtensionFromMimeType(mimeType);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="kb3-${id}${extension}"`);
      res.setHeader('Content-Length', content.length.toString());

      res.send(content);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/content/:id/compare - Compare original vs cleaned
router.post('/:id(*)/compare',
  [
    param('id').isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const [original, cleaned] = await Promise.all([
        kb3Service.getOriginalContent(id),
        kb3Service.getCleanedContent(id)
      ]);

      if (!original || !cleaned) {
        return res.status(404).json({
          success: false,
          message: 'Content not found for comparison'
        });
      }

      res.json({
        success: true,
        data: {
          original: {
            size: original.length,
            preview: original.toString('utf-8').substring(0, 1000)
          },
          cleaned: {
            size: cleaned.length,
            preview: cleaned.substring(0, 1000)
          },
          reduction: {
            bytes: original.length - cleaned.length,
            percentage: ((1 - (cleaned.length / original.length)) * 100).toFixed(2)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper functions
function getMimeType(buffer: Buffer): string {
  // Simple detection based on buffer content
  const head = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000));

  if (head.includes('<!DOCTYPE html') || head.includes('<html')) {
    return 'text/html';
  } else if (head.startsWith('%PDF')) {
    return 'application/pdf';
  } else if (head.includes('<?xml')) {
    return 'application/xml';
  } else {
    return 'text/plain';
  }
}

function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'text/html': '.html',
    'application/pdf': '.pdf',
    'application/xml': '.xml',
    'text/plain': '.txt',
    'application/json': '.json'
  };
  return extensions[mimeType] || '.txt';
}

export default router;