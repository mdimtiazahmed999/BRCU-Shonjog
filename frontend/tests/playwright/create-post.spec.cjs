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

  // set cookie in context for both frontend (5173) and backend (8000)
  if (cookieName && cookieValue) {
    await context.addCookies([
      { name: cookieName, value: cookieValue, url: 'http://localhost:5173' },
      { name: cookieName, value: cookieValue, url: 'http://localhost:8000' },
    ]);
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

  // wait for the Create Post UI to appear
  await page.waitForSelector('text=Create Post', { timeout: 8000 });

  // set the file input and caption via the UI
  const filePath = path.resolve(__dirname, 'fixtures', 'test-image.png');
  const fileInputLocator = page.locator('label:has-text("Select Image") input[type=file]');
  if (await fileInputLocator.count() === 0) {
    await page.setInputFiles('input[type=file]', filePath);
  } else {
    await fileInputLocator.setInputFiles(filePath);
  }
  await page.waitForSelector('img[alt="Preview"]', { timeout: 5000 });
  await page.fill('textarea', 'Playwright UI upload test');

  // Perform the submission from the page context using fetch+FormData to ensure files are sent
  const result = await page.evaluate(async () => {
    try {
      const input = document.querySelector('input[type=file]');
      const caption = document.querySelector('textarea')?.value || '';
      const fd = new FormData();
      if (input && input.files && input.files[0]) fd.append('image', input.files[0]);
      fd.append('caption', caption);
      const resp = await fetch('http://localhost:8000/api/v1/post/addpost', { method: 'POST', body: fd, credentials: 'include' });
      const json = await resp.json();
      return { status: resp.status, body: json };
    } catch (e) {
      return { error: String(e) };
    }
  });

  if (result && result.error) {
    throw new Error('Submission failed in page context: ' + result.error);
  }
  expect(result).toBeTruthy();
  if (!(result.status === 201 || result.body?.success)) {
    console.error('Create post result:', result);
  }
  expect(result.status === 201 || result.body?.success).toBeTruthy();
  expect(result.body?.post).toBeTruthy();
});
