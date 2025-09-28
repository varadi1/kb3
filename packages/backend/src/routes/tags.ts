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

// GET /api/tags - Get all tags (hierarchical)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await kb3Service.getTags();

    // Build hierarchical structure
    const tagMap = new Map();
    const rootTags: any[] = [];

    tags.forEach(tag => {
      tagMap.set(tag.id, { ...tag, children: [] });
    });

    tags.forEach(tag => {
      const tagNode = tagMap.get(tag.id);
      if (tag.parent_id) {
        const parent = tagMap.get(tag.parent_id);
        if (parent) {
          parent.children.push(tagNode);
        }
      } else {
        rootTags.push(tagNode);
      }
    });

    res.json({
      success: true,
      data: rootTags,
      total: tags.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tags - Create new tag
router.post('/',
  [
    body('name').isString().trim().notEmpty(),
    body('parentName').optional().isString(),
    body('description').optional().isString(),
    body('color').optional().isHexColor()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, parentName, description, color } = req.body;

      const tag = await kb3Service.createTag(name, parentName);

      // If additional properties provided, update the tag
      if (description || color) {
        await kb3Service.updateTag(tag.id, { description, color });
      }

      res.status(201).json({
        success: true,
        data: tag
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/tags/:id - Update tag
router.put('/:id',
  [
    param('id').isInt(),
    body('name').optional().isString().trim().notEmpty(),
    body('parent_id').optional().isInt(),
    body('description').optional().isString(),
    body('color').optional().isHexColor()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const success = await kb3Service.updateTag(id, updates);

      res.json({
        success,
        message: success ? 'Tag updated successfully' : 'Failed to update tag'
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/tags/:id - Delete tag
router.delete('/:id',
  [
    param('id').isInt()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      const success = await kb3Service.deleteTag(id);

      res.json({
        success,
        message: success ? 'Tag deleted successfully' : 'Failed to delete tag'
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tags/batch - Batch tag operations
router.post('/batch',
  [
    body('operation').isIn(['create', 'delete']),
    body('tags').isArray({ min: 1 }),
    body('tags.*.name').isString().trim().notEmpty(),
    body('tags.*.parentName').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { operation, tags } = req.body;

      if (operation === 'create') {
        const results = await Promise.allSettled(
          tags.map((tag: any) => kb3Service.createTag(tag.name, tag.parentName))
        );

        const successful = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');

        res.json({
          success: true,
          summary: {
            created: successful.length,
            failed: failed.length
          },
          results
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Batch delete not yet implemented'
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tags/:id/urls - Get URLs with specific tag
router.get('/:id/urls',
  [
    param('id').isInt()
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      // This would need implementation in KB3Service
      res.json({
        success: true,
        data: [],
        message: 'Feature not yet implemented'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;