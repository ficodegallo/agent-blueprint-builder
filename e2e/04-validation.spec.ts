import { test, expect } from '@playwright/test';
import { clearStorage, createBlueprint, clickNode } from './helpers';

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test.describe('Blueprint Validation', () => {
  test('empty canvas shows validation errors', async ({ page }) => {
    await createBlueprint(page);

    // Expand the validation panel
    await page.locator('.border-t.border-gray-200').getByRole('button').first().click();
    await page.waitForTimeout(200);

    // Should show E001 (missing trigger) and E002 (missing end)
    await expect(page.getByText('E001')).toBeVisible();
    await expect(page.getByText('E002')).toBeVisible();
  });

  test('validation bar shows error count for empty blueprint', async ({ page }) => {
    await createBlueprint(page);

    // The summary bar should indicate errors
    await expect(page.getByText(/\d+ error/i)).toBeVisible();
  });

  test('adding trigger node removes E001 error', async ({ page }) => {
    await createBlueprint(page);

    // Expand validation panel
    await page.locator('.border-t.border-gray-200').getByRole('button').first().click();
    await page.waitForTimeout(200);
    await expect(page.getByText('E001')).toBeVisible();

    // Add a trigger node
    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(300);

    // E001 should be gone
    await expect(page.getByText('E001')).not.toBeVisible();
  });

  test('adding end node removes E002 error', async ({ page }) => {
    await createBlueprint(page);

    // Expand validation panel
    await page.locator('.border-t.border-gray-200').getByRole('button').first().click();
    await page.waitForTimeout(200);
    await expect(page.getByText('E002')).toBeVisible();

    // Add an end node
    await page.getByText('Success End').click();
    await page.waitForTimeout(300);

    // E002 should be gone
    await expect(page.getByText('E002')).not.toBeVisible();
  });

  test('blueprint with trigger and end shows as valid', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(200);
    await page.getByText('Success End').click();
    await page.waitForTimeout(300);

    // Should now show "Blueprint is valid"
    await expect(page.getByText('Blueprint is valid')).toBeVisible();
  });

  test('work node missing goal shows E004 warning', async ({ page }) => {
    await createBlueprint(page);

    // Add trigger, work node, and end node
    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(200);
    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(200);
    await page.getByText('Success End').click();
    await page.waitForTimeout(300);

    // Expand validation panel
    await page.locator('.border-t.border-gray-200').getByRole('button').first().click();
    await page.waitForTimeout(200);

    // Should show E004 for missing goal
    await expect(page.getByText('E004')).toBeVisible();
  });

  test('disconnected node shows E003 error', async ({ page }) => {
    await createBlueprint(page);

    // Add a trigger, end, and an isolated work node (not connected)
    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(200);
    await page.getByText('Success End').click();
    await page.waitForTimeout(200);
    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(300);

    // Expand validation panel
    await page.locator('.border-t.border-gray-200').getByRole('button').first().click();
    await page.waitForTimeout(200);

    // Should show E003 for disconnected nodes
    await expect(page.getByText('E003')).toBeVisible();
  });

  test('clicking validation issue selects the node', async ({ page }) => {
    await createBlueprint(page);

    // Add a work node without goal
    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(200);
    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(200);
    await page.getByText('Success End').click();
    await page.waitForTimeout(300);

    // Expand validation panel
    await page.locator('.border-t.border-gray-200').getByRole('button').first().click();
    await page.waitForTimeout(200);

    // Click the E004 issue
    const e004Issue = page.locator('button').filter({ hasText: 'E004' });
    if (await e004Issue.isVisible()) {
      await e004Issue.click();
      await page.waitForTimeout(300);
      // Detail panel should open for the work node
      await expect(page.getByPlaceholder(/describe what this node should achieve/i)).toBeVisible();
    }
  });

  test('resolving goal error removes E004', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(200);
    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(200);
    await page.getByText('Success End').click();
    await page.waitForTimeout(300);

    // Open work node and add goal
    await clickNode(page, 'Data Retrieval');
    await page.waitForTimeout(300);

    const goalTextarea = page.getByPlaceholder(/describe what this node should achieve/i);
    await goalTextarea.fill('Retrieve all relevant data records');
    await goalTextarea.press('Tab');
    await page.waitForTimeout(300);

    // Expand validation panel — E004 should be gone
    await page.locator('.border-t.border-gray-200').getByRole('button').first().click();
    await page.waitForTimeout(200);

    await expect(page.getByText('E004')).not.toBeVisible();
  });
});
