import { expect, test, type Page } from '@playwright/test';

const START = Date.now();

async function openApp(page: Page) {
  // Unique storage per test run keeps IndexedDB state isolated and reproducible.
  await page.goto(`/?e2e=${START}`);
  await expect(page.getByTestId('galaxy-canvas')).toBeVisible({ timeout: 30_000 });
}

test.describe('Thought Galaxy core flows', () => {
  test('boots with a demo galaxy and renders the canvas', async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId('galaxy-hud')).toBeVisible();
    await expect(page.getByTestId('x-author-link')).toHaveAttribute('href', 'https://x.com/0xkillcoin');
    await expect(page.getByTestId('new-node')).toBeVisible();
  });

  test('creates a node, persists it after reload, and opens the detail panel', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('new-node').click();
    await expect(page.getByTestId('node-editor')).toBeVisible();

    const title = `E2E 星球 ${Date.now()}`;
    await page.getByTestId('node-title').fill(title);
    await page.getByTestId('node-body').fill('# 标题\n\n- 列表项\n\n正文内容');
    await page.getByTestId('node-tags').fill('e2e, 测试');
    await page.getByTestId('save-node').click();

    await expect(page.getByTestId('node-detail')).toBeVisible();
    await expect(page.getByTestId('node-detail')).toContainText(title);

    // Reload proves the data really went to IndexedDB.
    await page.reload();
    await expect(page.getByTestId('galaxy-canvas')).toBeVisible();
    await page.getByTestId('open-search').click();
    await page.getByTestId('search-input').fill(title);
    await expect(page.getByTestId('search-panel')).toContainText(title);
  });

  test('search filters the galaxy and reports hits', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('open-search').click();
    await page.getByTestId('search-input').fill('互联网');
    await expect(page.getByTestId('search-panel')).toContainText('互联网的演进');
  });

  test('daily thought panel accepts a new entry', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('open-daily').click();
    await expect(page.getByTestId('daily-panel')).toBeVisible();
    const text = `今天的一个念头 ${Date.now()}`;
    await page.getByTestId('daily-input').fill(text);
    await page.getByRole('button', { name: '记录今天的灵感' }).click();
    await expect(page.getByTestId('daily-panel')).toContainText(text);
  });

  test('clears the demo galaxy without touching user data', async ({ page }) => {
    await openApp(page);

    // Create a real node first.
    await page.getByTestId('new-node').click();
    const title = `我的真实笔记 ${Date.now()}`;
    await page.getByTestId('node-title').fill(title);
    await page.getByTestId('save-node').click();
    await page.getByTestId('sheet-close').click();

    await page.getByTestId('open-data').click();
    await page.getByTestId('clear-demo').click();
    await page.getByTestId('sheet-close').click();

    await page.getByTestId('open-search').click();
    await page.getByTestId('search-input').fill(title);
    await expect(page.getByTestId('search-panel')).toContainText(title);
    await page.getByTestId('search-input').fill('通用人工智能');
    await expect(page.getByTestId('search-panel')).toContainText('没有匹配的星球');
  });

  test('keyboard shortcuts do not fire while typing in an input', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('new-node').click();
    const titleInput = page.getByTestId('node-title');
    await titleInput.click();
    await titleInput.type('nnnn ddd');
    await expect(page.getByTestId('node-editor')).toBeVisible();
    await expect(titleInput).toHaveValue('nnnn ddd');
  });

  test('exports a JSON backup', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('open-data').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /完整 JSON/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/thought-galaxy-\d{8}\.json/);
  });
});