import { test, expect } from '@playwright/test';

test.describe('Frontend Health Check', () => {
  test('should load the homepage without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for the app to fully load
    await page.waitForLoadState('networkidle');

    // Check that the main app container is present
    await expect(page.locator('body')).toBeVisible();

    // Check for critical React errors
    const criticalReactErrors = consoleErrors.filter(error =>
      error.includes('Objects are not valid as a React child') ||
      error.includes('Cannot read properties of undefined') ||
      error.includes('Cannot read properties of null') ||
      error.includes('Hydration failed') ||
      error.includes('Text content does not match')
    );

    // No critical React errors should occur
    expect(criticalReactErrors).toHaveLength(0);

    // No page errors should occur
    expect(pageErrors).toHaveLength(0);
  });

  test('should have all main tabs functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Define expected tabs with their exact text
    const tabs = [
      { name: 'URLs', contentText: 'URL Management' },
      { name: 'Tags', contentText: 'Tag Management' },
      { name: 'Processing', contentText: 'Processing Queue' },
      { name: 'Configuration', contentText: 'Scraper & Cleaner Configuration' },
      { name: 'Import/Export', contentText: 'Import & Export' }
    ];

    for (const tabInfo of tabs) {
      // Find and click the tab using role=tab selector
      const tab = page.locator(`[role="tab"]:has-text("${tabInfo.name}")`);
      await expect(tab).toBeVisible();

      await tab.click();

      // Wait for content to load and verify the tab panel shows
      await expect(page.locator(`text="${tabInfo.contentText}"`)).toBeVisible({ timeout: 5000 });

      // Verify no React errors after clicking tab
      const errorOccurred = await page.evaluate(() => {
        const errorElement = document.querySelector('[data-nextjs-error]');
        return errorElement !== null;
      });

      expect(errorOccurred).toBe(false);
    }
  });

  test('should handle data fetching gracefully', async ({ page }) => {
    let apiErrors = 0;

    // Monitor API responses
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        if (response.status() >= 500) {
          apiErrors++;
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for initial data fetching
    await page.waitForTimeout(3000);

    // No 500 errors should occur
    expect(apiErrors).toBe(0);
  });

  test('should render URL table without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on URLs tab - it's already active by default but let's ensure
    const urlsTab = page.locator('[role="tab"]:has-text("URLs")');
    await urlsTab.click();

    // Wait for URL Management content
    await expect(page.locator('text="URL Management"')).toBeVisible({ timeout: 10000 });

    // Check for table or empty state
    const tableOrEmpty = page.locator('table, text=/No URLs found/, text=/No results/');
    await expect(tableOrEmpty.first()).toBeVisible({ timeout: 10000 });

    // Check for React rendering errors specific to tables
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('React')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);
    expect(consoleErrors).toHaveLength(0);
  });

  test('should render tag manager without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Tags tab using role=tab selector
    const tagsTab = page.locator('[role="tab"]:has-text("Tags")');
    await tagsTab.click();

    // Wait for Tag Management content
    await expect(page.locator('text="Tag Management"')).toBeVisible({ timeout: 10000 });

    // Check for tag tree or empty state
    const tagContent = page.locator('[class*="tag"], text=/No tags/, text=/Create your first tag/');
    await expect(tagContent.first()).toBeVisible({ timeout: 10000 });

    // Verify no Select.Item empty value errors (from KB: SELECT001)
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Select.Item') || text.includes('empty value')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.waitForTimeout(1000);
    expect(consoleErrors).toHaveLength(0);
  });

  test('should handle dialogs and modals properly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to open Add URL dialog if button exists
    const addUrlButton = page.locator('button:has-text("Add URL"), button:has-text("Add URLs")').first();
    if (await addUrlButton.isVisible()) {
      await addUrlButton.click();

      // Dialog should open without errors
      const dialog = page.locator('[role="dialog"], [class*="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Close dialog with ESC or close button
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Dialog should close
      await expect(dialog).not.toBeVisible();
    }
  });

  test('should handle toasts and notifications', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Monitor for toast notifications
    const toasts = page.locator('[class*="toast"]');

    // If any toasts appear, they should render correctly
    if (await toasts.first().isVisible({ timeout: 3000 })) {
      // Toast should contain valid text, not [object Object]
      const toastText = await toasts.first().textContent();
      expect(toastText).not.toContain('[object Object]');
      expect(toastText).not.toContain('undefined');
      expect(toastText).not.toContain('null');
    }
  });

  test('should maintain responsive layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 },   // Mobile
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);

      // Check that main content is still visible
      const mainContent = page.locator('main, [role="main"], #__next');
      await expect(mainContent.first()).toBeVisible();

      // No horizontal scroll should appear (responsive)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Allow horizontal scroll on mobile but not on desktop/tablet
      if (viewport.width >= 768) {
        expect(hasHorizontalScroll).toBe(false);
      }
    }
  });
});