/**
 * End-to-End Tests for Complete User Workflows
 * Using Playwright for browser automation
 */

import { test, expect, Page } from '@playwright/test'

// Skip E2E tests in CI environment or when servers aren't running
const SKIP_E2E = !process.env.E2E_ENABLED

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const API_URL = process.env.API_URL || 'http://localhost:4000'

test.skip(SKIP_E2E, 'E2E tests require running servers')

// Helper functions
async function waitForTableLoad(page: Page) {
  await page.waitForSelector('[role="table"]', { timeout: 10000 })
  await page.waitForLoadState('networkidle')
}

async function selectUrlByIndex(page: Page, index: number) {
  const checkbox = page.locator('[role="checkbox"]').nth(index + 1) // Skip header checkbox
  await checkbox.click()
  await expect(checkbox).toBeChecked()
}

async function openDropdownMenu(page: Page, index: number) {
  const moreButton = page.locator('[data-testid="more-button"]').nth(index)
  await moreButton.click()
  await page.waitForSelector('[data-testid="dropdown-content"]')
}

test.describe('KB3 Complete User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL)
    await page.waitForLoadState('domcontentloaded')
  })

  test.describe('Workflow 1: Complete URL Processing Pipeline', () => {
    test('should add URL, configure scraper, process, and view content', async ({ page }) => {
      // Step 1: Add a new URL
      await page.click('[data-testid="add-url-button"]')
      await page.fill('[placeholder="Enter URL"]', 'https://example.com/test-article')
      await page.fill('[placeholder="Add tags"]', 'test, documentation')
      await page.fill('[placeholder="Add notes"]', 'Test article for E2E testing')
      await page.click('button:has-text("Add URL")')

      // Wait for URL to appear in table
      await waitForTableLoad(page)
      await expect(page.locator('text=https://example.com/test-article')).toBeVisible()

      // Step 2: Configure scraper for the URL
      await openDropdownMenu(page, 0)
      await page.click('text=Edit')

      // Wait for edit dialog
      await page.waitForSelector('[data-testid="edit-url-dialog"]')

      // Select scraper type
      await page.click('[data-testid="scraper-select"]')
      await page.click('text=Playwright')

      // Configure parameters
      await page.click('button:has-text("Configure Parameters")')
      await page.waitForSelector('[data-testid="parameter-editor"]')

      // Set Playwright parameters
      await page.uncheck('[name="headless"]')
      await page.fill('[name="viewport.width"]', '1920')
      await page.fill('[name="viewport.height"]', '1080')
      await page.check('[name="screenshot"]')

      await page.click('button:has-text("Save Parameters")')
      await page.click('button:has-text("Save Changes")')

      // Step 3: Process the URL
      await selectUrlByIndex(page, 0)
      await openDropdownMenu(page, 0)
      await page.click('text=Process')

      // Wait for processing to complete
      await page.waitForSelector('.bg-green-100:has-text("completed")', { timeout: 30000 })

      // Step 4: View processed content
      await openDropdownMenu(page, 0)
      await page.click('text=View Content')

      // Verify content viewer opens
      await page.waitForSelector('[data-testid="content-viewer"]')
      await expect(page.locator('text=Cleaned Content')).toBeVisible()
      await expect(page.locator('text=Original Content')).toBeVisible()

      // Step 5: Compare content
      await page.click('[data-testid="compare-button"]')
      await expect(page.locator('[data-testid="comparison-view"]')).toBeVisible()

      // Step 6: Download cleaned content
      await page.click('[data-testid="download-cleaned-button"]')

      // Verify download initiated (check for download event)
      const download = await page.waitForEvent('download')
      expect(download.suggestedFilename()).toContain('cleaned')
    })
  })

  test.describe('Workflow 2: Batch URL Management', () => {
    test('should add multiple URLs, assign tags, and process in batch', async ({ page }) => {
      // Step 1: Add multiple URLs via batch dialog
      await page.click('[data-testid="batch-add-button"]')

      const urlList = `
        https://site1.com [api, reference]
        https://site2.com [api, tutorial]
        https://site3.com [documentation]
        https://site4.com
      `

      await page.fill('[data-testid="batch-urls-textarea"]', urlList)
      await page.fill('[data-testid="global-tags-input"]', 'batch-import')
      await page.click('button:has-text("Add URLs")')

      // Wait for URLs to appear
      await waitForTableLoad(page)
      await expect(page.locator('text=https://site1.com')).toBeVisible()
      await expect(page.locator('text=https://site4.com')).toBeVisible()

      // Step 2: Select multiple URLs
      await page.click('[data-testid="select-all-checkbox"]')
      await expect(page.locator('[data-testid="batch-operations-panel"]')).toBeVisible()

      // Step 3: Batch assign new tags
      await page.fill('[data-testid="batch-tags-input"]', 'processed')
      await page.keyboard.press('Enter')
      await page.click('button:has-text("Assign Tags")')

      // Step 4: Batch update authority
      await page.click('[data-testid="authority-select"]')
      await page.click('text=Level 4')
      await page.click('button:has-text("Update Authority")')

      // Step 5: Batch process URLs
      await page.click('button:has-text("Process Selected")')

      // Monitor processing queue
      await page.click('[data-testid="processing-queue-tab"]')
      await expect(page.locator('[data-testid="processing-item"]')).toHaveCount(4)

      // Wait for all to complete
      await page.waitForFunction(
        () => {
          const items = document.querySelectorAll('[data-testid="processing-complete"]')
          return items.length === 4
        },
        { timeout: 60000 }
      )

      // Step 6: Export processed URLs
      await page.click('[data-testid="select-all-checkbox"]')
      await page.click('button:has-text("Export Selected")')

      await page.click('[data-testid="export-format-select"]')
      await page.click('text=JSON')
      await page.click('button:has-text("Download Export")')

      // Verify export download
      const download = await page.waitForEvent('download')
      expect(download.suggestedFilename()).toContain('.json')
    })
  })

  test.describe('Workflow 3: Tag Hierarchy Management', () => {
    test('should create tag hierarchy, assign to URLs, and filter', async ({ page }) => {
      // Step 1: Create parent tag
      await page.click('[data-testid="tags-tab"]')
      await page.fill('[placeholder="New tag name"]', 'Knowledge Base')
      await page.click('[data-testid="add-tag-button"]')

      // Step 2: Create child tags
      await page.fill('[placeholder="New tag name"]', 'Technical Docs')
      await page.click('[data-testid="parent-tag-select"]')
      await page.click('text=Knowledge Base')
      await page.click('[data-testid="add-tag-button"]')

      await page.fill('[placeholder="New tag name"]', 'API Reference')
      await page.click('[data-testid="parent-tag-select"]')
      await page.click('text=Knowledge Base')
      await page.click('[data-testid="add-tag-button"]')

      // Step 3: Verify hierarchy display
      await expect(page.locator('[data-testid="tag-tree"]')).toBeVisible()
      await page.click('[data-testid="expand-tag-Knowledge Base"]')
      await expect(page.locator('text=Technical Docs')).toBeVisible()
      await expect(page.locator('text=API Reference')).toBeVisible()

      // Step 4: Add URLs and assign tags
      await page.click('[data-testid="urls-tab"]')
      await page.click('[data-testid="add-url-button"]')
      await page.fill('[placeholder="Enter URL"]', 'https://docs.example.com')

      // Select from tag hierarchy
      await page.click('[data-testid="tag-selector"]')
      await page.click('text=Technical Docs')
      await page.click('button:has-text("Add URL")')

      // Step 5: Filter by tag
      await page.click('[data-testid="filter-button"]')
      await page.click('[data-testid="tag-filter"]')
      await page.click('text=Technical Docs')
      await page.click('button:has-text("Apply Filters")')

      // Verify filtered results
      await expect(page.locator('text=https://docs.example.com')).toBeVisible()
      await expect(page.locator('[data-testid="url-row"]')).toHaveCount(1)

      // Step 6: Edit tag hierarchy
      await page.click('[data-testid="tags-tab"]')
      await page.click('[data-testid="edit-tag-Technical Docs"]')
      await page.fill('[data-testid="tag-name-input"]', 'Technical Documentation')
      await page.click('[data-testid="save-tag-button"]')

      // Verify update
      await expect(page.locator('text=Technical Documentation')).toBeVisible()
    })
  })

  test.describe('Workflow 4: Content Reprocessing and Optimization', () => {
    test('should reprocess content with different cleaners', async ({ page }) => {
      // Assume we have a processed URL
      await page.goto(`${BASE_URL}?sample=true`) // Load with sample data

      // Step 1: Open content viewer
      await waitForTableLoad(page)
      await openDropdownMenu(page, 0)
      await page.click('text=View Content')

      // Step 2: Open reprocessor
      await page.click('[data-testid="reprocess-button"]')
      await page.waitForSelector('[data-testid="content-reprocessor"]')

      // Step 3: Configure cleaners
      await page.uncheck('[data-testid="cleaner-sanitizehtml"]')
      await page.check('[data-testid="cleaner-readability"]')
      await page.check('[data-testid="cleaner-voca"]')

      // Reorder cleaners
      await page.dragAndDrop(
        '[data-testid="cleaner-item-voca"]',
        '[data-testid="cleaner-item-readability"]'
      )

      // Step 4: Preview changes
      await page.click('button:has-text("Preview")')
      await page.waitForSelector('[data-testid="preview-content"]')

      // Check statistics
      const reductionText = await page.locator('[data-testid="reduction-percentage"]').textContent()
      expect(reductionText).toContain('%')

      // Step 5: Apply configuration
      await page.click('button:has-text("Apply Configuration")')

      // Step 6: Save as template
      await page.click('[data-testid="save-as-template-button"]')
      await page.fill('[data-testid="template-name-input"]', 'Optimized Cleaning')
      await page.click('button:has-text("Save Template")')

      // Verify template saved
      await page.click('[data-testid="templates-dropdown"]')
      await expect(page.locator('text=Optimized Cleaning')).toBeVisible()
    })
  })

  test.describe('Workflow 5: Import and Migration', () => {
    test('should import URLs from various formats', async ({ page }) => {
      // Step 1: Navigate to import/export
      await page.click('[data-testid="import-export-tab"]')

      // Step 2: Import JSON
      await page.click('[data-testid="import-tab"]')
      await page.click('[data-testid="format-select"]')
      await page.click('text=JSON')

      const jsonData = JSON.stringify([
        { url: 'https://import1.com', tags: ['imported'], authority: 3 },
        { url: 'https://import2.com', tags: ['imported', 'api'], authority: 5 }
      ])

      await page.fill('[data-testid="import-textarea"]', jsonData)
      await page.click('button:has-text("Validate")')

      // Check validation results
      await expect(page.locator('text=2 URLs ready to import')).toBeVisible()

      await page.click('button:has-text("Import")')

      // Step 3: Verify imported URLs
      await page.click('[data-testid="urls-tab"]')
      await waitForTableLoad(page)
      await expect(page.locator('text=https://import1.com')).toBeVisible()
      await expect(page.locator('text=https://import2.com')).toBeVisible()

      // Step 4: Import CSV
      await page.click('[data-testid="import-export-tab"]')
      await page.click('[data-testid="format-select"]')
      await page.click('text=CSV')

      const csvData = `url,tags,authority
https://csv1.com,"tag1,tag2",2
https://csv2.com,"tag3",4`

      await page.fill('[data-testid="import-textarea"]', csvData)
      await page.click('button:has-text("Import")')

      // Step 5: Import from file
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'urls.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('https://file1.com\nhttps://file2.com')
      })

      await page.click('button:has-text("Import from File")')

      // Verify all imports
      await page.click('[data-testid="urls-tab"]')
      await page.fill('[data-testid="search-input"]', 'imported')
      await page.keyboard.press('Enter')

      const rowCount = await page.locator('[data-testid="url-row"]').count()
      expect(rowCount).toBeGreaterThanOrEqual(2)
    })
  })

  test.describe('Workflow 6: Advanced Configuration', () => {
    test('should configure per-URL scraper parameters', async ({ page }) => {
      // Add a URL that requires special handling
      await page.click('[data-testid="add-url-button"]')
      await page.fill('[placeholder="Enter URL"]', 'https://dynamic-site.com')
      await page.click('button:has-text("Add URL")')

      await waitForTableLoad(page)

      // Open URL configuration
      await openDropdownMenu(page, 0)
      await page.click('text=Configure')

      // Configure Playwright with specific settings
      await page.click('[data-testid="scraper-select"]')
      await page.click('text=Playwright')

      await page.click('button:has-text("Advanced Settings")')

      // Set advanced parameters
      await page.fill('[name="timeout"]', '60000')
      await page.fill('[name="waitUntil"]', 'networkidle')
      await page.check('[name="javascript"]')
      await page.check('[name="cookies"]')

      // Add custom headers
      await page.click('button:has-text("Add Header")')
      await page.fill('[name="header-key-0"]', 'User-Agent')
      await page.fill('[name="header-value-0"]', 'KB3-Scraper/1.0')

      // Configure cleaner chain
      await page.click('[data-testid="cleaners-tab"]')
      await page.check('[data-testid="cleaner-readability"]')
      await page.check('[data-testid="cleaner-sanitizehtml"]')

      // Set cleaner parameters
      await page.click('[data-testid="cleaner-settings-readability"]')
      await page.fill('[name="minTextLength"]', '100')
      await page.check('[name="keepImages"]')

      await page.click('button:has-text("Save Configuration")')

      // Process with custom config
      await selectUrlByIndex(page, 0)
      await page.click('button:has-text("Process with Config")')

      // Verify processing uses custom settings
      await page.click('[data-testid="processing-details"]')
      await expect(page.locator('text=Playwright')).toBeVisible()
      await expect(page.locator('text=Custom Configuration')).toBeVisible()
    })
  })

  test.describe('Error Handling and Recovery', () => {
    test('should handle and recover from errors gracefully', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/urls', route => {
        route.abort('failed')
      })

      await page.goto(BASE_URL)

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('text=Failed to load URLs')).toBeVisible()

      // Retry button should be available
      await expect(page.locator('button:has-text("Retry")')).toBeVisible()

      // Fix network and retry
      await page.unroute('**/api/urls')
      await page.click('button:has-text("Retry")')

      // Should recover
      await waitForTableLoad(page)
      await expect(page.locator('[role="table"]')).toBeVisible()
    })

    test('should validate user input', async ({ page }) => {
      // Try to add invalid URL
      await page.click('[data-testid="add-url-button"]')
      await page.fill('[placeholder="Enter URL"]', 'not-a-valid-url')
      await page.click('button:has-text("Add URL")')

      // Should show validation error
      await expect(page.locator('text=Invalid URL format')).toBeVisible()

      // Button should remain disabled
      await expect(page.locator('button:has-text("Add URL")')).toBeDisabled()

      // Fix URL
      await page.fill('[placeholder="Enter URL"]', 'https://valid-url.com')

      // Button should be enabled
      await expect(page.locator('button:has-text("Add URL")')).toBeEnabled()
    })
  })

  test.describe('Performance and Responsiveness', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Load page with many URLs
      await page.goto(`${BASE_URL}?load=1000`)

      // Measure load time
      const startTime = Date.now()
      await waitForTableLoad(page)
      const loadTime = Date.now() - startTime

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(5000)

      // Pagination should be available
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible()

      // Search should be responsive
      await page.fill('[data-testid="search-input"]', 'example')
      await page.keyboard.press('Enter')

      // Results should update quickly
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 1000 })
    })

    test('should maintain responsiveness during batch operations', async ({ page }) => {
      // Select many URLs
      await page.goto(`${BASE_URL}?load=100`)
      await waitForTableLoad(page)
      await page.click('[data-testid="select-all-checkbox"]')

      // Start batch processing
      await page.click('button:has-text("Process Selected")')

      // UI should remain responsive
      await page.click('[data-testid="processing-queue-tab"]')
      await expect(page.locator('[data-testid="queue-status"]')).toBeVisible()

      // Should be able to navigate while processing
      await page.click('[data-testid="tags-tab"]')
      await expect(page.locator('[data-testid="tag-manager"]')).toBeVisible()

      // Can still interact with other features
      await page.click('[data-testid="import-export-tab"]')
      await expect(page.locator('[data-testid="import-panel"]')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(BASE_URL)
      await waitForTableLoad(page)

      // Tab through main navigation
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()

      // Navigate to add URL button with keyboard
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
      }

      // Activate with Enter
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="add-url-dialog"]')).toBeVisible()

      // Navigate dialog with keyboard
      await page.keyboard.press('Tab')
      await page.keyboard.type('https://keyboard-test.com')
      await page.keyboard.press('Tab')
      await page.keyboard.type('accessibility, test')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')

      // Verify URL added
      await expect(page.locator('text=https://keyboard-test.com')).toBeVisible()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto(BASE_URL)

      // Check main regions
      await expect(page.locator('[role="navigation"]')).toBeVisible()
      await expect(page.locator('[role="main"]')).toBeVisible()
      await expect(page.locator('[role="table"]')).toBeVisible()

      // Check interactive elements
      const buttons = await page.locator('button[aria-label]').all()
      expect(buttons.length).toBeGreaterThan(0)

      // Check form inputs
      const inputs = await page.locator('input[aria-label], input[aria-describedby]').all()
      expect(inputs.length).toBeGreaterThan(0)
    })
  })
})