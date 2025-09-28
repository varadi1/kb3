/**
 * Contract tests for Python wrapper outputs
 * These tests ensure that mocked responses in unit tests match expected Python output structure
 */

import {
  DoclingContractValidator,
  Crawl4AIContractValidator,
  DeepDoctectionContractValidator,
  ContractValidatorFactory
} from '../../src/interfaces/IPythonWrapperContracts';

describe('Python Wrapper Contract Tests', () => {
  describe('Contract Validators', () => {
    describe('DoclingContractValidator', () => {
      let validator: DoclingContractValidator;

      beforeEach(() => {
        validator = new DoclingContractValidator();
      });

      test('should validate correct Docling response', () => {
        const validResponse = {
          success: true,
          executionTime: 100,
          data: {
            success: true,
            content: 'Test content',
            format: 'markdown',
            document: {
              text: 'Test text',
              markdown: '# Test',
              html: '<h1>Test</h1>',
              json: { title: 'Test' }
            },
            metadata: {
              title: 'Test Document',
              author: 'Test Author',
              page_count: 10,
              word_count: 500
            },
            tables: [{ rows: [['A', 'B']], caption: 'Table 1' }],
            figures: [{ caption: 'Figure 1', page: 1 }]
          }
        };

        expect(validator.validate(validResponse)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });

      test('should reject response missing required fields', () => {
        const invalidResponse = {
          success: true
          // Missing executionTime
        };

        expect(validator.validate(invalidResponse)).toBe(false);
        expect(validator.getErrors()).toContain('Missing required field: executionTime');
      });

      test('should reject response with wrong field types', () => {
        const invalidResponse = {
          success: 'true', // Should be boolean
          executionTime: '100', // Should be number
          data: {
            success: true
          }
        };

        expect(validator.validate(invalidResponse)).toBe(false);
        expect(validator.getErrors().length).toBeGreaterThan(0);
      });

      test('should validate error response', () => {
        const errorResponse = {
          success: false,
          executionTime: 100,
          error: 'Processing failed'
        };

        expect(validator.validate(errorResponse)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });

      test('should warn about incorrect optional field types', () => {
        const responseWithWarnings = {
          success: true,
          executionTime: 100,
          data: {
            success: true,
            metadata: {
              page_count: '10' // Should be number
            }
          }
        };

        validator.validate(responseWithWarnings);
        expect(validator.getWarnings().length).toBeGreaterThan(0);
      });
    });

    describe('Crawl4AIContractValidator', () => {
      let validator: Crawl4AIContractValidator;

      beforeEach(() => {
        validator = new Crawl4AIContractValidator();
      });

      test('should validate correct Crawl4AI response', () => {
        const validResponse = {
          success: true,
          executionTime: 200,
          data: {
            success: true,
            content: 'Scraped content',
            markdown: '# Page Title',
            metadata: {
              title: 'Test Page',
              extraction_strategy: 'llm',
              links: [{ url: 'https://example.com', text: 'Link' }],
              images: [{ url: 'https://example.com/img.jpg', alt: 'Image' }]
            },
            chunks: [
              { text: 'Chunk 1', metadata: {} },
              { text: 'Chunk 2', metadata: {} }
            ]
          }
        };

        expect(validator.validate(validResponse)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });

      test('should validate minimal valid response', () => {
        const minimalResponse = {
          success: true,
          executionTime: 100,
          data: {
            success: true
          }
        };

        expect(validator.validate(minimalResponse)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });

      test('should reject invalid array fields', () => {
        const invalidResponse = {
          success: true,
          executionTime: 100,
          data: {
            success: true,
            chunks: 'not an array' // Should be array
          }
        };

        validator.validate(invalidResponse);
        expect(validator.getWarnings()).toContain('Field chunks should be an array');
      });
    });

    describe('DeepDoctectionContractValidator', () => {
      let validator: DeepDoctectionContractValidator;

      beforeEach(() => {
        validator = new DeepDoctectionContractValidator();
      });

      test('should validate correct DeepDoctection response', () => {
        const validResponse = {
          success: true,
          executionTime: 300,
          data: {
            success: true,
            content: 'Document content',
            tables: [
              { data: [['A', 'B'], ['1', '2']], confidence: 0.95 }
            ],
            layout: [
              { type: 'title', bbox: [0, 0, 100, 50], text: 'Title', confidence: 0.98 }
            ],
            metadata: {
              page_count: 5,
              document_type: 'pdf'
            }
          }
        };

        expect(validator.validate(validResponse)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });

      test('should validate fallback response', () => {
        const fallbackResponse = {
          success: true,
          executionTime: 100,
          data: {
            success: true,
            content: 'Fallback content without ML features'
          }
        };

        expect(validator.validate(fallbackResponse)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });
    });

    describe('ContractValidatorFactory', () => {
      test('should create correct validator for each scraper type', () => {
        expect(ContractValidatorFactory.createValidator('docling'))
          .toBeInstanceOf(DoclingContractValidator);

        expect(ContractValidatorFactory.createValidator('crawl4ai'))
          .toBeInstanceOf(Crawl4AIContractValidator);

        expect(ContractValidatorFactory.createValidator('deepdoctection'))
          .toBeInstanceOf(DeepDoctectionContractValidator);
      });

      test('should return null for unknown scraper type', () => {
        expect(ContractValidatorFactory.createValidator('unknown')).toBeNull();
      });
    });
  });

  describe('Mock Response Contract Validation', () => {
    /**
     * These tests validate that the mock responses used in unit tests
     * match the expected contract structure
     */

    test('DoclingScraper unit test mocks should match contract', () => {
      const validator = new DoclingContractValidator();

      // This is the mock response structure from DoclingScraper.test.ts
      const unitTestMock = {
        success: true,
        data: {
          success: true,
          content: 'Test document content',
          format: 'markdown',
          document: {
            text: 'Test document content',
            markdown: '# Test Document\n\nTest content',
            html: '<h1>Test Document</h1><p>Test content</p>',
            json: { title: 'Test Document', content: 'Test content' }
          },
          metadata: {
            title: 'Test Document',
            author: 'Test Author',
            page_count: 10,
            word_count: 500,
            document_type: 'pdf',
            language: 'en',
            created_date: '2024-01-01',
            modified_date: '2024-01-02'
          },
          tables: [],
          figures: [],
          annotations: [],
          bookmarks: [],
          form_fields: [],
          embedded_files: []
        },
        stderr: '',
        exitCode: 0,
        executionTime: 100
      };

      expect(validator.validate(unitTestMock)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('Crawl4AIScraper unit test mocks should match contract', () => {
      const validator = new Crawl4AIContractValidator();

      // Mock response structure that should be used in Crawl4AIScraper tests
      const unitTestMock = {
        success: true,
        data: {
          success: true,
          content: 'Example Domain content',
          markdown: '# Example Domain\n\nThis domain is for use in illustrative examples',
          html: '<h1>Example Domain</h1><p>This domain is for use in illustrative examples</p>',
          metadata: {
            title: 'Example Domain',
            description: 'Example domain for documentation',
            extraction_strategy: 'llm',
            links: [
              { url: 'https://www.iana.org/domains/example', text: 'More information...' }
            ],
            images: [],
            word_count: 30,
            crawl_depth: 1
          }
        },
        stderr: '',
        exitCode: 0,
        executionTime: 150
      };

      expect(validator.validate(unitTestMock)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('DeepDoctectionScraper unit test mocks should match contract', () => {
      const validator = new DeepDoctectionContractValidator();

      // Mock response for DeepDoctection (fallback mode)
      const unitTestMock = {
        success: true,
        data: {
          success: true,
          content: 'Document content extracted without ML models',
          metadata: {
            document_type: 'pdf',
            page_count: 1,
            processing_time: 100
          }
        },
        stderr: '',
        exitCode: 0,
        executionTime: 200
      };

      expect(validator.validate(unitTestMock)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('Contract Evolution Tests', () => {
    /**
     * These tests ensure backward compatibility when contracts evolve
     */

    test('should handle missing optional fields gracefully', () => {
      const validators = [
        new DoclingContractValidator(),
        new Crawl4AIContractValidator(),
        new DeepDoctectionContractValidator()
      ];

      const minimalResponse = {
        success: true,
        executionTime: 100,
        data: {
          success: true
        }
      };

      for (const validator of validators) {
        expect(validator.validate(minimalResponse)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      }
    });

    test('should handle additional unknown fields without breaking', () => {
      const validator = new DoclingContractValidator();

      const responseWithExtraFields = {
        success: true,
        executionTime: 100,
        data: {
          success: true,
          content: 'Test',
          unknownField: 'This field is not in the contract',
          futureFeature: { nested: 'data' }
        },
        extraMetadata: 'Additional field'
      };

      // Should still validate successfully, ignoring unknown fields
      expect(validator.validate(responseWithExtraFields)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('Real Python Output Validation', () => {
    /**
     * These tests would validate actual Python wrapper outputs
     * Currently using mock data, but in E2E tests these would be real
     */

    test('should validate actual Docling wrapper output structure', () => {
      const validator = new DoclingContractValidator();

      // This would be actual output from Python wrapper in E2E tests
      const actualPythonOutput = {
        success: true,
        executionTime: 5000,
        data: {
          success: true,
          content: 'Dummy PDF file',
          format: 'markdown',
          document: {
            text: 'Dummy PDF file',
            markdown: '# Dummy PDF file'
          },
          metadata: {
            page_count: 1,
            document_type: 'pdf'
          }
        }
      };

      expect(validator.validate(actualPythonOutput)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should validate actual Crawl4AI wrapper output structure', () => {
      const validator = new Crawl4AIContractValidator();

      // This would be actual output from Python wrapper in E2E tests
      const actualPythonOutput = {
        success: true,
        executionTime: 2000,
        data: {
          success: true,
          content: 'Example Domain\nThis domain is for use...',
          markdown: '# Example Domain\n\nThis domain is for use...',
          metadata: {
            extraction_strategy: 'basic',
            word_count: 30
          }
        }
      };

      expect(validator.validate(actualPythonOutput)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });
});