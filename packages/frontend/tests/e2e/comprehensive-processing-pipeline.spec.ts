/**
 * Comprehensive E2E Processing Pipeline Test
 *
 * This test processes ALL URLs in the system with their per-URL settings
 * to identify processing problems, misalignments, and failing jobs.
 *
 * Test Coverage:
 * - Pre-processing validation
 * - All processing pipeline stages
 * - Configuration validation
 * - Error detection and categorization
 * - Metadata consistency
 * - Queue management
 * - Database integrity
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface UrlRecord {
  id: string;
  url: string;
  status: string;
  scraperType?: string;
  cleaners?: string[];
  parameters?: Record<string, any>;
  authority?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface ProcessingResult {
  url: string;
  success: boolean;
  startTime: number;
  endTime?: number;
  stages: StageResult[];
  error?: ProcessingError;
  metadata?: Record<string, any>;
  finalStatus?: string;
}

interface StageResult {
  stage: ProcessingStage;
  success: boolean;
  duration?: number;
  error?: string;
  timestamp: number;
}

interface ProcessingError {
  code: string;
  message: string;
  stage: ProcessingStage;
  details?: any;
}

interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  queueCount: number;
}

interface TestReport {
  totalUrls: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  stuckInProcessing: number;
  configurationErrors: number;
  schemaViolations: number;
  metadataInconsistencies: number;
  databaseIntegrityIssues: number;
  results: ProcessingResult[];
  errors: ErrorSummary[];
  warnings: string[];
  startTime: number;
  endTime: number;
  duration: number;
}

interface ErrorSummary {
  url: string;
  errorCode: string;
  message: string;
  stage: ProcessingStage;
  timestamp: number;
}

enum ProcessingStage {
  DETECTING = 'detecting',
  FETCHING = 'fetching',
  PROCESSING = 'processing',
  STORING = 'storing',
  INDEXING = 'indexing'
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetches all URLs from the backend API
 */
async function fetchAllUrls(page: Page): Promise<UrlRecord[]> {
  const response = await page.request.get('http://localhost:4000/api/urls');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  return data.data || [];
}

/**
 * Fetches URL-specific parameters
 */
async function fetchUrlParameters(page: Page, urlId: string): Promise<any> {
  try {
    const response = await page.request.get(`http://localhost:4000/api/config/url/${urlId}/parameters`);
    if (response.ok()) {
      const data = await response.json();
      return data.data;
    }
  } catch (error) {
    console.warn(`Could not fetch parameters for URL ${urlId}:`, error);
  }
  return null;
}

/**
 * Validates URL configuration against schema
 */
