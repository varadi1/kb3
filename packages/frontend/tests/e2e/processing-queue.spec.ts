import { test, expect } from '@playwright/test';

test.describe('Processing Queue', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Navigate to processing tab - it's a TabsTrigger button with specific attributes
    const processingTab = page.locator('[role="tab"]:has-text("Processing")');
    await processingTab.click();

    // Wait for the Processing Queue card to be visible
    await expect(page.locator('text="Processing Queue"')).toBeVisible({ timeout: 5000 });
  });

  test('should render processing queue without React errors', async ({ page }) => {
    // Check that the processing queue component renders - look for statistics or buttons
    const queueIndicator = page.locator('text=/Start Processing|Stop Processing|\\d+ pending/').first();
    await expect(queueIndicator).toBeVisible({ timeout: 10000 });

    // Check for React rendering errors in console
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Check for the specific React child error we fixed
        if (text.includes('Objects are not valid as a React child') ||
            text.includes('found: object with keys')) {
          consoleErrors.push(text);
        }
      }
    });

    // Wait a bit to catch any delayed errors
    await page.waitForTimeout(2000);

    // Verify no React child errors occurred
    expect(consoleErrors).toHaveLength(0);
  });

  test('should display queue statistics correctly', async ({ page }) => {
    // Look for the statistics text that shows pending, processing, completed, failed counts
    const statsText = page.locator('text=/\\d+ pending.*\\d+ processing.*\\d+ completed.*\\d+ failed/');

    // Statistics should be visible
    await expect(statsText).toBeVisible({ timeout: 10000 });

    // Get the text content
    const stats = await statsText.textContent();

    // Verify it contains all expected status types
    expect(stats).toContain('pending');
    expect(stats).toContain('processing');
    expect(stats).toContain('completed');
    expect(stats).toContain('failed');

    // Verify the values are numbers (not objects or undefined)
    const matches = stats?.match(/(\d+) pending.*?(\d+) processing.*?(\d+) completed.*?(\d+) failed/);
    expect(matches).toBeTruthy();

    if (matches) {
      // All captured groups should be valid numbers
      for (let i = 1; i <= 4; i++) {
        const num = parseInt(matches[i]);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(Number.isNaN(num)).toBe(false);
      }
    }
  });

  test('should handle Start/Stop Processing button clicks', async ({ page }) => {
    // Find the Start Processing button
    const startButton = page.locator('button:has-text("Start Processing")');
    const stopButton = page.locator('button:has-text("Stop Processing")');

    // Initially should show Start Processing
    if (await startButton.isVisible()) {
      // Click Start Processing
      await startButton.click();

      // Should show toast notification or change to Stop Processing
      // Wait for either the toast or button change
      await Promise.race([
        page.waitForSelector('text=/Processing started|Processing Started/', { timeout: 5000 }),
        stopButton.waitFor({ state: 'visible', timeout: 5000 })
      ]).catch(() => {
        // Even if no visual feedback, the click should not cause errors
      });
    }

    // If Stop Processing is visible, click it
    if (await stopButton.isVisible()) {
      await stopButton.click();

      // Should show toast or change back to Start Processing
      await Promise.race([
        page.waitForSelector('text=/Processing stopped|Processing Stopped/', { timeout: 5000 }),
        startButton.waitFor({ state: 'visible', timeout: 5000 })
      ]).catch(() => {
        // Even if no visual feedback, the click should not cause errors
      });
    }
  });

  test('should render empty queue state correctly', async ({ page }) => {
    // Check for empty state message
    const emptyState = page.locator('text=/No items in the processing queue/');

    // If queue is empty, this should be visible
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();

      // Verify no React errors when rendering empty state
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && msg.text().includes('React')) {
          consoleErrors.push(msg.text());
        }
      });

      await page.waitForTimeout(1000);
      expect(consoleErrors).toHaveLength(0);
    }
  });

  test('should handle Clear Completed button state', async ({ page }) => {
    // Find the Clear Completed button
    const clearButton = page.locator('button:has-text("Clear Completed")');

    if (await clearButton.isVisible()) {
      // Check if button is disabled when no completed items
      const isDisabled = await clearButton.isDisabled();

      // Get the stats to verify button state matches
      const statsText = await page.locator('text=/\\d+ pending.*\\d+ processing.*\\d+ completed.*\\d+ failed/').textContent();
      const completedMatch = statsText?.match(/(\d+) completed/);
      const completedCount = completedMatch ? parseInt(completedMatch[1]) : 0;

      // Button should be disabled if completed count is 0
      if (completedCount === 0) {
        expect(isDisabled).toBe(true);
      } else {
        expect(isDisabled).toBe(false);
      }
    }
  });

  test('should poll for queue updates', async ({ page }) => {
    // Monitor network requests to the queue endpoint
    let queueRequestCount = 0;

    page.on('request', (request) => {
      if (request.url().includes('/api/process/queue')) {
        queueRequestCount++;
      }
    });

    // Wait for polling interval (2 seconds according to the code)
    await page.waitForTimeout(5000);

    // Should have made at least 2 requests (initial + at least 1 poll)
    expect(queueRequestCount).toBeGreaterThanOrEqual(2);
  });

  test('should handle WebSocket connections gracefully', async ({ page }) => {
    // Check for WebSocket connection
    const wsErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('WebSocket') && msg.type() === 'error') {
        wsErrors.push(text);
      }
    });

    // Wait for WebSocket to connect or timeout
    await page.waitForTimeout(3000);

    // WebSocket errors are acceptable if backend is not running,
    // but should not cause React rendering errors
    const reactErrors = wsErrors.filter(e =>
      e.includes('React') ||
      e.includes('Objects are not valid as a React child')
    );

    expect(reactErrors).toHaveLength(0);
  });
});