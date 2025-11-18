const { test, expect } = require('@playwright/test');
const axios = require('axios');

const API = 'http://localhost:8000/api/v1';

// Helper to register/login and prepare context
async function prepareContextForUser({ email, username, password, context }) {
  await axios.post(`${API}/user/register`, { username, email, password }, { validateStatus: () => true });
  const loginRes = await axios.post(`${API}/user/login`, { email, password }, { withCredentials: true, validateStatus: () => true });
  const setCookie = loginRes.headers && loginRes.headers['set-cookie'];
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const m = cookieStr && cookieStr.match(/^([^=]+)=([^;]+);/);
  const cookieName = m ? m[1] : null;
  const cookieValue = m ? m[2] : null;
  if (cookieName && cookieValue) {
    await context.addCookies([{ name: cookieName, value: cookieValue, url: 'http://localhost:5173' }]);
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
  return loginRes.data && loginRes.data.user ? loginRes.data.user : null;
}

test('Chat socket: send and receive message between two users', async ({ browser }) => {
  const password = 'Test@12345';
  const tsA = Date.now();
  const tsB = tsA + 1;
  const emailA = `chat_a_${tsA}@example.com`;
  const usernameA = `chat_a_${tsA}`;
  const emailB = `chat_b_${tsB}@example.com`;
  const usernameB = `chat_b_${tsB}`;

  // create two browser contexts
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const userA = await prepareContextForUser({ email: emailA, username: usernameA, password, context: contextA });
  const userB = await prepareContextForUser({ email: emailB, username: usernameB, password, context: contextB });

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // open chat pages
  await Promise.all([pageA.goto('/chat', { waitUntil: 'networkidle' }), pageB.goto('/chat', { waitUntil: 'networkidle' })]);

  // select each other from suggested users (buttons show username)
  await pageA.click(`text=${usernameB}`);
  await pageB.click(`text=${usernameA}`);

  const testMessage = `Hello from A ${Date.now()}`;

  // Type and send from A
  await pageA.fill('input[placeholder="Type a message..."]', testMessage);
  await pageA.click('button:has(svg)'); // send button

  // On B, wait for the message to appear in messages list
  await expect(pageB.locator(`text=${testMessage}`)).toBeVisible({ timeout: 5000 });
});