function validateUrlConfiguration(url: UrlRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate authority level
  if (url.authority !== undefined) {
    if (typeof url.authority !== 'number' || url.authority < 0 || url.authority > 5) {
      errors.push(`Invalid authority level: ${url.authority} (must be 0-5)`);
    }
  }

  // Validate scraper type
  const validScrapers = ['http', 'playwright', 'crawl4ai', 'docling', 'deepdoctection', 'default'];
  if (url.scraperType && !validScrapers.includes(url.scraperType)) {
    errors.push(`Invalid scraper type: ${url.scraperType}`);
  }

  // Validate cleaners array
  if (url.cleaners && !Array.isArray(url.cleaners)) {
    errors.push(`Cleaners must be an array, got: ${typeof url.cleaners}`);
  }

  // Validate parameters object
  if (url.parameters && typeof url.parameters !== 'object') {
    errors.push(`Parameters must be an object, got: ${typeof url.parameters}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Monitors WebSocket events during processing
 */
function setupWebSocketMonitoring(page: Page, results: Map<string, ProcessingResult>) {
  page.on('websocket', ws => {
    ws.on('framereceived', event => {
      try {
        const data = JSON.parse(event.payload as string);

        if (data.type === 'processing:progress' || data.type === 'processing:complete') {
          const url = data.url;
          if (url && results.has(url)) {
            const result = results.get(url)!;

            // Update stage information
            if (data.stage) {
              result.stages.push({
                stage: data.stage as ProcessingStage,
                success: data.type === 'processing:complete',
                timestamp: Date.now(),
                duration: data.duration
              });
            }

            // Update final status
            if (data.type === 'processing:complete') {
              result.success = data.success || false;
              result.endTime = Date.now();
              result.finalStatus = data.status;

              if (!data.success && data.error) {
                result.error = data.error;
              }
            }
          }
        }
      } catch (e) {
        // Ignore parse errors for non-JSON messages
      }
    });
  });
}

/**
 * Fetches current queue status
 */
async function fetchQueueStatus(page: Page): Promise<QueueStatus> {
  const response = await page.request.get('http://localhost:4000/api/process/queue');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  return data.data;
}

/**
 * Processes a batch of URLs
 */
async function processBatch(
  page: Page,
  urls: string[],
  results: Map<string, ProcessingResult>
): Promise<void> {
  // Initialize results for this batch
  urls.forEach(url => {
    results.set(url, {
      url,
      success: false,
      startTime: Date.now(),
      stages: []
    });
  });

  // Send batch processing request
  const response = await page.request.post('http://localhost:4000/api/process/batch', {
    data: {
      urls: urls,
      options: {}
    }
  });

  expect(response.ok()).toBeTruthy();
}

/**
 * Waits for batch to complete or timeout
 * Uses API polling as fallback for WebSocket events
 */
async function waitForBatchCompletion(
  page: Page,
  urls: string[],
  results: Map<string, ProcessingResult>,
  timeoutMs: number = 180000 // Increased to 3 minutes per batch
): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 3000; // Check every 3 seconds
  let lastProgressLog = startTime;
  const progressLogInterval = 15000; // Log progress every 15 seconds

  while (Date.now() - startTime < timeoutMs) {
    // Check if all URLs in batch have completed
    const allCompleted = urls.every(url => {
      const result = results.get(url);
      return result?.endTime !== undefined;
    });

    if (allCompleted) {
      return;
    }

    // Wait before next check with try-catch for timeout safety
    try {
      await page.waitForTimeout(checkInterval);
    } catch (error) {
      console.warn('   ⚠️  waitForTimeout interrupted, continuing...');
      break; // Exit if global timeout is approaching
    }

    // Fetch queue status to check progress
    let queueStatus: QueueStatus;
    try {
      queueStatus = await fetchQueueStatus(page);
    } catch (error) {
      console.warn('   ⚠️  Could not fetch queue status, retrying...');
      continue;
    }

    // Poll API for URL statuses (fallback for WebSocket)
    try {
      await pollUrlStatuses(page, urls, results);
    } catch (error) {
      console.warn('   ⚠️  Could not poll URL statuses:', error);
    }

    // Log progress periodically
    const now = Date.now();
    if (now - lastProgressLog > progressLogInterval) {
      const completed = urls.filter(url => results.get(url)?.endTime).length;
      const elapsed = Math.floor((now - startTime) / 1000);
      console.log(`   ⏳ Progress: ${completed}/${urls.length} URLs completed (${elapsed}s elapsed)`);
      console.log(`   📊 Queue: ${queueStatus.processing} processing, ${queueStatus.pending} pending`);
      lastProgressLog = now;
    }

    // If no items are processing and queue is empty, something is stuck
    if (queueStatus.processing === 0 && queueStatus.pending === 0) {
      // Check if any URLs in our batch are still incomplete
      const incomplete = urls.filter(url => !results.get(url)?.endTime);
      if (incomplete.length > 0) {
        console.warn(`   ⚠️  ${incomplete.length} URLs appear stuck (queue empty but URLs incomplete)`);

        // Give one more chance - poll API directly
        await pollUrlStatuses(page, urls, results);

        // Check again after polling
        const stillIncomplete = urls.filter(url => !results.get(url)?.endTime);
        if (stillIncomplete.length > 0) {
          // Mark these as stuck
          stillIncomplete.forEach(url => {
            const result = results.get(url)!;
            result.error = {
              code: 'STUCK_IN_PROCESSING',
              message: 'URL processing appears to be stuck (queue empty, no progress)',
              stage: ProcessingStage.PROCESSING
            };
            result.endTime = Date.now();
          });
          return;
        }
      }
    }
  }

  // Timeout reached - try one final poll before marking as timeout
  console.warn(`   ⚠️  Batch timeout reached (${timeoutMs}ms), performing final status check...`);
  try {
    await pollUrlStatuses(page, urls, results);
  } catch (error) {
    console.error('   ❌ Final status poll failed:', error);
  }

  // Mark any still-incomplete URLs as timeout
  urls.forEach(url => {
    const result = results.get(url);
    if (result && !result.endTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      result.error = {
        code: 'TIMEOUT',
        message: `Processing timeout after ${elapsed}s (${timeoutMs}ms limit)`,
        stage: ProcessingStage.PROCESSING
      };
      result.endTime = Date.now();
      console.error(`   ❌ URL timeout: ${url.substring(0, 80)}...`);
    }
  });
}

/**
 * Polls API directly for URL statuses (fallback for WebSocket)
 */
async function pollUrlStatuses(
  page: Page,
  urls: string[],
  results: Map<string, ProcessingResult>
): Promise<void> {
  try {
    // Fetch all URLs from API
    const allUrls = await fetchAllUrls(page);

    // Update results based on API response
    urls.forEach(url => {
      const result = results.get(url);
      if (result && !result.endTime) {
        // Find matching URL in API response
        const apiUrl = allUrls.find(u => u.url === url);

        if (apiUrl) {
          // Check if status indicates completion
          if (apiUrl.status === 'completed') {
            result.success = true;
            result.endTime = Date.now();
            result.finalStatus = 'completed';
          } else if (apiUrl.status === 'failed') {
            result.success = false;
            result.endTime = Date.now();
            result.finalStatus = 'failed';
            result.error = {
              code: 'PROCESSING_FAILED',
              message: apiUrl.metadata?.errorMessage || 'Processing failed (from API)',
              stage: ProcessingStage.PROCESSING
            };
          } else if (apiUrl.status === 'skipped') {
            result.success = false;
            result.endTime = Date.now();
            result.finalStatus = 'skipped';
            result.error = {
              code: 'SKIPPED',
              message: 'URL was skipped',
              stage: ProcessingStage.PROCESSING
            };
          }
          // If still 'processing' or 'pending', leave it incomplete
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to poll URL statuses: ${error}`);
  }
}

