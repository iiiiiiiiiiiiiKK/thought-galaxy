/**
 * Captures real screenshots of the running app for the README.
 * Usage: node scripts/capture-screenshots.mjs [baseUrl]
 */
import { chromium, devices } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:5184/';
const outDir = resolve(import.meta.dirname, '..', 'docs', 'screenshots');

async function shoot(page, name) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(outDir, name), type: 'png' });
  console.log(`captured ${name}`);
}

const run = async () => {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();

  // ------------------------------------------------ desktop
  const desktop = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await desktop.newPage();
  await page.goto(base);
  await page.waitForSelector('[data-testid="galaxy-canvas"]', { timeout: 30_000 });
  await page.waitForTimeout(1800);
  await shoot(page, '01-galaxy-home.png');

  // Open a planet through search (deterministic target, no coordinate guessing).
  await page.locator('[data-testid="open-search"]').click();
  await page.locator('[data-testid="search-input"]').fill('互联网');
  await page.waitForTimeout(600);
  await page.locator('[data-testid="search-panel"] button').filter({ hasText: '互联网的演进' }).first().click();
  await page.waitForTimeout(800);
  if (await page.locator('[data-testid="node-detail"]').isVisible().catch(() => false)) {
    await shoot(page, '02-node-detail.png');
    await page.locator('[data-testid="sheet-close"]').click();
  } else {
    await page.locator('[data-testid="sheet-close"]').click();
  }
  await page.waitForTimeout(400);

  await page.locator('[data-testid="new-node"]').click();
  await page.waitForSelector('[data-testid="node-editor"]');
  await page.locator('[data-testid="node-title"]').fill('把想法变成星系');
  await page
    .locator('[data-testid="node-body"]')
    .fill('# 为什么是星系\n\n文件夹是线性的，思考是网状的。\n\n- 每条内容是一颗星球\n- 关联形成轨道\n- 主题形成星群\n\n> 让知识在空间中产生联系。');
  await page.locator('[data-testid="node-tags"]').fill('产品, 设计');
  await shoot(page, '03-node-editor.png');
  await page.locator('[data-testid="sheet-close"]').click();

  await page.locator('[data-testid="open-search"]').click();
  await page.locator('[data-testid="search-input"]').fill('AI');
  await shoot(page, '04-search.png');
  await page.locator('[data-testid="sheet-close"]').click();

  await page.locator('[data-testid="open-clusters"]').click();
  await shoot(page, '05-clusters.png');
  await page.locator('[data-testid="sheet-close"]').click();

  await page.locator('[data-testid="open-daily"]').click();
  await shoot(page, '06-daily-thought.png');
  await page.locator('[data-testid="sheet-close"]').click();

  await page.locator('[data-testid="open-data"]').click();
  await shoot(page, '07-data-panel.png');
  await page.locator('[data-testid="sheet-close"]').click();

  await page.locator('[data-testid="open-settings"]').click();
  await shoot(page, '08-settings.png');
  await page.locator('[data-testid="sheet-close"]').click();

  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  await shoot(page, '09-command-palette.png');
  await page.keyboard.press('Escape');

  await desktop.close();

  // ------------------------------------------------- mobile (iPhone)
  const mobile = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 3 });
  const mpage = await mobile.newPage();
  await mpage.goto(base);
  await mpage.waitForSelector('[data-testid="galaxy-canvas"]', { timeout: 30_000 });
  await mpage.waitForTimeout(1800);
  await shoot(mpage, '10-mobile-home.png');

  await mpage.locator('[data-testid="open-search"]').click();
  await mpage.waitForTimeout(600);
  await shoot(mpage, '11-mobile-search-sheet.png');
  await mpage.locator('[data-testid="sheet-close"]').click();

  await mpage.locator('[data-testid="new-node"]').click();
  await mpage.waitForSelector('[data-testid="node-editor"]');
  await mpage.locator('[data-testid="node-title"]').fill('移动端也要好用');
  await mpage.waitForTimeout(500);
  await shoot(mpage, '12-mobile-editor.png');

  await mobile.close();
  await browser.close();
  console.log('done');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});