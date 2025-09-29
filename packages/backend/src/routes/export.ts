import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { KB3Service } from '../services/kb3Service';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';

const router = Router();
const kb3Service = KB3Service.getInstance();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.json', '.csv', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JSON, CSV, and TXT files are allowed.'));
    }
  }
});

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST /api/export - Export data
router.post('/',
  [
    body('format').isIn(['json', 'csv', 'txt']),
    body('includeContent').optional().isBoolean(),
    body('includeMetadata').optional().isBoolean(),
    body('urlIds').optional().isArray(),
    body('tags').optional().isArray(),
    body('status').optional().isIn(['all', 'completed', 'failed', 'pending'])
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = req.body;

      const data = await kb3Service.exportData(options);

      // Format the response based on the requested format
      let responseData: string;
      let contentType: string;
      let filename: string;

      switch (options.format) {
        case 'json':
          responseData = JSON.stringify(data, null, 2);
          contentType = 'application/json';
          filename = `kb3-export-${Date.now()}.json`;
          break;

        case 'csv':
          responseData = await formatAsCSV(data);
          contentType = 'text/csv';
          filename = `kb3-export-${Date.now()}.csv`;
          break;

        case 'txt':
          responseData = await formatAsText(data);
          contentType = 'text/plain';
          filename = `kb3-export-${Date.now()}.txt`;
          break;

        default:
          throw new Error('Invalid format');
      }

      // Return structured response for API consistency
      res.json({
        success: true,
        data: {
          content: responseData,
          count: Array.isArray(data) ? data.length : (data.urls ? data.urls.length : 0),
          format: options.format
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/export/import - Import data
router.post('/import',
  upload.single('file'),
  [
    body('content').optional().isString(),
    body('format').optional().isIn(['json', 'csv', 'txt'])
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let fileContent: string;
      let format: 'json' | 'csv' | 'txt';

      // Handle both file upload and direct content
      if (req.file) {
        fileContent = req.file.buffer.toString('utf-8');
        const ext = path.extname(req.file.originalname).toLowerCase();

        switch (ext) {
          case '.json': format = 'json'; break;
          case '.csv': format = 'csv'; break;
          case '.txt': format = 'txt'; break;
          default: throw new Error('Unsupported file format');
        }
      } else if (req.body.content && req.body.format) {
        // Direct content submission (for testing)
        fileContent = req.body.content;
        format = req.body.format;
      } else {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded or content provided'
        });
      }

      let data: any[];

      // Parse the content based on format
      switch (format) {
        case 'json':
          data = JSON.parse(fileContent);
          if (!Array.isArray(data)) {
            // Handle case where data is wrapped in object
            if (data.urls && Array.isArray(data.urls)) {
              data = data.urls;
            } else {
              throw new Error('Invalid JSON format - expected array of URLs');
            }
          }
          break;

        case 'csv':
          data = await parseCSV(fileContent);
          break;

        case 'txt':
          data = parseText(fileContent);
          break;

        default:
          throw new Error('Unsupported format');
      }

      const result = await kb3Service.importData(data, format);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/export/templates - Download import templates
router.get('/templates',
  [
    query('format').optional().isIn(['json', 'csv', 'txt'])
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const format = req.query.format as string || 'json';

      let template: string;
      let contentType: string;
      let filename: string;

      switch (format) {
        case 'json':
          template = JSON.stringify(getJsonTemplate(), null, 2);
          contentType = 'application/json';
          filename = 'kb3-import-template.json';
          break;

        case 'csv':
          template = getCsvTemplate();
          contentType = 'text/csv';
          filename = 'kb3-import-template.csv';
          break;

        case 'txt':
          template = getTextTemplate();
          contentType = 'text/plain';
          filename = 'kb3-import-template.txt';
          break;

        default:
          throw new Error('Invalid format');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(template);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/export/validate - Validate import file
router.post('/validate',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let fileContent: string;
      let format: string;

      // Handle both file upload and direct content (like in /import)
      if (req.file) {
        fileContent = req.file.buffer.toString('utf-8');
        const ext = path.extname(req.file.originalname).toLowerCase();
        format = ext.replace('.', '');
      } else if (req.body.content) {
        fileContent = req.body.content;
        format = req.body.format || 'json';
      } else {
        return res.status(400).json({
          success: false,
          message: 'No file or content provided'
        });
      }

      let validation: any = {
        valid: true,
        errors: [],
        warnings: [],
        summary: {}
      };

      try {
        switch (format) {
          case 'json':
            const jsonData = JSON.parse(fileContent);
            validation = validateJsonImport(jsonData);
            break;

          case 'csv':
            const csvData = await parseCSV(fileContent);
            validation = validateCsvImport(csvData);
            break;

          case 'txt':
            const textData = parseText(fileContent);
            validation = validateTextImport(textData);
            break;

          default:
            validation.valid = false;
            validation.errors.push('Unsupported file format');
        }
      } catch (error: any) {
        validation.valid = false;
        validation.errors.push(`Parse error: ${error.message}`);
      }

      res.json({
        success: validation.valid,
        data: validation
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper functions
async function formatAsCSV(data: any): Promise<string> {
  const headers = ['url', 'tags', 'status', 'authority'];
  const rows = [headers.join(',')];

  // Add data rows - data is now directly an array of URLs
  if (Array.isArray(data)) {
    data.forEach((item: any) => {
      const row = [
        item.url,
        `"${(item.tags || []).join(',')}"`, // Properly escape for CSV
        item.status || '',
        (item.authority || 0).toString()
      ];
      rows.push(row.join(','));
    });
  }

  return rows.join('\n');
}

async function formatAsText(data: any): Promise<string> {
  const lines: string[] = [];

  // Data is now directly an array of URLs
  if (Array.isArray(data)) {
    // For plain text format, just return the URLs
    return data.map(item => item.url).join('\n');
  }

  return lines.join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function parseCSV(content: string): Promise<any[]> {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      if (header === 'tags' || header === 'cleaners') {
        row[header] = values[index] ? values[index].split(';') : [];
      } else {
        row[header] = values[index];
      }
    });

    data.push(row);
  }

  return data;
}

function parseText(content: string): any[] {
  const lines = content.trim().split('\n');
  const urls: any[] = [];
  let currentUrl: any = null;

  lines.forEach(line => {
    if (!line.startsWith('  ') && line.trim()) {
      if (currentUrl) urls.push(currentUrl);
      currentUrl = { url: line.trim(), tags: [], cleaners: [] };
    } else if (currentUrl && line.trim()) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Tags:')) {
        currentUrl.tags = trimmed.replace('Tags:', '').split(',').map((t: string) => t.trim());
      } else if (trimmed.startsWith('Scraper:')) {
        currentUrl.scraperType = trimmed.replace('Scraper:', '').trim();
      }
    }
  });

  if (currentUrl) urls.push(currentUrl);
  return urls;
}

function getJsonTemplate(): any {
  return {
    urls: [
      {
        url: 'https://example.com',
        tags: ['documentation', 'api'],
        scraperType: 'http',
        cleaners: ['sanitizehtml', 'readability']
      }
    ]
  };
}

function getCsvTemplate(): string {
  return 'url,tags,scraperType,cleaners\n' +
         'https://example.com,"documentation;api",http,"sanitizehtml;readability"';
}

function getTextTemplate(): string {
  return `https://example.com
  Tags: documentation, api
  Scraper: http

https://example.org
  Tags: blog
  Scraper: playwright
`;
}

function validateJsonImport(data: any): any {
  const validation = {
    valid: true,
    errors: [] as string[],
    warnings: [] as string[],
    summary: {
      urlCount: 0,
      validUrls: 0,
      invalidUrls: 0
    }
  };

  if (!data.urls || !Array.isArray(data.urls)) {
    validation.valid = false;
    validation.errors.push('Missing or invalid "urls" array');
    return validation;
  }

  validation.summary.urlCount = data.urls.length;

  data.urls.forEach((item: any, index: number) => {
    if (!item.url) {
      validation.errors.push(`Missing URL at index ${index}`);
      validation.summary.invalidUrls++;
    } else {
      try {
        new URL(item.url);
        validation.summary.validUrls++;
      } catch {
        validation.errors.push(`Invalid URL at index ${index}: ${item.url}`);
        validation.summary.invalidUrls++;
      }
    }
  });

  validation.valid = validation.errors.length === 0;
  return validation;
}

function validateCsvImport(data: any[]): any {
  return validateJsonImport({ urls: data });
}

function validateTextImport(data: any[]): any {
  return validateJsonImport({ urls: data });
}

export default router;