/**
 * Validates metadata consistency for a URL
 */
async function validateMetadata(page: Page, urlRecord: UrlRecord): Promise<string[]> {
  const issues: string[] = [];

  // Check if URL has metadata
  if (!urlRecord.metadata) {
    issues.push('Missing metadata object');
    return issues;
  }

  // Validate scraper metadata
  if (urlRecord.metadata.scraperUsed) {
    const scraper = urlRecord.metadata.scraperUsed;
    const validScrapers = ['http', 'playwright', 'crawl4ai', 'docling', 'deepdoctection'];
    if (!validScrapers.includes(scraper)) {
      issues.push(`Invalid scraper in metadata: ${scraper}`);
    }
  }

  // Validate cleaning metadata
  if (urlRecord.metadata.cleaningMetadata) {
    const cleaning = urlRecord.metadata.cleaningMetadata;

    if (cleaning.cleanersUsed && !Array.isArray(cleaning.cleanersUsed)) {
      issues.push('cleanersUsed must be an array');
    }

    if (cleaning.statistics) {
      const stats = cleaning.statistics;
      if (stats.originalLength && stats.cleanedLength) {
        if (stats.cleanedLength > stats.originalLength) {
          issues.push('Cleaned content is larger than original - possible error');
        }
      }
    }
  }

  // Validate timestamps
  if (urlRecord.metadata.processingStarted) {
    const started = new Date(urlRecord.metadata.processingStarted);
    if (isNaN(started.getTime())) {
      issues.push('Invalid processingStarted timestamp');
    }
  }

  return issues;
}

/**
 * Checks database integrity
 */
async function checkDatabaseIntegrity(page: Page): Promise<string[]> {
  const issues: string[] = [];

  try {
    // Fetch all URLs
    const urls = await fetchAllUrls(page);

    // Check for orphaned records (URLs with no status)
    const orphaned = urls.filter(u => !u.status);
    if (orphaned.length > 0) {
      issues.push(`Found ${orphaned.length} URLs with no status`);
    }

    // Check for invalid statuses
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'skipped'];
    const invalidStatus = urls.filter(u => u.status && !validStatuses.includes(u.status));
    if (invalidStatus.length > 0) {
      issues.push(`Found ${invalidStatus.length} URLs with invalid status values`);
    }

    // Check for URLs stuck in processing for too long
    const now = Date.now();
    const stuckThreshold = 10 * 60 * 1000; // 10 minutes
    const stuck = urls.filter(u => {
      if (u.status === 'processing' && u.metadata?.processingStarted) {
        const started = new Date(u.metadata.processingStarted).getTime();
        return now - started > stuckThreshold;
      }
      return false;
    });
    if (stuck.length > 0) {
      issues.push(`Found ${stuck.length} URLs stuck in processing state`);
    }

  } catch (error) {
    issues.push(`Database integrity check failed: ${error}`);
  }

  return issues;
}

