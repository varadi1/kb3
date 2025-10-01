# Comprehensive Processing Pipeline Test Guide

## Overview

The `comprehensive-processing-pipeline.spec.ts` test is a **ultra-detailed E2E test** that processes **all URLs** in your KB3 system with their actual per-URL settings to identify processing problems, configuration misalignments, and failing jobs.

## What It Tests

### 1. **Pre-Processing Validation**
- ✅ Database connectivity and schema integrity
- ✅ URL configuration validation (scraper type, parameters, cleaners)
- ✅ Parameter schema compliance
- ✅ Orphaned or malformed URL records
- ✅ Authority levels (0-5 validation)

### 2. **Processing Pipeline Stages**
For **each URL** in the system:
- ✅ **Stage 1: URL Detection** - Classification correctness
- ✅ **Stage 2: Content Fetching** - Scraper selection and execution
- ✅ **Stage 3: Content Processing** - Processor compatibility
- ✅ **Stage 4: Text Cleaning** - Cleaner chain execution
- ✅ **Stage 5: Storage** - File persistence and DB updates
- ✅ **Stage 6: Indexing** - Knowledge store entry creation

### 3. **Configuration Validation**
- ✅ Scraper parameter schema compliance
- ✅ Fallback to defaults when custom config is invalid
- ✅ Cleaner configuration and ordering
- ✅ Authority level bounds checking

### 4. **Error Detection & Categorization**
- ✅ All error types (fetch, process, storage, timeout)
- ✅ Partial failures (some stages succeed, others fail)
- ✅ Rate limiting issues
- ✅ Memory/resource exhaustion
- ✅ WebSocket disconnections during processing

### 5. **Metadata Consistency**
- ✅ All metadata fields populated correctly
- ✅ Scraper metadata preserved through pipeline
- ✅ Cleaning statistics accuracy
- ✅ Processing timestamps logic validation

### 6. **Queue Management**
- ✅ Queue state transitions (pending → processing → completed/failed)
- ✅ Queue statistics accuracy
- ✅ Stuck/zombie processing items detection
- ✅ Concurrent processing limits

### 7. **Database Integrity**
- ✅ URL status updates are atomic
- ✅ Foreign key constraints
- ✅ Tag associations persist
- ✅ No orphaned file records

## Running the Test

### Prerequisites

1. **Backend must be running** on port 4000:
   ```bash
   cd packages/backend
   npm run dev
   ```

2. **Frontend must be running** on port 3000:
   ```bash
   cd packages/frontend
   npm run dev
   ```

3. **Database must have URLs** - the test will process all URLs in your system

### Run the Test

```bash
cd packages/frontend

# Run in a specific browser
npx playwright test comprehensive-processing-pipeline.spec.ts --project=chromium

# Run with UI mode (recommended for debugging)
npx playwright test comprehensive-processing-pipeline.spec.ts --ui

# Run with debug output
DEBUG=pw:api npx playwright test comprehensive-processing-pipeline.spec.ts

# Run headlessly (CI mode)
npx playwright test comprehensive-processing-pipeline.spec.ts --headed=false
```

### Test Duration

- **Small dataset** (< 50 URLs): 3-8 minutes
- **Medium dataset** (50-200 URLs): 8-20 minutes
- **Large dataset** (> 200 URLs): 20-40 minutes

Test timeout is set to **10 minutes** (600,000ms) to accommodate slow scrapers like Playwright, Crawl4AI, and Docling. Per-batch timeout is **3 minutes** (180,000ms).

**Note**: Actual processing time depends heavily on:
- Scraper types used (Playwright/Crawl4AI are slower)
- Network speed and website response times
- System resources available
- Number of cleaners configured

## Understanding the Output

### Console Output

The test provides detailed console output in **7 phases**:

```
🚀 Starting comprehensive processing pipeline test...
⏱️  Test timeout: 10 minutes (600s)
⏱️  Per-batch timeout: 3 minutes (180s)

📋 Phase 1: Pre-processing validation...
   Found 150 URLs in database
   ✅ Valid configurations: 145
   ❌ Invalid configurations: 5

🌐 Phase 2: Navigating to processing interface...
   ✅ Processing interface loaded

🔌 Phase 3: Setting up WebSocket monitoring...
   ✅ WebSocket monitoring active

⚙️  Phase 4: Processing URLs in batches...
   Processing 150 URLs in batches of 10
   Estimated completion: 45 minutes

   ━━━ Batch 1/15 ━━━
   URLs in batch: 10
   ⏱️  Test time: 23s elapsed, 577s remaining
   ⏳ Progress: 5/10 URLs completed (15s elapsed)
   📊 Queue: 3 processing, 2 pending
   ✅ Batch 1 complete in 42s
      Success: 8, Failed: 2
   📊 Overall: 8/150 successful, 2 failed

   [... continues for all batches ...]

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 Processing Complete
   Total successful: 142
   Total failed: 8
   Batch errors: 0
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Phase 5: Validating metadata consistency...
   URLs with metadata issues: 3

🔐 Phase 6: Final database integrity check...
   Database integrity issues: 0

📊 Phase 7: Generating test report...
   📊 Test report saved to: test-results/processing-pipeline/report-2025-01-29T12-34-56.json
```

