import { test, expect } from '@playwright/test';
import { clearStorage, createBlueprint, clickNode } from './helpers';

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test.describe('Node Editing — Work Nodes', () => {
  test('can edit work node name', async ({ page }) => {
    await createBlueprint(page);

    // Add a work node (AI Agent)
    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Data Retrieval');
    await page.waitForTimeout(300);

    // Edit the name
    const nameInput = page.getByLabel(/name/i).first();
    await nameInput.fill('My Custom Agent');
    await nameInput.press('Tab');
    await page.waitForTimeout(300);

    // Node on canvas should update
    await expect(page.locator('.react-flow__node').filter({ hasText: 'My Custom Agent' })).toBeVisible();
  });

  test('can edit work node goal', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Data Retrieval');
    await page.waitForTimeout(300);

    const goalTextarea = page.getByPlaceholder(/describe what this node should achieve/i);
    await goalTextarea.fill('Retrieve customer records from the CRM');
    await goalTextarea.press('Tab');
    await page.waitForTimeout(200);

    // Verify goal was saved (field still has value)
    await expect(goalTextarea).toHaveValue('Retrieve customer records from the CRM');
  });

  test('can add an input to a work node', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Data Retrieval');
    await page.waitForTimeout(300);

    // Add an input
    const inputPlaceholder = page.getByPlaceholder('Add input...');
    await inputPlaceholder.fill('Customer ID');
    await inputPlaceholder.press('Enter');
    await page.waitForTimeout(200);

    await expect(page.getByText('Customer ID')).toBeVisible();
  });

  test('can add an output to a work node', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Data Retrieval');
    await page.waitForTimeout(300);

    // Add an output
    const outputPlaceholder = page.getByPlaceholder('Add output...');
    await outputPlaceholder.fill('Customer Record');
    await outputPlaceholder.press('Enter');
    await page.waitForTimeout(200);

    await expect(page.getByText('Customer Record')).toBeVisible();
  });

  test('can add a task to a work node', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Data Retrieval');
    await page.waitForTimeout(300);

    // Add a task
    const taskPlaceholder = page.getByPlaceholder('Add task...');
    await taskPlaceholder.fill('Query the database');
    await taskPlaceholder.press('Enter');
    await page.waitForTimeout(200);

    await expect(page.getByText('Query the database')).toBeVisible();
  });

  test('Inherit Outputs button appears when inputs exist', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Data Retrieval');
    await page.waitForTimeout(300);

    // Add an input first
    const inputPlaceholder = page.getByPlaceholder('Add input...');
    await inputPlaceholder.fill('Request ID');
    await inputPlaceholder.press('Enter');
    await page.waitForTimeout(200);

    // Inherit Outputs button should now be visible
    await expect(page.getByTitle(/inherit inputs from this node as outputs/i)).toBeVisible();
  });

  test('Inherit Outputs copies inputs to outputs', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Data Retrieval');
    await page.waitForTimeout(300);

    // Add an input
    const inputPlaceholder = page.getByPlaceholder('Add input...');
    await inputPlaceholder.fill('Order ID');
    await inputPlaceholder.press('Enter');
    await page.waitForTimeout(200);

    // Click Inherit Outputs
    await page.getByTitle(/inherit inputs from this node as outputs/i).click();
    await page.waitForTimeout(200);

    // Order ID should now appear in the outputs section too
    // There should be 2 occurrences of "Order ID" (once in inputs, once in outputs)
    const orderIdElements = page.getByText('Order ID');
    await expect(orderIdElements).toHaveCount(2);
  });

  test('Inherit Outputs does not duplicate existing outputs', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Data Retrieval Agent').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Data Retrieval');
    await page.waitForTimeout(300);

    // Add an input
    const inputPlaceholder = page.getByPlaceholder('Add input...');
    await inputPlaceholder.fill('Request Data');
    await inputPlaceholder.press('Enter');
    await page.waitForTimeout(200);

    // Click Inherit Outputs twice
    await page.getByTitle(/inherit inputs from this node as outputs/i).click();
    await page.waitForTimeout(200);
    await page.getByTitle(/inherit inputs from this node as outputs/i).click();
    await page.waitForTimeout(200);

    // Should still only have 2 occurrences (input + output, no duplicate)
    const elements = page.getByText('Request Data');
    await expect(elements).toHaveCount(2);
  });
});

test.describe('Node Editing — Trigger Nodes', () => {
  test('trigger node shows description field', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Event-Based Trigger').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Event Trigger');
    await page.waitForTimeout(300);

    await expect(page.getByLabel(/description/i).first()).toBeVisible();
  });

  test('can edit trigger node name', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Manual Trigger').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Manual Trigger');
    await page.waitForTimeout(300);

    const nameInput = page.getByLabel(/name/i).first();
    await nameInput.fill('Start Process');
    await nameInput.press('Tab');
    await page.waitForTimeout(300);

    await expect(page.locator('.react-flow__node').filter({ hasText: 'Start Process' })).toBeVisible();
  });
});

test.describe('Node Editing — Decision Nodes', () => {
  test('decision node shows branches', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Decision Point').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Decision');
    await page.waitForTimeout(300);

    // Should show branch labels (default Yes/No or similar)
    await expect(page.getByText(/branch|yes|no|approved|rejected/i).first()).toBeVisible();
  });

  test('can add a branch to decision node', async ({ page }) => {
    await createBlueprint(page);

    await page.getByText('Decision Point').click();
    await page.waitForTimeout(300);

    await clickNode(page, 'Decision');
    await page.waitForTimeout(300);

    const addBranchBtn = page.getByRole('button', { name: /add branch/i });
    await addBranchBtn.click();
    await page.waitForTimeout(200);

    // Should now have 3 branch inputs (default 2 + 1 added)
    const branchInputs = page.getByPlaceholder(/branch label/i);
    await expect(branchInputs).toHaveCount(3);
  });
});
