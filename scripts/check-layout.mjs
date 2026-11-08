import { chromium, devices } from '@playwright/test';

const base = process.argv[2] ?? 'http://127.0.0.1:5184/';

const run = async () => {
  const browser = await chromium.launch();
  for (const [label, device] of [
    ['iphone13', devices['iPhone 13']],
    ['pixel5', devices['Pixel 5']],
    ['iphoneSE', devices['iPhone SE']],
  ]) {
    const ctx = await browser.newContext({ ...device });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.waitForSelector('[data-testid="galaxy-canvas"]', { timeout: 30000 });
    await page.waitForTimeout(1200);
    const info = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflowing = [...document.querySelectorAll('*')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
        })
        .slice(0, 10)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${el.tagName}.${(el.className || '').toString().slice(0, 60)} left=${Math.round(r.left)} right=${Math.round(r.right)} w=${Math.round(r.width)}`;
        });
      const header = document.querySelector('header > div');
      const hr = header?.getBoundingClientRect();
      return {
        viewport: [window.innerWidth, window.innerHeight],
        scrollWidth: doc.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        headerWidth: hr ? Math.round(hr.width) : null,
        headerRight: hr ? Math.round(hr.right) : null,
        overflowing,
      };
    });
    console.log(label, JSON.stringify(info, null, 2));
    await ctx.close();
  }
  await browser.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});