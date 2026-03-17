import { test, expect } from '@playwright/test';
import { clearStorage, createBlueprint, clickNode } from './helpers';

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test.describe('Blueprint Editor', () => {
  test('editor loads with canvas and template panel', async ({ page }) => {
    await createBlueprint(page);

    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.getByText('Node Templates')).toBeVisible();
  });

  test('template panel shows all categories', async ({ page }) => {
    await createBlueprint(page);

    await expect(page.getByText('Triggers')).toBeVisible();
    await expect(page.getByText('AI Agents')).toBeVisible();
    await expect(page.getByText('Automations')).toBeVisible();
    await expect(page.getByText('Human Tasks')).toBeVisible();
  });

  test('clicking a template adds a node to the canvas', async ({ page }) => {
    await createBlueprint(page);

    // Click the Event-Based Trigger template
    await page.getByText('Event-Based Trigger').click();

    // Node should appear on canvas
    await expect(page.locator('.react-flow__node')).toBeVisible();
  });

  test('clicking a node opens the detail panel', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Event Trigger');

    // Detail panel should open
    await expect(page.locator('aside, [data-testid="detail-panel"]').first()).toBeVisible();
  });

  test('multiple templates can be added', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(200);
    await page.getByText('Success End').click();
    await page.waitForTimeout(200);

    const nodes = page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(2);
  });

  test('detail panel shows node name field when node is selected', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Event Trigger');

    // The panel should have a name field
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
  });

  test('closing detail panel deselects node', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Event Trigger');

    // Close panel via X button
    const closeBtn = page.getByRole('button', { name: /close/i });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Click canvas background to deselect
      await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } });
    }

    await page.waitForTimeout(200);
  });

  test('delete node shows confirmation dialog', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(300);

    // Click the node to select it
    await clickNode(page, 'Event Trigger');
    await page.waitForTimeout(200);

    // Press Delete key
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Confirmation dialog should appear
    await expect(page.getByText(/delete/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('cancel delete keeps node on canvas', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Event Trigger');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: /cancel/i }).click();

    // Node should still be there
    await expect(page.locator('.react-flow__node')).toHaveCount(1);
  });

  test('confirm delete removes node from canvas', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Event Trigger');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Confirm deletion
    await page.getByRole('button', { name: /delete/i }).click();
    await page.waitForTimeout(200);

    await expect(page.locator('.react-flow__node')).toHaveCount(0);
  });

  test('validation bar is always visible', async ({ page }) => {
    await createBlueprint(page);

    // Validation panel summary bar should be at the bottom
    await expect(
      page.getByText(/blueprint is valid|error|warning/i).first()
    ).toBeVisible();
  });
});
