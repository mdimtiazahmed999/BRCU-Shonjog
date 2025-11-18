const { test, expect } = require('@playwright/test');
const axios = require('axios');
const path = require('path');

const API = 'http://localhost:8000/api/v1';

test('UI create post with image', async ({ page, context }) => {
  const ts = Date.now();
  const email = `pwui_${ts}@example.com`;
  const username = `pwui_${ts}`;
  const password = 'Test@12345';

  // register and login
  await axios.post(`${API}/user/register`, { username, email, password }, { validateStatus: () => true });
  const loginRes = await axios.post(`${API}/user/login`, { email, password }, { withCredentials: true, validateStatus: () => true });

  const setCookie = loginRes.headers && loginRes.headers['set-cookie'];
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const m = cookieStr && cookieStr.match(/^([^=]+)=([^;]+);/);
  const cookieName = m ? m[1] : null;
  const cookieValue = m ? m[2] : null;

  // set cookie in context
  if (cookieName && cookieValue) {
    await context.addCookies([{ name: cookieName, value: cookieValue, url: 'http://localhost:5173' }]);
  }

  // set redux-persist so ProtectedRoutes sees user
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

  // intercept the post add request
  const [postRes] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/v1/post/addpost') && resp.status() === 201, { timeout: 10000 }),
    (async () => {
      // set the file input directly
      const filePath = path.resolve(__dirname, 'fixtures', 'test-image.png');
      await page.setInputFiles('input[type=file]', filePath);
      // fill caption
      await page.fill('textarea', 'Playwright UI upload test');
      // click Post button
      await page.click('text=Post');
    })(),
  ]);

  const body = await postRes.json();
  expect(body).toBeTruthy();
  expect(body.success).toBe(true);
  expect(body.post).toBeTruthy();
});
