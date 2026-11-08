import { expect, test, type Page } from '@playwright/test';

async function openApp(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('galaxy-canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
}

/** Reads the persisted viewport zoom from the HUD label. */
async function hudZoom(page: Page): Promise<number> {
  const text = (await page.getByTestId('galaxy-hud').innerText()).match(/(\d+)%/);
  return text ? Number(text[1]) : 0;
}

test.describe('canvas interaction', () => {
  test('zooms the galaxy and fit-all restores framing', async ({ page }, testInfo) => {
    await openApp(page);
    const before = await hudZoom(page);

    if (testInfo.project.name === 'iphone') {
      // Mobile WebKit cannot deliver mouse wheel events, so exercise the same
      // zoom code path through the HUD control instead.
      await page.getByTestId('galaxy-hud').getByLabel('放大').click();
    } else {
      const box = await page.getByTestId('galaxy-canvas').boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.wheel(0, -600);
    }

    await page.waitForTimeout(400);
    const zoomed = await hudZoom(page);
    expect(zoomed).toBeGreaterThan(before);

    await page.getByTestId('fit-all').click();
    await page.waitForTimeout(400);
    const fitted = await hudZoom(page);
    expect(fitted).toBeGreaterThan(0);
  });

  test('creates then deletes a relation between two planets', async ({ page }) => {
    await openApp(page);

    // Create two isolated planets so the candidate dropdown is predictable.
    for (const title of ['关联源星球', '关联目标星球']) {
      await page.getByTestId('new-node').click();
      await page.getByTestId('node-title').fill(title);
      await page.getByTestId('save-node').click();
      await page.getByTestId('sheet-close').click();
    }

    await page.getByTestId('open-search').click();
    await page.getByTestId('search-input').fill('关联源星球');
    await page.getByTestId('search-panel').getByText('关联源星球').first().click();
    await expect(page.getByTestId('node-detail')).toBeVisible();

    const detail = page.getByTestId('node-detail');
    await detail.locator('select').selectOption({ label: '关联目标星球' });
    await detail.getByRole('button', { name: '添加' }).click();
    await expect(detail).toContainText('关联目标星球');

    // Remove it again.
    const row = detail.locator('li').filter({ hasText: '关联目标星球' }).first();
    await row.hover();
    await row.getByRole('button', { name: '删除关联' }).click();
    await expect(detail).not.toContainText('1 条关联');
  });

  test('tag filtering narrows the visible galaxy', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('open-search').click();
    await page.getByRole('button', { name: /筛选/ }).click();
    await page.getByTestId('search-panel').getByText('AI', { exact: false }).first().click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('search-panel')).toContainText('颗星球');
  });

  test('imports a JSON file without losing existing data', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('new-node').click();
    const mine = `我的星球 ${Date.now()}`;
    await page.getByTestId('node-title').fill(mine);
    await page.getByTestId('save-node').click();
    await page.getByTestId('sheet-close').click();

    const payload = {
      app: 'thought-galaxy',
      version: 2,
      exportedAt: new Date().toISOString(),
      nodes: [
        { id: 'import-1', title: '导入的星球 A', body: '来自 JSON', tags: ['导入'] },
        { id: 'import-2', title: '导入的星球 B', body: '第二条', tags: ['导入'] },
      ],
      edges: [{ id: 'ie1', source: 'import-1', target: 'import-2', relation: 'related' }],
      thoughts: [],
    };

    await page.getByTestId('open-data').click();
    await page.getByTestId('import-input').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    });
    await expect(page.getByTestId('data-panel')).toContainText('解析结果');
    await page.getByRole('button', { name: '确认导入' }).click();
    await page.waitForTimeout(800);

    await page.getByTestId('open-search').click();
    await page.getByTestId('search-input').fill('导入的星球');
    await expect(page.getByTestId('search-panel')).toContainText('导入的星球 A');
    await page.getByTestId('search-input').fill(mine);
    await expect(page.getByTestId('search-panel')).toContainText(mine);
  });

  test('rejects an invalid import file with a visible error', async ({ page }) => {
    await openApp(page);
    await page.getByTestId('open-data').click();
    await page.getByTestId('import-input').setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ this is not json'),
    });
    await expect(page.getByTestId('data-panel')).toContainText('不是有效的 JSON');
  });
});