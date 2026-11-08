import { chromium, devices } from '@playwright/test';

const URL_LIVE = 'https://iiiiiiiiiiiiiKK.github.io/thought-galaxy/';

const run = async () => {
  const browser = await chromium.launch();
  const results = [];
  const errors = [];

  // ---------------------------------------------------------------- desktop
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(URL_LIVE, { waitUntil: 'load' });
  await page.waitForSelector('[data-testid="galaxy-canvas"]', { timeout: 60000 });
  await page.waitForTimeout(2500);
  results.push({ check: 'canvas rendered', ok: await page.getByTestId('galaxy-canvas').isVisible() });
  results.push({
    check: 'X author link',
    ok: (await page.getByTestId('x-author-link').getAttribute('href')) === 'https://x.com/0xkillcoin',
  });

  // Demo galaxy seeded?
  await page.getByTestId('open-search').click();
  await page.waitForTimeout(800);
  const searchText = await page.getByTestId('search-panel').innerText();
  results.push({ check: 'demo galaxy seeded', ok: searchText.includes('颗星球') });

  // Create a real planet and verify it survives a reload.
  const title = `线上验收 ${Date.now()}`;
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('new-node').click();
  await page.getByTestId('node-title').fill(title);
  await page.getByTestId('node-body').fill('# 线上验收\n\n- 创建成功\n- 持久化正常');
  await page.getByTestId('node-tags').fill('验收, e2e');
  await page.getByTestId('save-node').click();
  await page.waitForTimeout(900);
  results.push({ check: 'create planet', ok: await page.getByTestId('node-detail').isVisible() });
  results.push({ check: 'detail shows title', ok: (await page.getByTestId('node-detail').innerText()).includes(title) });

  // Relation creation
  await page.getByTestId('sheet-close').click();
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-testid="galaxy-canvas"]', { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.getByTestId('open-search').click();
  await page.getByTestId('search-input').fill(title);
  await page.waitForTimeout(700);
  const hits = await page.getByTestId('search-panel').innerText();
  results.push({ check: 'persisted after reload', ok: hits.includes(title) });
  await page.getByTestId('search-panel').getByText(title).first().click();
  await page.waitForTimeout(700);
  const detailText = await page.getByTestId('node-detail').innerText();
  results.push({ check: 'tags persisted', ok: detailText.includes('验收') });

  // Export produces a real download.
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('open-data').click();
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await page.getByRole('button', { name: /完整 JSON/ }).click();
  const download = await downloadPromise;
  results.push({
    check: 'export JSON download',
    ok: /thought-galaxy-\d{8}\.json/.test(download.suggestedFilename()),
    detail: download.suggestedFilename(),
  });

  // Mobile viewport sanity on the live build.
  const mctx = await browser.newContext({ ...devices['iPhone 13'] });
  const mpage = await mctx.newPage();
  await mpage.goto(URL_LIVE, { waitUntil: 'load' });
  await mpage.waitForSelector('[data-testid="galaxy-canvas"]', { timeout: 60000 });
  await mpage.waitForTimeout(1800);
  const overflow = await mpage.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  results.push({
    check: 'mobile: no horizontal overflow',
    ok: overflow.scrollWidth <= overflow.innerWidth,
    detail: `${overflow.scrollWidth}<=${overflow.innerWidth}`,
  });
  await mpage.getByTestId('open-search').click();
  await mpage.waitForTimeout(600);
  results.push({ check: 'mobile: search sheet opens', ok: await mpage.getByTestId('search-panel').isVisible() });

  await mctx.close();
  await ctx.close();
  await browser.close();

  console.log(JSON.stringify({ url: URL_LIVE, results, consoleErrors: errors.slice(0, 10) }, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) process.exitCode = 1;
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});