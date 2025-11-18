const { test, expect } = require('@playwright/test');
const axios = require('axios');
const path = require('path');

const API = 'http://localhost:8000/api/v1';

test('Drafts: save to server, load draft, delete', async ({ page, context }) => {
  const ts = Date.now();
  const email = `drafts_${ts}@example.com`;
  const username = `drafts_${ts}`;
  const password = 'Test@12345';

  // register and login via API
  await axios.post(`${API}/user/register`, { username, email, password }, { validateStatus: () => true });
  const loginRes = await axios.post(`${API}/user/login`, { email, password }, { withCredentials: true, validateStatus: () => true });

  const setCookie = loginRes.headers && loginRes.headers['set-cookie'];
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const m = cookieStr && cookieStr.match(/^([^=]+)=([^;]+);/);
  const cookieName = m ? m[1] : null;
  const cookieValue = m ? m[2] : null;

  if (cookieName && cookieValue) {
    await context.addCookies([
      { name: cookieName, value: cookieValue, url: 'http://localhost:5173' },
      { name: cookieName, value: cookieValue, url: 'http://localhost:8000' },
    ]);
  }

  // Make axios include the auth cookie for API cleanup calls from the test process
  if (cookieName && cookieValue) {
    axios.defaults.headers.Cookie = `${cookieName}=${cookieValue}`;
  }

  // persist redux so ProtectedRoutes allow navigation
  if (loginRes.data && loginRes.data.user) {
    await context.addInitScript((user) => {
      try {
        const auth = { user, suggestedUsers: [], userProfile: null, posts: [] };
        const root = { auth: JSON.stringify(auth), _persist: JSON.stringify({ version: 1, rehydrated: true }) };
        localStorage.setItem('persist:root', JSON.stringify(root));
      } catch (e) {}
    }, loginRes.data.user);
  }

  await page.goto('/');

  // open Create Post UI
  await page.waitForSelector('text=Create Post', { timeout: 5000 });

  const caption = 'Draft test ' + Date.now();
  await page.fill('textarea', caption);

  const filePath = path.resolve(__dirname, 'fixtures', 'test-image.png');
  const fileInput = page.locator('input[type=file]').first();
  await fileInput.setInputFiles(filePath);

  // Save draft to server
  await page.click('text=Save Draft (Server)');
  // wait a bit for server roundtrip
  await page.waitForTimeout(1000);

  // Open drafts modal
  await page.click('text=Load Draft');
  await page.waitForSelector('text=Server Drafts', { timeout: 5000 });

  // There should be at least one server draft; click Load on the first server draft
  // Wait briefly for any transient toasts/notifications to disappear which can intercept clicks
  await page.waitForTimeout(300);
  await page.waitForSelector('section[aria-live] li', { state: 'detached', timeout: 3000 }).catch(() => {});

  // Try to click the second "Load" button via DOM as a fallback to avoid pointer interception issues
  const clicked = await page.evaluate(() => {
    try {
      const buttons = Array.from(document.querySelectorAll('button')).filter(b => /load/i.test(b.textContent || ''));
      if (buttons.length >= 2) {
        buttons[1].click();
        return true;
      }
      if (buttons.length === 1) {
        buttons[0].click();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  });
  if (!clicked) {
    // fallback to Playwright click (may time out if interception continues)
    const loadBtn = page.locator('button', { hasText: 'Load' }).nth(1);
    await loadBtn.click({ timeout: 10000 });
  }

  // Wait for caption to be populated
  await page.waitForTimeout(500);
  const loaded = await page.inputValue('textarea');
  expect(loaded).toContain('Draft test');

  // Close modal
  await page.click('text=Close');

  // Clean up: delete server drafts via API
  const draftsRes = await axios.get(`${API}/draft`, { withCredentials: true });
  if (draftsRes.data && draftsRes.data.drafts) {
    for (const d of draftsRes.data.drafts) {
      await axios.delete(`${API}/draft/${d._id}`, { withCredentials: true }).catch(() => {});
    }
  }
});
