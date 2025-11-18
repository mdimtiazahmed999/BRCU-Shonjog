const { test, expect } = require('@playwright/test');
const axios = require('axios');
const path = require('path');

const API = 'http://localhost:8000/api/v1';

test('Visual verification and screenshots', async ({ browser }) => {
  const ts = Date.now();
  const email = `verify_ui_${ts}@example.com`;
  const username = `verify_ui_${ts}`;
  const password = 'Test@12345';

  // register and login via API
  await axios.post(`${API}/user/register`, { username, email, password }, { validateStatus: () => true });
  const loginRes = await axios.post(`${API}/user/login`, { email, password }, { withCredentials: true, validateStatus: () => true });

  const setCookie = loginRes.headers && loginRes.headers['set-cookie'];
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const m = cookieStr && cookieStr.match(/^([^=]+)=([^;]+);/);
  const cookieName = m ? m[1] : null;
  const cookieValue = m ? m[2] : null;

  // create a context and page with auth
  const context = await browser.newContext();
  if (cookieName && cookieValue) {
    await context.addCookies([
      { name: cookieName, value: cookieValue, url: 'http://localhost:5173' },
      { name: cookieName, value: cookieValue, url: 'http://localhost:8000' },
    ]);
  }

  if (loginRes.data && loginRes.data.user) {
    await context.addInitScript((user) => {
      try {
        const auth = { user, suggestedUsers: [], userProfile: null, posts: [] };
        const root = { auth: JSON.stringify(auth), _persist: JSON.stringify({ version: 1, rehydrated: true }) };
        localStorage.setItem('persist:root', JSON.stringify(root));
      } catch (e) {}
    }, loginRes.data.user);
  }

  const page = await context.newPage();

  // pages to capture
  const pages = [
    { url: '/', name: 'home' },
    { url: `/profile/${loginRes.data.user._id}`, name: 'profile' },
    { url: '/chat', name: 'chat' },
    { url: '/explore', name: 'explore' },
  ];

  for (const p of pages) {
    await page.goto(p.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500); // let UI settle
    const out = `test-results/playwright-screenshots/${p.name}.png`;
    await page.screenshot({ path: out, fullPage: true });
    // ensure file exists by basic check - Playwright will throw if it cannot write
  }

  // capture story uploader modal and reel uploader modal
  await page.goto('/', { waitUntil: 'networkidle' });
  // open story uploader
  const storyBtn = await page.locator('text=Upload Story').first();
  if (await storyBtn.count()) {
    await storyBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/playwright-screenshots/story-uploader.png', fullPage: true });
    // close
    // attempt to click modal close buttons, then as a fallback remove overlays
    try {
      const close = page.locator('.fixed button:has(svg)').first();
      if ((await close.count()) > 0) await close.click({ timeout: 1000 }).catch(() => {});
    } catch (e) {}
    // remove any modal overlay that might still intercept clicks
    await page.evaluate(() => {
      document.querySelectorAll('.fixed.inset-0, .fixed').forEach((el) => el.remove());
    });
    await page.waitForTimeout(200);
  }

  // open reel uploader
  const reelBtn = await page.locator('text=Upload Reel').first();
  if (await reelBtn.count()) {
    // ensure no overlays intercept pointer events
    await page.evaluate(() => document.querySelectorAll('.fixed.inset-0, .fixed').forEach(el=>el.remove()));
    await page.waitForTimeout(200);
    await reelBtn.click({ timeout: 5000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/playwright-screenshots/reel-uploader.png', fullPage: true });
    try { const close2 = page.locator('button:has(svg >> nth=0)').first(); await close2.click(); } catch (e) {}
  }

  await context.close();
});
