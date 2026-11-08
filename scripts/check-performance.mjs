/**
 * Seeds N synthetic planets directly into IndexedDB and measures frame rate.
 * Usage: node scripts/check-performance.mjs [count] [baseUrl]
 */
import { chromium } from '@playwright/test';

const count = Number(process.argv[2] ?? 1200);
const base = process.argv[3] ?? 'http://127.0.0.1:5184/';

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(base);
  await page.waitForSelector('[data-testid="galaxy-canvas"]', { timeout: 30_000 });

  const seed = await page.evaluate(async (n) => {
    // Wipe and repopulate through the app's own schema so the renderer is exercised for real.
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('thought-galaxy');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tags = ['AI', '设计', '创业', '学习', '加密', '互联网', '写作', '产品'];
    const nodes = [];
    const edges = [];
    const now = Date.now();
    for (let i = 0; i < n; i += 1) {
      const angle = i * 2.399963;
      const radius = 120 + Math.sqrt(i + 1) * 42;
      nodes.push({
        id: `perf-${i}`,
        type: ['idea', 'note', 'article', 'book', 'webpage', 'project', 'goal', 'inspiration'][i % 8],
        title: `星球 ${i}`,
        body: `这是第 ${i} 颗星球的正文，用于性能测试。`,
        tags: [tags[i % tags.length], tags[(i * 3) % tags.length]],
        color: ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'][i % 6],
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 0.7 + ((i % 5) / 10),
        createdAt: now - i * 1000,
        updatedAt: now - i * 900,
        isPinned: i % 37 === 0,
        isDemo: false,
      });
      if (i > 0 && i % 2 === 0) {
        edges.push({
          id: `perf-e-${i}`,
          source: `perf-${i}`,
          target: `perf-${i - 1}`,
          relation: ['related', 'causal', 'extends', 'reference'][i % 4],
          createdAt: now,
        });
      }
    }
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['nodes', 'edges', 'thoughts', 'meta'], 'readwrite');
      tx.objectStore('nodes').clear();
      tx.objectStore('edges').clear();
      tx.objectStore('thoughts').clear();
      for (const node of nodes) tx.objectStore('nodes').put(node);
      for (const edge of edges) tx.objectStore('edges').put(edge);
      tx.objectStore('meta').put({ key: 'seeded', value: true });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return { nodes: nodes.length, edges: edges.length };
  }, count);

  await page.reload();
  await page.waitForSelector('[data-testid="galaxy-canvas"]', { timeout: 60_000 });
  // Give the renderer a moment to settle, then fit all planets.
  await page.waitForTimeout(2500);
  await page.getByTestId('fit-all').click();
  await page.waitForTimeout(1200);

  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames += 1;
          if (performance.now() - start < 3000) requestAnimationFrame(tick);
          else resolve(Math.round((frames * 1000) / (performance.now() - start)));
        };
        requestAnimationFrame(tick);
      }),
  );

  // Pan across the canvas to measure interaction responsiveness.
  const box = await page.getByTestId('galaxy-canvas').boundingBox();
  const frameTimes = [];
  for (let i = 0; i < 40; i += 1) {
    const t = Date.now();
    await page.mouse.move(box.x + 200 + i * 12, box.y + 300 + Math.sin(i / 4) * 60);
    frameTimes.push(Date.now() - t);
  }
  const avgInput = Math.round(frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length);

  console.log(
    JSON.stringify(
      { seeded: seed, idleFps: fps, avgPointerFrameMs: avgInput, nodeCountRendered: await page.locator('canvas').count() },
      null,
      2,
    ),
  );
  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});