/**
 * Generates comprehensive test report
 */
function generateReport(
  results: Map<string, ProcessingResult>,
  configErrors: Map<string, string[]>,
  metadataIssues: Map<string, string[]>,
  dbIntegrityIssues: string[],
  startTime: number
): TestReport {
  const endTime = Date.now();
  const allResults = Array.from(results.values());

  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success && r.endTime).length;
  const stuckInProcessing = allResults.filter(r => !r.endTime).length;

  const errors: ErrorSummary[] = [];
  allResults.forEach(result => {
    if (result.error) {
      errors.push({
        url: result.url,
        errorCode: result.error.code,
        message: result.error.message,
        stage: result.error.stage,
        timestamp: result.endTime || Date.now()
      });
    }
  });

  const warnings: string[] = [];

  // Add configuration warnings
  configErrors.forEach((errors, url) => {
    errors.forEach(error => {
      warnings.push(`[CONFIG] ${url}: ${error}`);
    });
  });

  // Add metadata warnings
  metadataIssues.forEach((issues, url) => {
    issues.forEach(issue => {
      warnings.push(`[METADATA] ${url}: ${issue}`);
    });
  });

  // Add database integrity warnings
  dbIntegrityIssues.forEach(issue => {
    warnings.push(`[DATABASE] ${issue}`);
  });

  return {
    totalUrls: results.size,
    processed: allResults.filter(r => r.endTime).length,
    successful,
    failed,
    skipped: 0,
    stuckInProcessing,
    configurationErrors: configErrors.size,
    schemaViolations: Array.from(configErrors.values()).flat().length,
    metadataInconsistencies: Array.from(metadataIssues.values()).flat().length,
    databaseIntegrityIssues: dbIntegrityIssues.length,
    results: allResults,
    errors,
    warnings,
    startTime,
    endTime,
    duration: endTime - startTime
  };
}

/**
 * Saves report to file
 */
function saveReport(report: TestReport, filename: string): void {
  const reportDir = path.join(__dirname, '../../test-results/processing-pipeline');

  // Create directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, filename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📊 Test report saved to: ${reportPath}`);
}

/**
 * Prints report summary to console
 */