**New Features in Console Output:**
- **Real-time progress tracking** - See URLs completing within each batch
- **Time remaining warnings** - Get alerts when test is running low on time
- **Per-batch duration** - Know how long each batch takes
- **Running totals** - See cumulative success/failure counts
- **Queue status updates** - Monitor backend processing state

### Test Report Summary

At the end, you'll see a comprehensive summary:

```
================================================================================
📊 COMPREHENSIVE PROCESSING PIPELINE TEST REPORT
================================================================================

⏱️  Duration: 342.56s

📈 Processing Summary:
   Total URLs:          150
   Processed:           150
   ✅ Successful:       142
   ❌ Failed:           8
   ⏸️  Stuck:            0

🔍 Issues Detected:
   Config Errors:       5
   Schema Violations:   7
   Metadata Issues:     3
   DB Integrity Issues: 0

❌ Errors by Stage:
   fetching: 5
   processing: 2
   storing: 1

⚠️  Warnings (first 10):
   [CONFIG] https://example.com: Invalid scraper type: unknown_scraper
   [METADATA] https://test.com: Cleaned content is larger than original
   ...

================================================================================
```

### JSON Test Report

A detailed JSON report is saved to:
```
packages/frontend/test-results/processing-pipeline/report-[timestamp].json
```

The report structure:

```json
{
  "totalUrls": 150,
  "processed": 150,
  "successful": 142,
  "failed": 8,
  "stuckInProcessing": 0,
  "configurationErrors": 5,
  "schemaViolations": 7,
  "metadataInconsistencies": 3,
  "databaseIntegrityIssues": 0,
  "results": [
    {
      "url": "https://example.com",
      "success": true,
      "startTime": 1706534400000,
      "endTime": 1706534425000,
      "stages": [
        {
          "stage": "detecting",
          "success": true,
          "duration": 150,
          "timestamp": 1706534400150
        },
        // ... more stages
      ],
      "finalStatus": "completed"
    }
    // ... more results
  ],
  "errors": [
    {
      "url": "https://failing-url.com",
      "errorCode": "FETCH_FAILED",
      "message": "Network timeout after 30000ms",
      "stage": "fetching",
      "timestamp": 1706534450000
    }
    // ... more errors
  ],
  "warnings": [
    "[CONFIG] https://url.com: Invalid authority level: 10 (must be 0-5)",
    "[METADATA] https://url.com: Missing metadata object"
  ],
  "startTime": 1706534400000,
  "endTime": 1706534742560,
  "duration": 342560
}
```

## Interpreting Results

### ✅ All Good
If you see:
- `stuckInProcessing: 0`
- `databaseIntegrityIssues: 0`
- No React console errors
- All URLs either completed or failed with documented error codes

**Your pipeline is healthy!**

### ⚠️ Configuration Issues
If you see configuration errors:
1. Check the warnings section for specific URLs
2. Validate scraper types are valid: `http`, `playwright`, `crawl4ai`, `docling`, `deepdoctection`
3. Check authority levels are 0-5
4. Verify parameter schemas match scraper requirements

### ❌ Processing Failures
If URLs are failing at specific stages:

**Detecting Stage:**
- URL format issues
- Unsupported URL types

**Fetching Stage:**
- Network timeouts
- Invalid URLs
- Scraper not available
- Rate limiting

**Processing Stage:**
- Content processor errors
- Unsupported content types
- Memory issues

**Storing Stage:**
- Disk space issues
- File permission errors
- Database write failures

**Indexing Stage:**
- Knowledge store errors
- Database constraints

### 🔴 Critical Issues

**URLs Stuck in Processing:**
```
stuckInProcessing: 5
```
This means URLs never completed and are still in "processing" state. Possible causes:
- Queue processing stopped
- WebSocket disconnection
- Backend crash during processing
- Infinite loop in processing code

**Database Integrity Issues:**
```
databaseIntegrityIssues: 3
```
This indicates fundamental problems:
- Orphaned records
- Invalid foreign keys
- Corrupted status values
- Inconsistent state

