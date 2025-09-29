import { test, expect, Page } from '@playwright/test';

test.describe('Tag Persistence Tests', () => {
  const BASE_URL = 'http://localhost:3000';
  const API_URL = 'http://localhost:4000/api';

  test('Tags should persist after page refresh', async ({ page }) => {
    // Navigate to the URLs page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find the first URL with tags
    const firstUrlWithTags = page.locator('tr').filter({
      hasText: 'https://playwright-test-tags.example.com/verification'
    });

    // Get the tags before refresh
    const tagsBeforeRefresh = await firstUrlWithTags
      .locator('td')
      .nth(3) // Tags column
      .locator('.badge, [class*="tag"], div > div')
      .allTextContents();

    console.log('Tags before refresh:', tagsBeforeRefresh);

    // Ensure we found tags
    expect(tagsBeforeRefresh.length).toBeGreaterThan(0);
    expect(tagsBeforeRefresh).toContain('tag_imre');
    expect(tagsBeforeRefresh).toContain('export');
    expect(tagsBeforeRefresh).toContain('tag-test');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find the same URL again
    const urlAfterRefresh = page.locator('tr').filter({
      hasText: 'https://playwright-test-tags.example.com/verification'
    });

    // Get the tags after refresh
    const tagsAfterRefresh = await urlAfterRefresh
      .locator('td')
      .nth(3) // Tags column
      .locator('.badge, [class*="tag"], div > div')
      .allTextContents();

    console.log('Tags after refresh:', tagsAfterRefresh);

    // Verify tags persisted
    expect(tagsAfterRefresh.length).toBe(tagsBeforeRefresh.length);
    expect(tagsAfterRefresh).toContain('tag_imre');
    expect(tagsAfterRefresh).toContain('export');
    expect(tagsAfterRefresh).toContain('tag-test');
  });

  test('API should return tags in URL list', async ({ request }) => {
    // Fetch URLs from API
    const response = await request.get(`${API_URL}/urls`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();

    // Find our test URL
    const testUrl = data.data.find((url: any) =>
      url.url === 'https://playwright-test-tags.example.com/verification'
    );

    expect(testUrl).toBeDefined();
    expect(testUrl.tags).toBeDefined();
    expect(Array.isArray(testUrl.tags)).toBe(true);
    expect(testUrl.tags).toContain('tag_imre');
    expect(testUrl.tags).toContain('export');
    expect(testUrl.tags).toContain('tag-test');
  });

  test('Tags should be editable and persist', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find a URL without tags
    const urlRow = page.locator('tr').filter({
      hasText: 'https://example.com/new-test-url'
    });

    // Click the menu button
    await urlRow.locator('button:has-text("Open menu")').click();

    // Click Edit option
    await page.locator('text=Edit').click();

    // Wait for edit dialog
    await page.waitForSelector('[role="dialog"]');

    // Add a new tag
    const newTagInput = page.locator('input[placeholder*="create new tag"]');
    await newTagInput.fill('test-persistence-tag');
    await page.locator('button:has-text("Create")').click();

    // Save changes
    await page.locator('button:has-text("Save Changes")').click();

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Verify tag appears
    await expect(urlRow.locator('text=test-persistence-tag')).toBeVisible();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find the URL again and verify tag persisted
    const urlRowAfterRefresh = page.locator('tr').filter({
      hasText: 'https://example.com/new-test-url'
    });

    await expect(urlRowAfterRefresh.locator('text=test-persistence-tag')).toBeVisible();
  });

  test('Batch tag operations should persist', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Select multiple URLs
    await page.locator('input[type="checkbox"]').nth(1).check();
    await page.locator('input[type="checkbox"]').nth(2).check();

    // Batch operations should be visible
    await expect(page.locator('text=Batch Operations')).toBeVisible();

    // Add tags in batch
    const batchTagInput = page.locator('input[placeholder*="Add tags"]');
    if (await batchTagInput.isVisible()) {
      await batchTagInput.fill('batch-test-tag');
      await page.locator('button:has-text("Add Tags")').click();

      // Wait for operation to complete
      await page.waitForTimeout(2000);

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify tags persisted on both URLs
      const firstUrl = page.locator('tr').nth(1);
      const secondUrl = page.locator('tr').nth(2);

      await expect(firstUrl.locator('text=batch-test-tag')).toBeVisible();
      await expect(secondUrl.locator('text=batch-test-tag')).toBeVisible();
    }
  });
});

// Run with: npx playwright test tests/tag-persistence.test.ts