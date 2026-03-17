import { test, expect } from '@playwright/test';
import { clearStorage, goHome } from './helpers';

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test.describe('Homepage — Blueprint Library', () => {
  test('shows empty state when no blueprints exist', async ({ page }) => {
    await goHome(page);
    await expect(page.getByText('No blueprints yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Blueprint' })).toBeVisible();
  });

  test('creates a new blueprint and navigates to editor', async ({ page }) => {
    await goHome(page);
    await page.getByRole('button', { name: 'New Blueprint' }).click();

    await expect(page).toHaveURL(/\/blueprint\/.+/);
    // Canvas should be present
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('shows blueprint card after creation and navigating back', async ({ page }) => {
    await goHome(page);
    await page.getByRole('button', { name: 'New Blueprint' }).click();
    await page.waitForURL(/\/blueprint\/.+/);

    // Go back to homepage
    await page.getByRole('button', { name: 'Home' }).click();
    await page.waitForURL('/');

    // Should see the blueprint card
    await expect(page.getByText('Untitled Blueprint')).toBeVisible();
  });

  test('search filters blueprints by title', async ({ page }) => {
    // Create two blueprints with different titles
    await goHome(page);
    await page.getByRole('button', { name: 'New Blueprint' }).click();
    await page.waitForURL(/\/blueprint\/.+/);

    // Set title via the blueprint header
    const titleField = page.getByPlaceholder('Blueprint Title');
    await titleField.fill('Alpha Process');
    await titleField.press('Tab');
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Home' }).click();
    await page.waitForURL('/');

    await page.getByRole('button', { name: 'New Blueprint' }).click();
    await page.waitForURL(/\/blueprint\/.+/);
    const titleField2 = page.getByPlaceholder('Blueprint Title');
    await titleField2.fill('Beta Workflow');
    await titleField2.press('Tab');
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Home' }).click();
    await page.waitForURL('/');

    // Both visible initially
    await expect(page.getByText('Alpha Process')).toBeVisible();
    await expect(page.getByText('Beta Workflow')).toBeVisible();

    // Search for "alpha"
    await page.getByPlaceholder(/Search blueprints/).fill('alpha');
    await expect(page.getByText('Alpha Process')).toBeVisible();
    await expect(page.getByText('Beta Workflow')).not.toBeVisible();

    // Clear search
    await page.getByPlaceholder(/Search blueprints/).fill('');
    await expect(page.getByText('Beta Workflow')).toBeVisible();
  });

  test('shows no results state for unmatched search', async ({ page }) => {
    await goHome(page);
    await page.getByRole('button', { name: 'New Blueprint' }).click();
    await page.waitForURL(/\/blueprint\/.+/);
    await page.getByRole('button', { name: 'Home' }).click();
    await page.waitForURL('/');

    await page.getByPlaceholder(/Search blueprints/).fill('xyzzy-nonexistent');
    await expect(page.getByText('No results found')).toBeVisible();
  });

  test('clicking blueprint card opens the editor', async ({ page }) => {
    await goHome(page);
    await page.getByRole('button', { name: 'New Blueprint' }).click();
    await page.waitForURL(/\/blueprint\/.+/);
    const blueprintUrl = page.url();

    await page.getByRole('button', { name: 'Home' }).click();
    await page.waitForURL('/');

    // Click the card
    await page.getByText('Untitled Blueprint').first().click();
    await expect(page).toHaveURL(blueprintUrl);
  });
});
