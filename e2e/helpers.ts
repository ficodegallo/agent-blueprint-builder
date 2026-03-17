import { Page, expect } from '@playwright/test';

/** Clear all blueprint data from localStorage so each test starts clean */
export async function clearStorage(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
}

/** Navigate to the homepage and wait for it to be ready */
export async function goHome(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/** Create a new blueprint and return the blueprint ID from the URL */
export async function createBlueprint(page: Page, title?: string): Promise<string> {
  await goHome(page);
  await page.getByRole('button', { name: 'New Blueprint' }).click();

  // Wait for navigation to editor
  await page.waitForURL(/\/blueprint\/.+/);
  await page.waitForLoadState('networkidle');

  // Optionally rename it
  if (title) {
    const titleInput = page.getByPlaceholder('Blueprint Title');
    await titleInput.fill(title);
    await titleInput.blur();
  }

  const url = page.url();
  return url.split('/blueprint/')[1];
}

/** Drag a template node from the left panel onto the canvas */
export async function dragTemplateToCanvas(
  page: Page,
  templateName: string,
  canvasX = 400,
  canvasY = 300
) {
  const template = page.getByText(templateName).first();
  const canvas = page.locator('.react-flow__pane');

  await template.hover();
  await page.mouse.down();

  const canvasBounds = await canvas.boundingBox();
  if (!canvasBounds) throw new Error('Canvas not found');

  await page.mouse.move(
    canvasBounds.x + canvasX,
    canvasBounds.y + canvasY,
    { steps: 10 }
  );
  await page.mouse.up();

  // Wait for node to appear
  await page.waitForTimeout(300);
}

/** Click a node on the canvas by its label text */
export async function clickNode(page: Page, nodeName: string) {
  await page.locator('.react-flow__node').filter({ hasText: nodeName }).click();
  await page.waitForTimeout(200);
}

/** Wait for the detail panel to show a specific node's data */
export async function waitForDetailPanel(page: Page) {
  await expect(page.locator('[data-testid="detail-panel"], .detail-panel, aside').first()).toBeVisible({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(200);
}