**React Rendering Errors:**
If you see React errors in console, this indicates:
- Invalid data structure being passed to components
- Missing null checks
- Type mismatches

## Troubleshooting

### Test Times Out

**The test has been improved to handle timeouts gracefully!** It will now:
- Detect when approaching timeout and warn you
- Mark incomplete URLs with proper error codes
- Generate partial results even if timeout occurs
- Continue processing other batches if one fails

If you still experience timeouts:

1. **Increase global timeout**:
   ```typescript
   test.setTimeout(900000); // 15 minutes instead of 10
   ```

2. **Increase per-batch timeout**:
   ```typescript
   await waitForBatchCompletion(page, batch, results, 300000); // 5 minutes instead of 3
   ```

3. **Reduce batch size** (for slower systems):
   ```typescript
   const batchSize = 5; // Instead of 10
   ```

4. **Process fewer URLs** (for testing):
   ```typescript
   // Only process first 20 URLs
   const urlsToProcess = allUrls.slice(0, 20).map(u => u.url);
   ```

5. **Filter by scraper type** (test specific scrapers):
   ```typescript
   // Only test fast HTTP scraper
   const urlsToProcess = allUrls
     .filter(u => u.scraperType === 'http')
     .map(u => u.url);
   ```

6. **Check backend performance**:
   - Monitor CPU/memory usage during test
   - Check if scrapers are hanging
   - Look for rate limiting issues
   - Verify network connectivity

### Backend Crashes During Test
If backend crashes:
1. Check backend logs for memory issues
2. Reduce concurrent processing in backend config
3. Process URLs in smaller batches

### WebSocket Not Connecting
If WebSocket monitoring fails:
1. Verify backend WebSocket server is running
2. Check CORS settings
3. Look for firewall/network issues

### Reports Not Saving
If report files aren't created:
1. Check write permissions on `test-results/` directory
2. Verify Node.js has filesystem access
3. Check available disk space

## Advanced Usage

### Testing Specific URL Subsets

Modify the test to filter URLs:

```typescript
// Only test URLs with specific status
const urlsToProcess = allUrls
  .filter(u => u.status === 'failed') // Only retry failed URLs
  .map(u => u.url);

// Only test specific scraper types
const urlsToProcess = allUrls
  .filter(u => u.scraperType === 'playwright')
  .map(u => u.url);

// Only test URLs with tags
const urlsToProcess = allUrls
  .filter(u => u.tags && u.tags.includes('important'))
  .map(u => u.url);
```

### Adjusting Batch Size

Change processing concurrency:

```typescript
// Smaller batches for stability
const batchSize = 5;

// Larger batches for speed (if system can handle it)
const batchSize = 20;
```

### Customizing Validation

Add your own validation checks:

```typescript
// Add custom metadata validation
function validateCustomMetadata(url: UrlRecord): string[] {
  const issues: string[] = [];

  // Your custom checks
  if (url.metadata?.customField && url.metadata.customField < 0) {
    issues.push('Custom field must be positive');
  }

  return issues;
}
```

### Integration with CI/CD

Run in CI pipeline:

```yaml
# .github/workflows/e2e-comprehensive.yml
name: Comprehensive Pipeline Test

on:
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM
  workflow_dispatch:      # Manual trigger

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd packages/backend && npm install
          cd ../frontend && npm install
          npx playwright install

      - name: Start services
        run: |
          cd packages/backend && npm run dev &
          cd packages/frontend && npm run dev &
          sleep 30  # Wait for services to start

      - name: Run comprehensive test
        run: |
          cd packages/frontend
          npx playwright test comprehensive-processing-pipeline.spec.ts

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: packages/frontend/test-results/processing-pipeline/
```

## Best Practices

1. **Run regularly**: Schedule this test to run daily or weekly to catch regressions early

2. **Baseline results**: Keep historical reports to track trends in success rates

3. **Fix critical issues first**: Prioritize stuck URLs and database integrity issues

4. **Review warnings**: Even if test passes, review warnings for potential problems

5. **Monitor resource usage**: Watch CPU/memory during test to identify resource leaks

6. **Test in staging first**: Don't run on production database without backing up

7. **Keep reports**: Archive reports for historical analysis

## Support

If you encounter issues with this test:

1. Check this guide thoroughly
2. Review the test output and reports
3. Enable debug logging: `DEBUG=pw:api npx playwright test ...`
4. Check backend logs during test execution
5. Verify database state before and after test

## Maintenance

This test should be updated when:
- New scrapers are added to the system
- New processing stages are introduced
- Database schema changes
- New validation rules are added
- Error codes change

Update the corresponding validation functions and assertions in the test file.
