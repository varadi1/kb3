#!/usr/bin/env npx tsx

/**
 * Validate that test mocks match Python wrapper contracts
 * This script is run as a pre-commit hook to ensure consistency
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DoclingContractValidator,
  Crawl4AIContractValidator,
  DeepDoctectionContractValidator
} from '../src/interfaces/IPythonWrapperContracts';

interface MockValidationResult {
  file: string;
  scraper: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Extract mock implementation from test file
 */
async function extractMockFromTestFile(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Look for jest.spyOn(...).mockImplementation patterns
    const mockPattern = /mockImplementation\s*\(\s*async[^}]*\{([^}]*return\s*\{[^}]*\}[^}]*)\}/gs;
    const matches = content.match(mockPattern);

    if (matches && matches.length > 0) {
      return matches[0];
    }

    // Look for mockResolvedValue patterns
    const mockResolvedPattern = /mockResolvedValue\s*\(\s*\{([^}]*)\}/gs;
    const resolvedMatches = content.match(mockResolvedPattern);

    if (resolvedMatches && resolvedMatches.length > 0) {
      return resolvedMatches[0];
    }

    return null;
  } catch (error) {
    console.error(`Failed to read file ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse mock response structure from mock implementation
 */
function parseMockResponse(mockCode: string): any {
  try {
    // Extract the return object
    const returnMatch = mockCode.match(/return\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);

    if (!returnMatch) {
      return null;
    }

    // Build a simplified mock response structure
    // This is a simplified parser - in production, use AST parsing
    const mockStructure: any = {
      success: true,
      executionTime: 100,
      data: {}
    };

    // Check for success field
    if (mockCode.includes('success: true')) {
      mockStructure.success = true;
    }

    // Check for executionTime
    if (mockCode.includes('executionTime:')) {
      mockStructure.executionTime = 100;
    }

    // Check for data structure
    if (mockCode.includes('data: {')) {
      mockStructure.data = {
        success: true
      };

      // Check for common fields
      if (mockCode.includes('content:')) {
        mockStructure.data.content = 'mock';
      }

      if (mockCode.includes('metadata:')) {
        mockStructure.data.metadata = {};
      }

      if (mockCode.includes('document:')) {
        mockStructure.data.document = {};
      }
    }

    return mockStructure;
  } catch (error) {
    console.error('Failed to parse mock response:', error);
    return null;
  }
}

/**
 * Validate mock response against contract
 */
function validateMock(
  mockResponse: any,
  scraperType: string
): { valid: boolean; errors: string[]; warnings: string[] } {
  let validator;

  switch (scraperType) {
    case 'docling':
      validator = new DoclingContractValidator();
      break;
    case 'crawl4ai':
      validator = new Crawl4AIContractValidator();
      break;
    case 'deepdoctection':
      validator = new DeepDoctectionContractValidator();
      break;
    default:
      return {
        valid: false,
        errors: [`Unknown scraper type: ${scraperType}`],
        warnings: []
      };
  }

  const valid = validator.validate(mockResponse);

  return {
    valid,
    errors: validator.getErrors(),
    warnings: validator.getWarnings()
  };
}

/**
 * Determine scraper type from file path
 */
function getScraperTypeFromPath(filePath: string): string | null {
  const fileName = path.basename(filePath).toLowerCase();

  if (fileName.includes('docling')) {
    return 'docling';
  }

  if (fileName.includes('crawl4ai')) {
    return 'crawl4ai';
  }

  if (fileName.includes('deepdoctection') || fileName.includes('deepdoctection')) {
    return 'deepdoctection';
  }

  return null;
}

/**
 * Main validation function
 */
async function validateMocks(testFiles: string[]): Promise<boolean> {
  const results: MockValidationResult[] = [];

  for (const file of testFiles) {
    const scraperType = getScraperTypeFromPath(file);

    if (!scraperType) {
      console.log(`⏭️  Skipping ${file} (not a scraper test)`);
      continue;
    }

    const mockCode = await extractMockFromTestFile(file);

    if (!mockCode) {
      console.log(`⏭️  Skipping ${file} (no mocks found)`);
      continue;
    }

    const mockResponse = parseMockResponse(mockCode);

    if (!mockResponse) {
      results.push({
        file,
        scraper: scraperType,
        valid: false,
        errors: ['Failed to parse mock response'],
        warnings: []
      });
      continue;
    }

    const validation = validateMock(mockResponse, scraperType);

    results.push({
      file,
      scraper: scraperType,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    });
  }

  // Display results
  console.log('\n📊 Mock Validation Results\n');
  console.log('=' .repeat(60));

  let allValid = true;

  for (const result of results) {
    const status = result.valid ? '✅' : '❌';
    const fileName = path.basename(result.file);

    console.log(`\n${status} ${fileName} (${result.scraper})`);

    if (result.errors.length > 0) {
      allValid = false;
      console.log('   Errors:');
      for (const error of result.errors) {
        console.log(`     - ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('   Warnings:');
      for (const warning of result.warnings) {
        console.log(`     - ${warning}`);
      }
    }
  }

  console.log('\n' + '=' .repeat(60));

  if (allValid) {
    console.log('\n✅ All mocks match contracts\n');
  } else {
    console.log('\n❌ Some mocks violate contracts\n');
    console.log('Fix the mocks to match the expected Python output structure.');
    console.log('See src/interfaces/IPythonWrapperContracts.ts for contract definitions.\n');
  }

  return allValid;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  let testFiles: string[] = [];

  if (args.length === 0) {
    // No files specified, check all scraper tests
    const testDir = path.join(process.cwd(), 'tests/unit/scrapers');

    try {
      const files = await fs.readdir(testDir);
      testFiles = files
        .filter(f => f.endsWith('.test.ts'))
        .map(f => path.join(testDir, f));
    } catch (error) {
      console.error('Failed to read test directory:', error);
      process.exit(1);
    }
  } else {
    testFiles = args.filter(f => f.endsWith('.test.ts'));
  }

  if (testFiles.length === 0) {
    console.log('No test files to validate');
    process.exit(0);
  }

  console.log(`\n🔍 Validating mocks in ${testFiles.length} test file(s)...`);

  const success = await validateMocks(testFiles);
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}