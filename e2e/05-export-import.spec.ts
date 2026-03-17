import { test, expect } from '@playwright/test';
import { clearStorage, createBlueprint, clickNode } from './helpers';
import * as path from 'path';
import * as os from 'os';

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

/** Build a minimal valid blueprint (trigger + end node) */
async function buildMinimalBlueprint(page: import('@playwright/test').Page) {
  await createBlueprint(page, 'Export Test Blueprint');
  await page.getByText('Event-Based Trigger').click();
  await page.waitForTimeout(200);
  await page.getByText('Success End').click();
  await page.waitForTimeout(300);
}

test.describe('Export', () => {
  test('Export dialog opens from header button', async ({ page }) => {
    await buildMinimalBlueprint(page);

    await page.getByRole('button', { name: /export/i }).click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Export Blueprint')).toBeVisible();
    await expect(page.getByText('JSON Format')).toBeVisible();
  });

  test('can close export dialog', async ({ page }) => {
    await buildMinimalBlueprint(page);

    await page.getByRole('button', { name: /export/i }).click();
    await page.waitForTimeout(200);

    // Close via clicking outside or X button
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await expect(page.getByText('JSON Format')).not.toBeVisible();
  });

  test('JSON export downloads a .blueprint.json file', async ({ page }) => {
    await buildMinimalBlueprint(page);

    await page.getByRole('button', { name: /export/i }).click();
    await page.waitForTimeout(200);

    // Wait for download when clicking JSON export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('JSON Format').click(),
    ]);

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.blueprint\.json$/);
  });

  test('exported JSON contains blueprint data', async ({ page }) => {
    await buildMinimalBlueprint(page);

    await page.getByRole('button', { name: /export/i }).click();
    await page.waitForTimeout(200);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('JSON Format').click(),
    ]);

    // Save and read the file
    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);

    const { readFileSync } = await import('fs');
    const content = JSON.parse(readFileSync(tmpPath, 'utf-8'));

    // Should have nodes array
    expect(Array.isArray(content.nodes)).toBe(true);
    expect(content.nodes.length).toBeGreaterThan(0);

    // Should have edges array
    expect(Array.isArray(content.edges)).toBe(true);

    // Should have blueprint metadata
    expect(content.title).toBeDefined();
  });
});

test.describe('Import', () => {
  test('Import dialog opens from header button', async ({ page }) => {
    await buildMinimalBlueprint(page);

    await page.getByRole('button', { name: /import/i }).click();
    await page.waitForTimeout(200);

    // Import dialog should appear
    await expect(
      page.getByText(/import blueprint|drop.*json|upload/i).first()
    ).toBeVisible();
  });

  test('JSON export then import preserves blueprint', async ({ page }) => {
    // Build a blueprint with specific content
    await createBlueprint(page, 'Roundtrip Test');
    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(200);

    // Give the trigger a custom name
    await clickNode(page, 'Event Trigger');
    await page.waitForTimeout(300);
    const nameInput = page.getByLabel(/name/i).first();
    await nameInput.fill('My Start Event');
    await nameInput.press('Tab');
    await page.waitForTimeout(300);

    await page.getByText('Success End').click();
    await page.waitForTimeout(200);

    // Export to JSON
    await page.getByRole('button', { name: /export/i }).click();
    await page.waitForTimeout(200);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('JSON Format').click(),
    ]);

    const tmpPath = path.join(os.tmpdir(), `roundtrip-${Date.now()}.blueprint.json`);
    await download.saveAs(tmpPath);

    // Clear and create a fresh blueprint
    await clearStorage(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'New Blueprint' }).click();
    await page.waitForURL(/\/blueprint\/.+/);

    // Import the saved file
    await page.getByRole('button', { name: /import/i }).click();
    await page.waitForTimeout(200);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tmpPath);
    await page.waitForTimeout(500);

    // Confirm import if there's a button
    const importBtn = page.getByRole('button', { name: /^import$/i });
    if (await importBtn.isVisible()) {
      await importBtn.click();
      await page.waitForTimeout(500);
    }

    // The custom node name should be present
    await expect(page.locator('.react-flow__node').filter({ hasText: 'My Start Event' })).toBeVisible();
  });
});