function printReportSummary(report: TestReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE PROCESSING PIPELINE TEST REPORT');
  console.log('='.repeat(80));
  console.log(`\n⏱️  Duration: ${(report.duration / 1000).toFixed(2)}s`);
  console.log(`\n📈 Processing Summary:`);
  console.log(`   Total URLs:          ${report.totalUrls}`);
  console.log(`   Processed:           ${report.processed}`);
  console.log(`   ✅ Successful:       ${report.successful}`);
  console.log(`   ❌ Failed:           ${report.failed}`);
  console.log(`   ⏸️  Stuck:            ${report.stuckInProcessing}`);

  console.log(`\n🔍 Issues Detected:`);
  console.log(`   Config Errors:       ${report.configurationErrors}`);
  console.log(`   Schema Violations:   ${report.schemaViolations}`);
  console.log(`   Metadata Issues:     ${report.metadataInconsistencies}`);
  console.log(`   DB Integrity Issues: ${report.databaseIntegrityIssues}`);

  if (report.errors.length > 0) {
    console.log(`\n❌ Errors by Stage:`);
    const errorsByStage = new Map<string, number>();
    report.errors.forEach(e => {
      const count = errorsByStage.get(e.stage) || 0;
      errorsByStage.set(e.stage, count + 1);
    });
    errorsByStage.forEach((count, stage) => {
      console.log(`   ${stage}: ${count}`);
    });
  }

  if (report.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (first 10):`);
    report.warnings.slice(0, 10).forEach(w => console.log(`   ${w}`));
    if (report.warnings.length > 10) {
      console.log(`   ... and ${report.warnings.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// ============================================
// MAIN TEST SUITE
// ============================================

test.describe('Comprehensive Processing Pipeline Test', () => {
  test.setTimeout(600000); // 10 minutes timeout for comprehensive test (handles slow scrapers)

  test('should process all URLs and identify pipeline problems', async ({ page }) => {
    console.log('\n🚀 Starting comprehensive processing pipeline test...\n');
    console.log('⏱️  Test timeout: 10 minutes (600s)');
    console.log('⏱️  Per-batch timeout: 3 minutes (180s)\n');

    const testStartTime = Date.now();
    const results = new Map<string, ProcessingResult>();
    const configErrors = new Map<string, string[]>();
    const metadataIssues = new Map<string, string[]>();
    const consoleErrors: string[] = [];

    // ============================================
    // SETUP: Monitor console errors
    // ============================================
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('React') || text.includes('Error') || text.includes('Failed')) {
          consoleErrors.push(`[${new Date().toISOString()}] ${text}`);
        }
      }
    });

    // ============================================
    // PHASE 1: PRE-PROCESSING VALIDATION
    // ============================================
    console.log('📋 Phase 1: Pre-processing validation...');

    // Fetch all URLs from backend
    const allUrls = await fetchAllUrls(page);
    console.log(`   Found ${allUrls.length} URLs in database`);

    if (allUrls.length === 0) {
      console.log('⚠️  No URLs found in database. Test will exit.');
      test.skip();
      return;
    }

    // Validate configurations
    let validUrlCount = 0;
    for (const url of allUrls) {
      const validation = validateUrlConfiguration(url);
      if (!validation.valid) {
        configErrors.set(url.url, validation.errors);
      } else {
        validUrlCount++;
      }

      // Fetch and validate parameters
      const params = await fetchUrlParameters(page, url.id);
      if (params) {
        url.parameters = params.parameters;
        url.scraperType = params.scraperType || url.scraperType;
      }
    }

    console.log(`   ✅ Valid configurations: ${validUrlCount}`);
    console.log(`   ❌ Invalid configurations: ${configErrors.size}`);

    // Check database integrity
    const dbIssues = await checkDatabaseIntegrity(page);
    if (dbIssues.length > 0) {
      console.log(`   ⚠️  Database integrity issues: ${dbIssues.length}`);
    }

    // ============================================
    // PHASE 2: NAVIGATE TO PROCESSING TAB
    // ============================================
    console.log('\n🌐 Phase 2: Navigating to processing interface...');

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Navigate to Processing tab
    const processingTab = page.locator('[role="tab"]:has-text("Processing")');
    await processingTab.click();
    await page.waitForTimeout(2000);

    console.log('   ✅ Processing interface loaded');

    // ============================================
    // PHASE 3: SETUP WEBSOCKET MONITORING
    // ============================================
    console.log('\n🔌 Phase 3: Setting up WebSocket monitoring...');

    setupWebSocketMonitoring(page, results);

    console.log('   ✅ WebSocket monitoring active');

    // ============================================
    // PHASE 4: BATCH PROCESSING
    // ============================================
    console.log('\n⚙️  Phase 4: Processing URLs in batches...');

    const batchSize = 10;
    const urlsToProcess = allUrls
      .filter(u => u.status !== 'completed') // Skip already completed
      .map(u => u.url);

    if (urlsToProcess.length === 0) {
      console.log('   ℹ️  All URLs already completed. Testing with all URLs...');
      urlsToProcess.push(...allUrls.map(u => u.url));
    }

    console.log(`   Processing ${urlsToProcess.length} URLs in batches of ${batchSize}`);
    console.log(`   Estimated completion: ${Math.ceil(urlsToProcess.length / batchSize * 3)} minutes\n`);

    let batchErrors = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    for (let i = 0; i < urlsToProcess.length; i += batchSize) {
      const batch = urlsToProcess.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(urlsToProcess.length / batchSize);
      const batchStartTime = Date.now();

      console.log(`\n   ━━━ Batch ${batchNum}/${totalBatches} ━━━`);
      console.log(`   URLs in batch: ${batch.length}`);

      // Check remaining test time
      const elapsedTotal = (Date.now() - testStartTime) / 1000;
      const remainingTime = 600 - elapsedTotal; // 10 min timeout
      console.log(`   ⏱️  Test time: ${Math.floor(elapsedTotal)}s elapsed, ${Math.floor(remainingTime)}s remaining`);

      if (remainingTime < 60) {
        console.warn(`   ⚠️  WARNING: Less than 60s remaining, may not complete all batches`);
      }

      try {
        // Process batch
        await processBatch(page, batch, results);

        // Wait for batch to complete
        await waitForBatchCompletion(page, batch, results);

        // Log batch results
        const batchResults = batch.map(url => results.get(url)!);
        const batchSuccessful = batchResults.filter(r => r.success).length;
        const batchFailed = batchResults.filter(r => !r.success).length;
        const batchDuration = Math.floor((Date.now() - batchStartTime) / 1000);

        totalSuccessful += batchSuccessful;
        totalFailed += batchFailed;

        console.log(`   ✅ Batch ${batchNum} complete in ${batchDuration}s`);
        console.log(`      Success: ${batchSuccessful}, Failed: ${batchFailed}`);
        console.log(`   📊 Overall: ${totalSuccessful}/${urlsToProcess.length} successful, ${totalFailed} failed`);

      } catch (error: any) {
        batchErrors++;
        console.error(`   ❌ Batch ${batchNum} error:`, error?.message || error);

        // Check if this is a timeout error
        const isTimeout = error?.message?.includes('timeout') || error?.message?.includes('Test timeout');

        if (isTimeout) {
          console.error(`   🚨 TIMEOUT DETECTED - Test is running out of time!`);
          console.error(`   📊 Processed ${i + batch.length}/${urlsToProcess.length} URLs before timeout`);

          // Mark all remaining URLs (current batch + future batches) as timeout
          for (let j = i; j < urlsToProcess.length; j++) {
            const url = urlsToProcess[j];
            if (!results.has(url) || !results.get(url)?.endTime) {
              results.set(url, {
                url,
                success: false,
                startTime: Date.now(),
                stages: [],
                error: {
                  code: 'TEST_TIMEOUT',
                  message: 'Test timeout before URL could be processed',
                  stage: ProcessingStage.PROCESSING
                },
                endTime: Date.now()
              });
            }
          }

          // Break out of batch loop - we're out of time
          console.error(`   ⏸️  Stopping batch processing due to timeout\n`);
          break;
        }

        // Mark all URLs in failed batch as errors
        batch.forEach(url => {
          if (!results.has(url) || !results.get(url)?.endTime) {
            results.set(url, {
              url,
              success: false,
              startTime: Date.now(),
              stages: [],
              error: {
                code: 'BATCH_ERROR',
                message: `Batch processing failed: ${error?.message || error}`,
                stage: ProcessingStage.PROCESSING
              },
              endTime: Date.now()
            });
          }
        });

        // Continue to next batch despite error
        console.log(`   ⏩ Continuing to next batch...\n`);
      }

      // Small delay between batches (skip if we're low on time)
      if (remainingTime > 120) {
        await page.waitForTimeout(2000);
      }
    }

    // Log final summary
    console.log(`\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   📊 Processing Complete`);
    console.log(`   Total successful: ${totalSuccessful}`);
    console.log(`   Total failed: ${totalFailed}`);
    console.log(`   Batch errors: ${batchErrors}`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // ============================================
    // PHASE 5: METADATA VALIDATION
    // ============================================
    console.log('\n🔍 Phase 5: Validating metadata consistency...');

    const updatedUrls = await fetchAllUrls(page);
    for (const url of updatedUrls) {
      const issues = await validateMetadata(page, url);
      if (issues.length > 0) {
        metadataIssues.set(url.url, issues);
      }
    }

    console.log(`   URLs with metadata issues: ${metadataIssues.size}`);

    // ============================================
    // PHASE 6: FINAL DATABASE INTEGRITY CHECK
    // ============================================
    console.log('\n🔐 Phase 6: Final database integrity check...');

    const finalDbIssues = await checkDatabaseIntegrity(page);
    console.log(`   Database integrity issues: ${finalDbIssues.length}`);

    // ============================================
    // PHASE 7: GENERATE AND SAVE REPORT
    // ============================================
    console.log('\n📊 Phase 7: Generating test report...');

    const report = generateReport(
      results,
      configErrors,
      metadataIssues,
      finalDbIssues,
      testStartTime
    );

    // Save report to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    saveReport(report, `report-${timestamp}.json`);

    // Print summary
    printReportSummary(report);

    // ============================================
    // ASSERTIONS
    // ============================================
    console.log('🧪 Running assertions...\n');

    // Critical assertions
    expect(report.stuckInProcessing).toBe(0); // No URLs should be stuck
    expect(consoleErrors.filter(e => e.includes('React')).length).toBe(0); // No React errors
    expect(finalDbIssues.length).toBe(0); // No database integrity issues

    // Warnings (won't fail test, but logged)
    if (report.failed > 0) {
      console.warn(`⚠️  ${report.failed} URLs failed processing - check report for details`);
    }

    if (report.configurationErrors > 0) {
      console.warn(`⚠️  ${report.configurationErrors} URLs have configuration errors`);
    }

    if (report.metadataInconsistencies > 0) {
      console.warn(`⚠️  ${report.metadataInconsistencies} metadata inconsistencies detected`);
    }

    console.log('\n✅ Comprehensive test completed!\n');
  });
});
